# Full controller board reproduction

`controller.circuit.json` is the unchanged, routed 48 × 50 mm ESP-12F controller
from the two-board WiFi switch prototype: 925 elements, 49 traces, 43 vias and
three solved BREP copper pours. Only JSON whitespace is formatted for this
repository; every element and field matches the original export. Original
export SHA-256:

`7ff354b8d1566b4d26e84c066d7ce605e3e5d06979eb10d3591b0fff0ba57a4f`

The regression clones this entire board and calls
`transformPCBElements(board, translate(10, 0))`. Pads and traces move, but the
released implementation leaves all three pours behind. One stationary bottom
pour then touches both the actual 3.3 V and GND traces. The snapshot shows the
actual full-board copper, and the numeric tests check the vertex translation
and an independently verified point inside the erroneous supply contact.

The original TSX and its router adapter are included unchanged as text source
references. The board used `tscircuit@0.0.3047`, `@tscircuit/core@0.0.2246`,
`@tscircuit/capacity-autorouter@0.0.1027` and
`@tscircuit/fanout-solver@0.0.81`. This repository's older pinned renderer
does not support its Pipeline9 props. Rerouting would also change the exact
geometry under test, so the full-board regression deliberately uses the frozen
Circuit JSON. A separate small TSX test reproduces the same API omission using
the repository's existing renderer and dependencies.

The expected-failure tests document the released defect without changing
production code. The stacked fix enables them as ordinary regression tests.
This fixture and its snapshots are diagnostic, not fabrication outputs.
