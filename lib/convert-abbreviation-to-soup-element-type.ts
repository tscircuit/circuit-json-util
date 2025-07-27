export const convertAbbrToType = (abbr: string): string => {
  switch (abbr) {
    case "port":
      return "source_port"
    case "net":
      return "source_net"
    case "power":
      return "simple_power_source"
    case "silkscreenpath":
      return "pcb_silkscreen_path"
  }
  return abbr
}
