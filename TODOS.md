# TODOS

## Post-MVP

### 1. Sankey View Toggle
Add Approach A's Sankey diagram as a second visualization mode alongside the force graph.
Toggle via tab/dropdown. Uses `d3-sankey` module consuming the same parsed PO data.
The shared encoding layer makes this clean.
**Priority:** P2
**Depends on:** MVP shipped. **Effort:** ~1 week human / ~30 min CC.

### 2. XLSX Support
Add .xlsx file upload support via SheetJS (`xlsx` package, ~90KB).
Same validation logic applies after sheet-to-rows conversion.
**Priority:** P2
**Depends on:** MVP CSV upload working. **Effort:** ~1 day human / ~10 min CC.

### 3. Keyboard Accessibility
Add Tab navigation between nodes, Enter to open detail panel, Escape to close.
SVG path: `tabindex="0"` on each node, arrow keys traverse by stage column.
Canvas path: virtual focus indicator overlay.
**Priority:** P1
**Depends on:** Base rendering working. **Effort:** ~2 days human / ~15 min CC.

## Completed
