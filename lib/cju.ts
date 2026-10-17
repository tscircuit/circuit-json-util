import type {
  AnyCircuitElement,
  AnyCircuitElementInput,
  SourceComponentBase,
  SourcePort,
} from "circuit-json"
import * as Soup from "circuit-json"
import {
  assertPrimaryIdIsAvailable,
  getNextAvailablePrimaryId,
  invalidatePrimaryIdRegistries,
  registerGeneratedPrimaryId,
  registerInsertedElementPrimaryId,
  unregisterDeletedElementPrimaryId,
} from "./primary-id-insertion"
import type { SubtreeOptions } from "./subtree"
import { buildSubtree } from "./subtree"

// Keep the existing permissive input while preserving discriminated variants.
type CircuitJsonElementInsertInput<
  CircuitElementType extends AnyCircuitElement["type"],
  CircuitElement extends { type: CircuitElementType },
> =
  | (Omit<CircuitElement, "type" | `${CircuitElementType}_id`> & {
      [PrimaryIdField in `${CircuitElementType}_id`]?: string
    })
  | (CircuitElement extends { type: CircuitElementType }
      ? Omit<CircuitElement, "type" | `${CircuitElementType}_id`> & {
          [PrimaryIdField in `${CircuitElementType}_id`]?: string
        }
      : never)

type CircuitJsonElementWithPrimaryId<
  CircuitElementType extends AnyCircuitElement["type"],
  CircuitElement extends { type: CircuitElementType },
> = CircuitElement extends { type: CircuitElementType }
  ? CircuitElement & {
      [PrimaryIdField in `${CircuitElementType}_id`]-?: string
    }
  : never

export type CircuitJsonOps<
  K extends AnyCircuitElement["type"],
  T extends AnyCircuitElement | AnyCircuitElementInput,
> = {
  get: (id: string) => Extract<T, { type: K }> | null
  select: (selector: string) => Extract<T, { type: K }> | null
  getWhere: (where: any) => Extract<T, { type: K }> | null
  getUsing: (using: {
    [key: `${string}_id`]: string
  }) => Extract<T, { type: K }> | null
  insert: (
    elm: CircuitJsonElementInsertInput<K, Extract<T, { type: K }>>,
  ) => CircuitJsonElementWithPrimaryId<K, Extract<T, { type: K }>>
  update: (
    id: string,
    newProps: Partial<Extract<T, { type: K }>>,
  ) => Extract<T, { type: K }>
  delete: (id: string) => void
  list: (where?: any) => Extract<T, { type: K }>[]
}

export type CircuitJsonUtilObjects = {
  [K in AnyCircuitElement["type"]]: CircuitJsonOps<K, AnyCircuitElement>
} & {
  insert: (elm: AnyCircuitElementInput) => AnyCircuitElement
  insertAll: (elms: AnyCircuitElementInput[]) => AnyCircuitElement[]
  subtree: (where?: any) => CircuitJsonUtilObjects
  toArray: () => AnyCircuitElement[]
  editCount: number
}
export type CircuitJsonInputUtilObjects = {
  [K in AnyCircuitElementInput["type"]]: CircuitJsonOps<
    K,
    AnyCircuitElementInput
  >
}

export type CircuitJsonUtilOptions = {
  validateInserts?: boolean
}

export type GetCircuitJsonUtilFn = ((
  soup: AnyCircuitElement[],
  options?: CircuitJsonUtilOptions,
) => CircuitJsonUtilObjects) & {
  unparsed: (soup: AnyCircuitElementInput[]) => CircuitJsonInputUtilObjects
}

interface InternalStore {
  counts: Record<string, number>
  editCount: number
}

