# Star Label Positioning (Stellar Neighborhood)

This project uses `CSS2DRenderer` for star labels. That renderer writes its own
inline `transform: translate(...)` on the label element to position it at the
projected screen point. If you try to offset the label by adding `transform` on
`.star-label`, the renderer's inline transform will override it.

## How to offset labels (future changes)

Use a wrapper element inside the CSS2D object for visual offsets, and leave the
outer label element free for the renderer's inline transform.

### DOM structure

`src/ui/StarLabels.ts` builds a structure like this:

- `.star-label` (CSS2DObject element, positioned by CSS2DRenderer)
  - `.star-label-content` (safe for custom transforms)
    - `.star-label-text`
    - `.star-label-line`

### Key rules

- Do **not** put layout transforms on `.star-label`.
- Put offsets (e.g. `translateX`) on `.star-label-content` instead.
- Use `CSS2DObject.center` to control which edge of the label sits on the star:
  - `(1, 0.5)` anchors the star to the right edge (label sits left of the star).
  - `(0, 0.5)` anchors the star to the left edge (label sits right of the star).

### Files to edit

- `src/ui/StarLabels.ts` for DOM order and `label.center`.
- `src/styles/main.css` for offsets and spacing in `.star-label-content` and
  `.star-label-text`.

### Quick troubleshooting

- If text appears on top of the star, the label is likely anchored to the center
  with no offset or the offset is being overridden.
- If offset changes do nothing, check for transforms on `.star-label` (these are
  ignored because CSS2DRenderer writes its own transform).
