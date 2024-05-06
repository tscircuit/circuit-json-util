import type {
  AnySoupElement,
  AnySoupElementInput,
  SourceComponentBase,
  SourcePort,
} from "@tscircuit/soup"

type SoupOps<
  K extends AnySoupElement["type"],
  T extends AnySoupElement | AnySoupElementInput
> = {
  get: (id: string) => Extract<T, { type: K }> | null
  select: (selector: string) => Extract<T, { type: K }> | null
  getWhere: (where: any) => Extract<T, { type: K }> | null
  getUsing: (using: {
    [key: `${string}_id`]: string
  }) => Extract<T, { type: K }> | null
  list: (where?: any) => Extract<T, { type: K }>[]
}

export type SoupUtilObject = {
  [K in AnySoupElement["type"]]: SoupOps<K, AnySoupElement>
}
export type SoupInputUtilObject = {
  [K in AnySoupElementInput["type"]]: SoupOps<K, AnySoupElementInput>
}

export type GetSoupUtilObject = ((soup: AnySoupElement[]) => SoupUtilObject) & {
  unparsed: (soup: AnySoupElementInput[]) => SoupInputUtilObject
}

export const su: GetSoupUtilObject = ((soup: AnySoupElement[]) => {
  const su = new Proxy(
    {},
    {
      get: (proxy_target: any, component_type: string) => {
        return {
          get: (id: string) =>
            soup.find(
              (e: any) =>
                e.type === component_type && e[`${component_type}_id`] === id
            ),
          getUsing: (using: any) => {
            const keys = Object.keys(using)
            if (keys.length !== 1) {
              throw new Error(
                "getUsing requires exactly one key, e.g. { pcb_component_id }"
              )
            }
            const join_key = keys[0] as string
            const join_type = join_key.replace("_id", "")
            const joiner: any = soup.find(
              (e: any) =>
                e.type === join_type && e[join_key] === using[join_key]
            )
            if (!joiner) return null
            return soup.find(
              (e: any) =>
                e.type === component_type &&
                e[`${component_type}_id`] === joiner[`${component_type}_id`]
            )
          },
          getWhere: (where: any) => {
            const keys = Object.keys(where)
            return soup.find(
              (e: any) =>
                e.type === component_type &&
                keys.every((key) => e[key] === where[key])
            )
          },
          list: (where?: any) => {
            const keys = !where ? [] : Object.keys(where)
            return soup.filter(
              (e: any) =>
                e.type === component_type &&
                keys.every((key) => e[key] === where[key])
            )
          },
          select: (selector: string) => {
            // TODO when applySelector is isolated we can use it, until then we
            // do a poor man's selector implementation for two common cases
            if (component_type === "source_component") {
              return soup.find(
                (e) =>
                  e.type === "source_component" &&
                  e.name === selector.replace(/\./g, "")
              )
            } else if (
              component_type === "pcb_port" ||
              component_type === "source_port" ||
              component_type === "schematic_port"
            ) {
              const [component_name, port_selector] = selector.split(/[ \>]/)
              const source_component = soup.find(
                (e) =>
                  e.type === "source_component" && e.name === component_name
              ) as SourceComponentBase
              if (!source_component) return null
              const source_port = soup.find(
                (e) =>
                  e.type === "source_port" &&
                  e.source_component_id ===
                    source_component.source_component_id &&
                  (e.name === port_selector ||
                    (e.port_hints ?? []).includes(port_selector!))
              ) as SourcePort
              if (!source_port) return null
              if (component_type === "source_port") return source_port

              if (component_type === "pcb_port") {
                return soup.find(
                  (e) =>
                    e.type === "pcb_port" &&
                    e.source_port_id === source_port.source_port_id
                )
              } else if (component_type === "schematic_port") {
                return soup.find(
                  (e) =>
                    e.type === "schematic_port" &&
                    e.source_port_id === source_port.source_port_id
                )
              }
            }
          },
        }
      },
    }
  )

  return su
}) as any
su.unparsed = su as any

export default su