export const cju: GetCircuitJsonUtilFn = ((
  circuitJsonInput: any[],
  options: CircuitJsonUtilOptions = {},
) => {
  const circuitJson = circuitJsonInput as AnyCircuitElement[]
  let internalStore: InternalStore = (circuitJson as any)._internal_store
  if (!internalStore) {
    internalStore = {
      counts: {},
      editCount: 0,
    } as InternalStore
    ;(circuitJson as any)._internal_store = internalStore

    // Initialize counts
    for (const elm of circuitJson) {
      const type = elm.type
      const idVal = (elm as any)[`${type}_id`]
      if (!idVal) continue
      registerGeneratedPrimaryId({
        counts: internalStore.counts,
        elementType: type,
        primaryId: idVal,
      })
    }
  }

  const insertElement = (
    componentType: string,
    elm: Record<string, unknown>,
    preservePrimaryId: boolean,
  ): AnyCircuitElement => {
    const primaryIdField = `${componentType}_id`
    const requestedPrimaryId = elm[primaryIdField]
    const primaryId =
      !preservePrimaryId ||
      requestedPrimaryId === null ||
      requestedPrimaryId === undefined ||
      requestedPrimaryId === ""
        ? getNextAvailablePrimaryId({
            circuitJson,
            counts: internalStore.counts,
            elementType: componentType,
          })
        : assertPrimaryIdIsAvailable({
            circuitJson,
            elementType: componentType,
            primaryId: requestedPrimaryId,
          })

    const newElm = {
      ...elm,
      type: componentType,
      [primaryIdField]: primaryId,
    } as AnyCircuitElement

    if (options.validateInserts) {
      const parser = (Soup as any)[componentType] ?? Soup.any_soup_element
      parser.parse(newElm)
    }

    registerGeneratedPrimaryId({
      counts: internalStore.counts,
      elementType: componentType,
      primaryId,
    })
    circuitJson.push(newElm)
    registerInsertedElementPrimaryId({ circuitJson, element: newElm })
    internalStore.editCount++
    return newElm
  }

  const su = new Proxy(
    {},
    {
      get: (proxy_target: any, prop: string) => {
        if (prop === "toArray") {
          return () => {
            ;(circuitJson as any).editCount = internalStore.editCount
            return circuitJson
          }
        }
        if (prop === "editCount") {
          return internalStore.editCount
        }

        if (prop === "subtree") {
          return (opts: SubtreeOptions) =>
            cju(buildSubtree(circuitJson, opts), options)
        }

        if (prop === "insert") {
          return (elm: AnyCircuitElementInput) => {
            const componentType = elm.type
            if (!componentType) {
              throw new Error("insert requires an element with a type")
            }
            return insertElement(componentType, elm, false)
          }
        }

        if (prop === "insertAll") {
          return (elms: AnyCircuitElementInput[]) => {
            return elms.map((elm) => su.insert(elm))
          }
        }

        const component_type = prop

        return {
          get: (id: string) =>
            circuitJson.find(
              (e: any) =>
                e.type === component_type && e[`${component_type}_id`] === id,
            ),
          getUsing: (using: any) => {
            const keys = Object.keys(using)
            if (keys.length !== 1) {
              throw new Error(
                "getUsing requires exactly one key, e.g. { pcb_component_id }",
              )
            }
            const join_key = keys[0] as string
            const join_type = join_key.replace("_id", "")
            const joiner: any = circuitJson.find(
              (e: any) =>
                e.type === join_type && e[join_key] === using[join_key],
            )
            if (!joiner) return null
            return circuitJson.find(
              (e: any) =>
                e.type === component_type &&
                e[`${component_type}_id`] === joiner[`${component_type}_id`],
            )
          },
          getWhere: (where: any) => {
            const keys = Object.keys(where)
            return circuitJson.find(
              (e: any) =>
                e.type === component_type &&
                keys.every((key) => e[key] === where[key]),
            )
          },
          list: (where?: any) => {
            const keys = !where ? [] : Object.keys(where)
            return circuitJson.filter(
              (e: any) =>
                e.type === component_type &&
                keys.every((key) => e[key] === where[key]),
            )
          },
          insert: (elm: Record<string, unknown>) =>
            insertElement(component_type, elm, true),
          delete: (id: string) => {
            const elm = circuitJson.find(
              (e) =>
                e.type === component_type &&
                (e as any)[`${component_type}_id`] === id,
            )
            if (!elm) return
            circuitJson.splice(circuitJson.indexOf(elm), 1)
            unregisterDeletedElementPrimaryId({ circuitJson, element: elm })
            internalStore.editCount++
          },
          update: (id: string, newProps: any) => {
            const elm = circuitJson.find(
              (e) =>
                e.type === component_type &&
                (e as any)[`${component_type}_id`] === id,
            )
            if (!elm) return null
            const primaryIdField = `${elm.type}_id`
            const updatesPrimaryId =
              ("type" in newProps && newProps.type !== elm.type) ||
              (primaryIdField in newProps &&
                newProps[primaryIdField] !== (elm as any)[primaryIdField])
            Object.assign(elm, newProps)
            if (updatesPrimaryId) invalidatePrimaryIdRegistries()
            internalStore.editCount++
            return elm
          },
          select: (selector: string) => {
            // TODO when applySelector is isolated we can use it, until then we
            // do a poor man's selector implementation for two common cases
            if (component_type === "source_component") {
              return circuitJson.find(
                (e) =>
                  e.type === "source_component" &&
                  e.name === selector.replace(/\./g, ""),
              )
            } else if (
              component_type === "pcb_port" ||
              component_type === "source_port" ||
              component_type === "schematic_port"
            ) {
              const [component_name, port_selector] = selector
                .replace(/\./g, "")
                .split(/[\s\>]+/)
              const source_component = circuitJson.find(
                (e) =>
                  e.type === "source_component" && e.name === component_name,
              ) as SourceComponentBase
              if (!source_component) return null
              const source_port = circuitJson.find(
                (e) =>
                  e.type === "source_port" &&
                  e.source_component_id ===
                    source_component.source_component_id &&
                  (e.name === port_selector ||
                    (e.port_hints ?? []).includes(port_selector!)),
              ) as SourcePort
              if (!source_port) return null
              if (component_type === "source_port") return source_port

              if (component_type === "pcb_port") {
                return circuitJson.find(
                  (e) =>
                    e.type === "pcb_port" &&
                    e.source_port_id === source_port.source_port_id,
                )
              } else if (component_type === "schematic_port") {
                return circuitJson.find(
                  (e) =>
                    e.type === "schematic_port" &&
                    e.source_port_id === source_port.source_port_id,
                )
              }
            }
          },
        }
      },
    },
  )

  return su
}) as any
cju.unparsed = cju as any

export const su = cju

export default cju
