# Design System Specification: The Elevated Executive

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Curator"**

This design system is engineered to move beyond the "template" aesthetic of standard SaaS platforms. Instead of a rigid grid of boxes, we view the dashboard as a curated editorial layout. By leveraging the elegance of Arabic typography and the sophistication of tonal layering, we create a workspace that feels like a high-end physical desk—intentional, spacious, and premium. 

The system breaks traditional corporate monotony through **Intentional Asymmetry** and **Tonal Depth**. We prioritize breathing room over information density, ensuring that high-level decision-makers feel clarity rather than cognitive load.

---

## 2. Colors & Surface Philosophy

### The "No-Line" Rule
To achieve a signature premium feel, **1px solid borders are strictly prohibited** for sectioning or layout containment. Boundaries must be defined through:
1.  **Background Shifts:** Using `surface-container-low` vs. `surface`.
2.  **Tonal Transitions:** Subtle shifts in depth that guide the eye without "trapping" the content in boxes.

### Color Tokens
- **Core Brand:** `primary` (#004ac6) for action, `primary_container` (#2563eb) for emphasis.
- **Surface Hierarchy:** 
    - `surface_container_lowest` (#ffffff): Use for the main active cards/workspace.
    - `surface_container_low` (#f0f3ff): Use for secondary background sections.
    - `background` (#f9f9ff): The base canvas.
- **Signature Textures:** Use a subtle linear gradient on primary CTAs: `linear-gradient(135deg, #004ac6 0%, #2563eb 100%)`. This adds "soul" and prevents the flat-vector look common in lower-end systems.

### Glassmorphism
Floating elements (Modals, Hover Menus, Top Bar) should utilize a **Frosted Glass** effect: 
`background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px);`
This integrates the UI into a single cohesive environment rather than a series of disconnected layers.

---

## 3. Typography: The Editorial Voice

We utilize a dual-font strategy to balance authority with utility.

- **The Display & Headline Scale (Manrope):** Chosen for its geometric precision, used for high-level KPIs and section titles.
    - `display-lg` (3.5rem): Used for hero metrics.
    - `headline-md` (1.75rem): Used for page titles.
- **The Functional Scale (Inter / IBM Plex Sans Arabic):** Optimized for RTL readability and data density.
    - `title-md` (1.125rem): For card headers and navigation labels.
    - `body-md` (0.875rem): For primary data and descriptive text.
- **Hierarchy through Weight:** Use *Medium (500)* for headers and *Regular (400)* for body. Avoid *Bold (700)* except for critical "Danger" alerts to maintain a sophisticated, understated tone.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows often look "dirty" on light themes. We replace them with **The Layering Principle**.

### Stacking Tiers
- **Level 0 (Base):** `background` (#f9f9ff)
- **Level 1 (Sections):** `surface_container_low` (#f0f3ff) 
- **Level 2 (Interaction Cards):** `surface_container_lowest` (#ffffff)
*By placing a Level 2 card inside a Level 1 section, you create a natural lift without a single shadow.*

### Ambient Shadows
When a card must "float" (e.g., a modal or a primary KPI), use an **Ambient Shadow**:
- `box-shadow: 0 12px 32px -4px rgba(17, 28, 45, 0.04);`
- The shadow color is a 4% tint of `on_surface`, ensuring it looks like natural light rather than grey ink.

### The "Ghost Border"
If a container requires a boundary (e.g., in high-density data tables), use a **Ghost Border**: `outline_variant` at 15% opacity. Never use 100% opaque lines.

---

## 5. Components

### Sidebar & Navigation (RTL Optimized)
- **Structure:** Positioned on the Right. No vertical divider line.
- **Active State:** Use a soft `primary_fixed` background with a 4px vertical pill on the right edge.
- **Typography:** `label-md` for secondary items; `title-sm` for primary categories.

### KPI Cards
- **Construction:** Use `xl` (1.5rem) rounded corners.
- **Content:** Headline-sm for the value, paired with a `label-sm` muted text for the description. 
- **No Lines:** Use vertical white space (24px) to separate the icon from the text rather than a border.

### Data Tables
- **Rule:** **No Divider Lines.** 
- **Separation:** Use alternating row colors (Zebra striping) using `surface_container_low` at 50% opacity.
- **Header:** `label-md` in `on_surface_variant`, all-caps (or equivalent emphasis in Arabic), with increased letter-spacing for an editorial look.

### Buttons & Chips
- **Primary Button:** `xl` (1.5rem) or `full` roundedness. High-contrast white text on the signature gradient.
- **Chips:** `sm` (0.25rem) roundedness to contrast with the circular nature of buttons, providing a clear visual distinction between an "action" and a "status."

---

## 6. Do’s and Don’ts

### Do:
- **Embrace White Space:** Treat padding as a luxury. Use 32px or 48px between major sections.
- **RTL Fluidity:** Ensure that charts and progress bars animate from right-to-left to match the reading flow.
- **Tonal Hierarchy:** Use `surface_dim` for inactive states instead of simple "grey-out" to maintain the color story.

### Don't:
- **Don't use #000000:** Use `on_surface` (#111c2d) for all "black" text to keep the palette soft.
- **Don't use default borders:** If you feel the urge to add a border, try adding 8px of padding or a subtle background shift first.
- **Don't crowd the Sidebar:** Keep navigation items limited. Use "Surface Container" nesting for sub-menus rather than indented lists.

### Accessibility Note:
While we use soft tones, always ensure the contrast ratio between `on_surface_variant` (#434655) and `surface` (#f9f9ff) remains above 4.5:1 for readability. High-end design is only successful if it remains inclusive.