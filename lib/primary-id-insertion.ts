import type { AnyCircuitElement } from "circuit-json"

type GeneratedIdCounts = Record<string, number>

type PrimaryIdReservation = {
  representativeElement: AnyCircuitElement
  count: number
}

type PrimaryIdRegistry = {
  reservationsByElementType: Map<string, Map<string, PrimaryIdReservation>>
  maxGeneratedIdIndexByType: Map<string, number>
  circuitJsonLength: number
  mutationEpoch: number
}

const primaryIdRegistryByCircuitJson = new WeakMap<
  AnyCircuitElement[],
  PrimaryIdRegistry
>()
let primaryIdMutationEpoch = 0

// Supported mutations keep this registry synchronized in O(1). Rebuild when
// array length drifts so direct push/splice calls remain safe too. Same-length
// out-of-band replacement is outside cjuIndexed's mutation semantics already.

const getPrimaryIdField = (elementType: string) => `${elementType}_id`

const getElementPrimaryId = (element: AnyCircuitElement): unknown =>
  (element as unknown as Record<string, unknown>)[
    getPrimaryIdField(element.type)
  ]

const rebuildPrimaryIdRegistry = (
  circuitJson: AnyCircuitElement[],
): PrimaryIdRegistry => {
  const previousRegistry = primaryIdRegistryByCircuitJson.get(circuitJson)
  const registry: PrimaryIdRegistry = {
    reservationsByElementType: new Map(),
    // Generated sequences stay monotonic after supported deletes/updates.
    maxGeneratedIdIndexByType: new Map(
      previousRegistry?.maxGeneratedIdIndexByType,
    ),
    circuitJsonLength: circuitJson.length,
    mutationEpoch: primaryIdMutationEpoch,
  }

  for (const element of circuitJson) {
    const primaryId = getElementPrimaryId(element)
    if (typeof primaryId !== "string") continue

    let typeReservations = registry.reservationsByElementType.get(element.type)
    if (!typeReservations) {
      typeReservations = new Map()
      registry.reservationsByElementType.set(element.type, typeReservations)
    }
    const existingReservation = typeReservations.get(primaryId)
    if (existingReservation) {
      existingReservation.count++
    } else {
      typeReservations.set(primaryId, {
        representativeElement: element,
        count: 1,
      })
    }

    const generatedIdIndex = getGeneratedIdIndex(element.type, primaryId)
    if (generatedIdIndex !== null) {
      registry.maxGeneratedIdIndexByType.set(
        element.type,
        Math.max(
          registry.maxGeneratedIdIndexByType.get(element.type) ?? -1,
          generatedIdIndex,
        ),
      )
    }
  }

  primaryIdRegistryByCircuitJson.set(circuitJson, registry)
  return registry
}

const getPrimaryIdRegistry = (
  circuitJson: AnyCircuitElement[],
): PrimaryIdRegistry => {
  const existingRegistry = primaryIdRegistryByCircuitJson.get(circuitJson)
  if (
    !existingRegistry ||
    existingRegistry.circuitJsonLength !== circuitJson.length ||
    existingRegistry.mutationEpoch !== primaryIdMutationEpoch
  ) {
    return rebuildPrimaryIdRegistry(circuitJson)
  }
  return existingRegistry
}

export const registerInsertedElementPrimaryId = ({
  circuitJson,
  element,
}: {
  circuitJson: AnyCircuitElement[]
  element: AnyCircuitElement
}) => {
  const existingRegistry = primaryIdRegistryByCircuitJson.get(circuitJson)
  if (
    !existingRegistry ||
    existingRegistry.circuitJsonLength !== circuitJson.length - 1 ||
    existingRegistry.mutationEpoch !== primaryIdMutationEpoch
  ) {
    rebuildPrimaryIdRegistry(circuitJson)
    return
  }

  const primaryId = getElementPrimaryId(element)
  if (typeof primaryId === "string") {
    let typeReservations = existingRegistry.reservationsByElementType.get(
      element.type,
    )
    if (!typeReservations) {
      typeReservations = new Map()
      existingRegistry.reservationsByElementType.set(
        element.type,
        typeReservations,
      )
    }
    const existingReservation = typeReservations.get(primaryId)
    if (existingReservation) {
      existingReservation.count++
    } else {
      typeReservations.set(primaryId, {
        representativeElement: element,
        count: 1,
      })
    }

    const generatedIdIndex = getGeneratedIdIndex(element.type, primaryId)
    if (generatedIdIndex !== null) {
      existingRegistry.maxGeneratedIdIndexByType.set(
        element.type,
        Math.max(
          existingRegistry.maxGeneratedIdIndexByType.get(element.type) ?? -1,
          generatedIdIndex,
        ),
      )
    }
  }
  existingRegistry.circuitJsonLength = circuitJson.length
}

