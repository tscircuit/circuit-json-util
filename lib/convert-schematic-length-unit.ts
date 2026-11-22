import {
  LEGACY_SCHEMATIC_LENGTH_UNIT,
  MM_PER_SCHEMATIC_UNIT,
  type AnyCircuitElement,
  type SchematicLengthUnit,
} from "circuit-json"

const millimetersPerUnit: Record<SchematicLengthUnit, number> = {
  mm: 1,
  in: 25.4,
  [LEGACY_SCHEMATIC_LENGTH_UNIT]: MM_PER_SCHEMATIC_UNIT,
}

export function getSchematicLengthUnitScale(
  from: SchematicLengthUnit,
  to: SchematicLengthUnit,
) {
  return millimetersPerUnit[from] / millimetersPerUnit[to]
}

/** Convert the schematic geometry of one record, including detached legacy records. */
export function convertSchematicLengthUnit(
  element: AnyCircuitElement,
  unit: SchematicLengthUnit,
): AnyCircuitElement {
  const from =
    "schematic_length_unit" in element
      ? element.schematic_length_unit
      : undefined
  if (unit === from) return element
  const factor = getSchematicLengthUnitScale(
    from ?? LEGACY_SCHEMATIC_LENGTH_UNIT,
    unit,
  )
  const point = <T extends { x: number; y: number }>(p: T) => ({
    ...p,
    x: p.x * factor,
    y: p.y * factor,
  })
  const lengths = <T extends object>(obj: T, ...keys: (keyof T)[]): T => {
    const result = { ...obj }
    for (const key of keys) {
      const value = obj[key]
      if (typeof value === "number")
        Object.assign(result, { [key]: value * factor })
    }
    return result
  }
  const tag = { schematic_length_unit: unit }
  switch (element.type) {
    case "schematic_sheet":
      return {
        ...element,
        ...tag,
        ...(element.center && { center: point(element.center) }),
      }
    case "schematic_net_label":
      return {
        ...element,
        ...tag,
        center: point(element.center),
        ...(element.anchor_position && {
          anchor_position: point(element.anchor_position),
        }),
      }
    case "schematic_port":
      return {
        ...lengths(
          element,
          "display_pin_label_font_size",
          "distance_from_component_edge",
        ),
        ...tag,
        center: point(element.center),
        ...(element.boundary_position && {
          boundary_position: point(element.boundary_position),
        }),
      }
    case "schematic_component":
      return {
        ...lengths(element, "pin_spacing", "box_width"),
        ...tag,
        center: point(element.center),
        size: lengths(element.size, "width", "height"),
        ...(element.pin_styles && {
          pin_styles: Object.fromEntries(
            Object.entries(element.pin_styles).map(([pin, style]) => [
              pin,
              lengths(
                style,
                "left_margin",
                "right_margin",
                "top_margin",
                "bottom_margin",
              ),
            ]),
          ),
        }),
      }
    case "schematic_text":
      return {
        ...lengths(element, "font_size"),
        ...tag,
        position: point(element.position),
      }
    case "schematic_voltage_probe":
      return { ...element, ...tag, position: point(element.position) }
    case "schematic_debug_object":
      if (element.shape === "line")
        return {
          ...element,
          ...tag,
          start: point(element.start),
          end: point(element.end),
        }
      if (element.shape === "rect")
        return {
          ...element,
          ...tag,
          center: point(element.center),
          size: lengths(element.size, "height", "width"),
        }
      return { ...element, ...tag, center: point(element.center) }
    case "schematic_trace":
      return {
        ...element,
        ...tag,
        edges: element.edges.map((edge) => ({
          ...edge,
          from: point(edge.from),
          to: point(edge.to),
        })),
        junctions: element.junctions.map(point),
      }
    case "schematic_table":
      return {
        ...lengths(element, "cell_padding", "border_width"),
        ...tag,
        anchor_position: point(element.anchor_position),
        column_widths: element.column_widths.map((width) => width * factor),
        row_heights: element.row_heights.map((height) => height * factor),
      }
    case "schematic_table_cell":
      return {
        ...lengths(element, "width", "height", "font_size"),
        ...tag,
        center: point(element.center),
      }
    case "schematic_rect":
      return {
        ...lengths(element, "width", "height", "stroke_width"),
        ...tag,
        center: point(element.center),
      }
    case "schematic_group":
      return {
        ...lengths(element, "width", "height"),
        ...tag,
        center: point(element.center),
      }
    case "schematic_arc":
    case "schematic_circle":
      return {
        ...lengths(element, "radius", "stroke_width"),
        ...tag,
        center: point(element.center),
      }
    case "schematic_box":
      return { ...lengths(element, "x", "y", "width", "height"), ...tag }
    case "schematic_graphic":
      return { ...lengths(element, "width", "height"), ...tag }
    case "schematic_line":
      return {
        ...lengths(
          element,
          "x1",
          "x2",
          "y1",
          "y2",
          "stroke_width",
          "dash_length",
          "dash_gap",
        ),
        ...tag,
      }
    case "schematic_path":
      return {
        ...lengths(element, "stroke_width", "dash_length", "dash_gap"),
        ...tag,
        points: element.points.map(point),
      }
    case "source_failed_to_create_component_error":
      return {
        ...element,
        ...tag,
        ...(element.schematic_center && {
          schematic_center: lengths(element.schematic_center, "x", "y"),
        }),
      }
    default:
      return element
  }
}

/** Read geometry in one coordinate system before layout, bounds, or rendering. */
export function convertSchematicLengthUnits(
  circuit: AnyCircuitElement[],
  unit: SchematicLengthUnit,
): AnyCircuitElement[] {
  // Untagged geometry is already in legacy units, including in a document
  // with millimeter or inch subcircuit writing defaults.
  if (unit === LEGACY_SCHEMATIC_LENGTH_UNIT) {
    const needsConversion = (element: AnyCircuitElement) =>
      "schematic_length_unit" in element &&
      element.schematic_length_unit !== undefined &&
      element.schematic_length_unit !== unit
    if (!circuit.some(needsConversion)) return circuit
    return circuit.map((element) =>
      needsConversion(element)
        ? convertSchematicLengthUnit(element, unit)
        : element,
    )
  }
  return circuit.map((element) => convertSchematicLengthUnit(element, unit))
}