export const unregisterDeletedElementPrimaryId = ({
  circuitJson,
  element,
}: {
  circuitJson: AnyCircuitElement[]
  element: AnyCircuitElement
}) => {
  const existingRegistry = primaryIdRegistryByCircuitJson.get(circuitJson)
  if (
    !existingRegistry ||
    existingRegistry.circuitJsonLength !== circuitJson.length + 1 ||
    existingRegistry.mutationEpoch !== primaryIdMutationEpoch
  ) {
    rebuildPrimaryIdRegistry(circuitJson)
    return
  }

  const primaryId = getElementPrimaryId(element)
  if (typeof primaryId === "string") {
    const typeReservations = existingRegistry.reservationsByElementType.get(
      element.type,
    )
    const reservation = typeReservations?.get(primaryId)
    if (reservation) {
      reservation.count--
      if (reservation.count === 0) {
        typeReservations?.delete(primaryId)
      } else if (reservation.representativeElement === element) {
        const replacementRepresentative = circuitJson.find(
          (candidate) =>
            candidate.type === element.type &&
            getElementPrimaryId(candidate) === primaryId,
        )
        if (replacementRepresentative) {
          reservation.representativeElement = replacementRepresentative
        }
      }
    }
  }
  existingRegistry.circuitJsonLength = circuitJson.length
}

// Subtrees have their own arrays but share element objects with their parent.
// A rare primary-ID update therefore invalidates every per-array registry.
export const invalidatePrimaryIdRegistries = () => {
  primaryIdMutationEpoch++
}

const getGeneratedIdIndex = (
  elementType: string,
  primaryId: string,
): number | null => {
  const prefix = `${elementType}_`
  if (!primaryId.startsWith(prefix)) return null

  const suffix = primaryId.slice(prefix.length)
  if (!/^(0|[1-9]\d*)$/.test(suffix)) return null

  const index = Number(suffix)
  return Number.isSafeInteger(index) ? index : null
}

export const registerGeneratedPrimaryId = ({
  counts,
  elementType,
  primaryId,
}: {
  counts: GeneratedIdCounts
  elementType: string
  primaryId: string
}) => {
  const generatedIdIndex = getGeneratedIdIndex(elementType, primaryId)
  if (generatedIdIndex === null) return

  counts[elementType] = Math.max(counts[elementType] ?? -1, generatedIdIndex)
}

export const getNextAvailablePrimaryId = ({
  circuitJson,
  counts,
  elementType,
}: {
  circuitJson: AnyCircuitElement[]
  counts: GeneratedIdCounts
  elementType: string
}): string => {
  const primaryIdField = getPrimaryIdField(elementType)
  const primaryIdRegistry = getPrimaryIdRegistry(circuitJson)
  let nextIndex = Math.max(
    counts[elementType] ?? -1,
    primaryIdRegistry.maxGeneratedIdIndexByType.get(elementType) ?? -1,
  )
  let primaryId: string

  do {
    nextIndex++
    if (!Number.isSafeInteger(nextIndex)) {
      throw new Error(`Unable to generate another ${primaryIdField}`)
    }
    primaryId = `${elementType}_${nextIndex}`
  } while (
    primaryIdRegistry.reservationsByElementType.get(elementType)?.has(primaryId)
  )

  return primaryId
}

export const assertPrimaryIdIsAvailable = ({
  circuitJson,
  elementType,
  primaryId,
}: {
  circuitJson: AnyCircuitElement[]
  elementType: string
  primaryId: unknown
}): string => {
  const primaryIdField = getPrimaryIdField(elementType)
  if (typeof primaryId !== "string" || primaryId.length === 0) {
    throw new Error(
      `insert requires ${primaryIdField} to be a non-empty string when provided`,
    )
  }

  const existingElement = getPrimaryIdRegistry(circuitJson)
    .reservationsByElementType.get(elementType)
    ?.get(primaryId)?.representativeElement
  if (existingElement) {
    throw new Error(
      `Cannot insert ${elementType}: primary ID "${primaryId}" is already used by ${existingElement.type} (${getPrimaryIdField(existingElement.type)})`,
    )
  }

  return primaryId
}
