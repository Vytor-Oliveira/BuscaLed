---
name: BuscaLED
description: Convenção de produto brasileiro mobile-first executada em fidelidade total — azul profundo de marca, âmbar de farol racionado, tema claro e escuro ambos escolhidos.
colors:
  brand-50: "#eef5fb"
  brand-100: "#d7e7f5"
  brand-200: "#b0cee9"
  brand-300: "#7fadd8"
  brand-400: "#4d88c2"
  brand-500: "#2e6ba8"
  brand-600: "#1f5288"
  brand-700: "#1a4169"
  brand-800: "#163351"
  brand-900: "#12283e"
  accent-300: "#ffc85c"
  accent-400: "#ffb224"
  accent-500: "#f59300"
  accent-600: "#cf7a00"
  accent-ink: "#2a1a02"
  canvas: "#f6f8fa"
  surface: "#ffffff"
  surface-raised: "#ffffff"
  surface-sunken: "#eef1f5"
  border: "#e3e8ee"
  border-strong: "#cbd3dc"
  text: "#101828"
  text-muted: "#5a6672"
  text-subtle: "#8a95a1"
  text-on-brand: "#ffffff"
  success: "#0e7a44"
  success-bg: "#e6f4ec"
  warning: "#9a6200"
  warning-bg: "#fdf3e0"
  danger: "#b4231c"
  danger-bg: "#fceae9"
  sidebar-ink: "#eaf1f8"
  sidebar-ink-muted: "#adc4d8"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.1rem, 5.4vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "clamp(1.5rem, 3.4vw, 2.1rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "clamp(1rem, 2.2vw, 1.15rem)"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "0em"
  body:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.375
    letterSpacing: "0em"
  label:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.05em"
  numero:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "13.5px"
    fontWeight: 700
    lineHeight: 1.3
    fontFeature: "tabular-nums"
  placa:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.16em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "10": "40px"
  "16": "64px"
components:
  button-primario:
    backgroundColor: "{colors.brand-600}"
    textColor: "{colors.text-on-brand}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
    typography: "{typography.body}"
  button-primario-hover:
    backgroundColor: "{colors.brand-700}"
  button-acento:
    backgroundColor: "{colors.accent-500}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.sm}"
    padding: "0 24px"
    height: "52px"
    typography: "{typography.body}"
  button-acento-hover:
    backgroundColor: "{colors.accent-600}"
  button-secundario:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-fantasma:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-perigo:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "44px"
  input-erro:
    textColor: "{colors.danger}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "16px"
  card-busca:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge-neutral:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
    typography: "{typography.label}"
  badge-acento:
    textColor: "{colors.accent-600}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  sidebar:
    backgroundColor: "{colors.brand-800}"
    textColor: "{colors.sidebar-ink-muted}"
    width: "256px"
  sidebar-item-ativo:
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  tab-ativa:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.xs}"
    padding: "8px 12px"
---

# Design System: BuscaLED

## Overview

**Creative North Star: "The Category Standard, Executed Straight"**

BuscaLED sits beside Nubank, iFood and Mercado Pago and executes the Brazilian mobile-first product convention at full fidelity. This is a chosen commitment, not a default: the user was shown an authored direction round, asked for a bolder re-roll, and then took the standing exit in words. Convention is therefore the brief. The discipline of this system is refusing to smuggle authorship back in through the side door — no irony, no quirk, no signature gesture hidden inside a conventional shell. A future contributor must not read this file as an invitation to make it stranger. Here, "weird" is not an improvement; it is non-compliance.

What the system does refuse is convention executed badly: the generic hero with an invented number, the card with no empty state, the table that breaks on a phone, the error as loose text. Every surface carries its empty state, its loading skeleton, its error in a bordered field envelope, and its number in tabular figures. Density is the panel's business and generosity is the site's: the public surfaces breathe at 64–80px section rhythm with a 76rem container, and the panel trades that for scanability.

Material is thin and layered rather than heavy. Surfaces stack by tone (canvas → surface → raised, with sunken as the recessed well), separated by a single hairline, and shadows appear in four short offset steps that read as lift rather than atmosphere. Colour is disciplined to the point of austerity: a deep navy brand ramp carries structure, one amber carries the primary search action and the focus ring, and green/amber/red are locked to state. Both themes are designed, neither is an inversion of the other.

**Key Characteristics:**
- Deep navy brand ramp (evolved from the project's incumbent `#1f4e79`) carrying header, sidebar and action
- Amber rationed to the primary search action, the focus ring and the brand mark
- Semantic CSS custom properties as the single source; Tailwind utilities never carry raw colour
- Light default by use scene — a driver outdoors, on a phone, in daylight
- Dark as a designed slate-blue world, not an inversion
- 4px spacing scale, generous radii (4–22px), short offset shadows
- Money as integer cents formatted in one place, with absence designed ("sem preço") and internal cost walled off from every client surface
- Kit size as catalogue data (`unitsPerKit`), never inferred from the lighting position
- pt-BR interface, including the established domain vocabulary (encaixe, posição de farol, vitrine, garagem, pedido, demanda)
- Tabular numerals wherever a number can change
- One authored motion moment: content settles on entry

## Colors

A deep navy structure, one luminous amber accent, a cool near-white field, and a status triad that is never allowed to become decoration.

### Primary
- **Navy Profundo** (`brand-600`): the structural brand voice. Header mark plate, primary buttons, link text, selected card borders, chart series, ranking bars, caret colour, count badges. In dark it is lightened to the 400 step so it still separates from a slate surface; `brand-700` lightens with it.
- **Navy Painel** (`brand-800`): the panel sidebar ground, in *both* themes. It is never theme-swapped.
- **Navy Névoa** (`brand-50` / `brand-100` / `brand-200` / `brand-300`): the tint family. Hero gradient top, icon plates behind position glyphs, `info` badge fill and border, and the lighter segment of a ranking bar when one number nests inside another. `brand-50`/`brand-100` are redefined in dark as dim navy surfaces rather than tints.

### Secondary
- **Âmbar de Farol** (`accent-500`): the headlight. It is the primary search action, the focus ring (`--ring`), the brand lamp glyph, the pending-count badge in the sidebar, and nothing else. In dark it steps up to `accent-400`'s value so it does not vibrate against slate.
- **Âmbar Claro** (`accent-300`): text selection background, and the lamp glyph inside the brand plate.
- **Marrom de Tinta** (`accent-ink`): the only foreground allowed on amber. White on amber does not pass contrast.

### Neutral
- **Campo Frio** (`canvas`): the page ground behind every surface; also the ring colour around the scrollbar thumb, so the thumb reads as inset.
- **Superfície** (`surface`) and **Superfície Elevada** (`surface-raised`): card, header, dialog and popover grounds. Identical in light and separated in dark, where `raised` is the popover/toast/tooltip ground.
- **Poço** (`surface-sunken`): the recessed well — tab strips, chip fills, quantity steppers, empty-chart plates, dialog footers, neutral badges.
- **Linha** (`border`) and **Linha Forte** (`border-strong`): the hairline and the control stroke. `border-strong` is what an input, a select and a chip outline themselves with; `border` is what divides sections and rows.
- **Tinta** (`text`), **Tinta Suave** (`text-muted`), **Tinta Discreta** (`text-subtle`): the three-step text hierarchy. `muted` carries all secondary prose; `subtle` carries micro-labels, mono detail lines and placeholders.
- **Tinta da Barra** (`sidebar-ink`) and **Tinta da Barra Suave** (`sidebar-ink-muted`): theme-constant foregrounds for the dark panel sidebar.

### Tertiary
- **Verde Confirmado** (`success` / `success-bg`): privacy seal icon, concluded ticket, in-stock state.
- **Âmbar de Aviso** (`warning` / `warning-bg`): plate-lookup fallback notice, ticket in service, low stock.
- **Vermelho de Falha** (`danger` / `danger-bg`): field error text and border, destructive button, cancelled or out-of-stock state.

### Named Rules

**The Rationed Amber Rule.** Amber appears only as the primary search action, the focus ring, the brand lamp and the sidebar pending count. If a second amber element lands on the same screen, one of them is wrong. Its scarcity is what makes the search button unmistakable.

**The Status-Is-Not-A-Series Rule.** Green, amber and red are reserved for state. They never colour a data series, a bar, a chart area or a category. A ranking or chart that needs two hues has a labelling problem, not a palette problem.

**The Constant Sidebar Ink Rule.** The panel sidebar is dark in both themes, so its foreground comes from `sidebar-ink` / `sidebar-ink-muted`, which do not change with the theme. Deriving sidebar text from the brand ramp is the bug that made the panel navigation invisible in dark; these two tokens exist specifically to stop it recurring.

**The Dark-Is-Chosen Rule.** Dark is a designed world: slate-blue surfaces (`#0d1520` → `#1b2735`), brand lightened for contrast, accent stepped up, shadows re-authored as deeper blacks. Never produce a dark value by inverting or filtering a light one.

**The Semantic-Only Rule.** No utility carries a raw colour. Every colour reaches the DOM through a semantic custom property mapped in `@theme inline`; the theme swaps the variable, never the class. A hex literal in a component is a defect, with two sanctioned exceptions in the build: the near-black ink used on brand fills in dark, and the dialog scrim.

## Typography

**Display Font:** Inter (falling back to `ui-sans-serif`, `system-ui`, `-apple-system`, "Segoe UI", Roboto)
**Body Font:** Inter — the same face, the whole way down
**Label/Mono Font:** the platform monospace stack, for SKU, socket code and the licence-plate field

**Character:** One modern grotesque at every level, with `cv11` and `ss01` enabled so the single-storey digits and alternates read cleanly at label sizes. Personality comes from weight and negative tracking at display sizes (800 weight, -0.035em) rather than from a second face. It is the voice of a Brazilian consumer app: plain, confident, unliterary.

### Hierarchy
- **Display** (800, `clamp(2.1rem, 5.4vw, 3.4rem)`, 1.05, -0.035em): the one headline of a public page. Two lines maximum.
- **Headline** (700, `clamp(1.5rem, 3.4vw, 2.1rem)`, -0.025em): section headings on the site. Capped around 30ch.
- **Title** (700, 15–16px, -0.01em): card, dialog, ranking and position headings. The panel's working title size is 15px.
- **Lead** (400, `clamp(1rem, 2.2vw, 1.15rem)`, relaxed): the single supporting line under a headline, capped at 42ch.
- **Body** (400, 13–14.5px, snug to relaxed): all explanatory prose, capped 34–52ch depending on column. 13.5px is the workhorse.
- **Label** (600, 12px, 0.05em, uppercase): data labels, definition terms, table headers, the chart tooltip's date. Never a sentence.
- **Número** (700, 13.5–15px, tabular): any figure that can change — metrics, quantities, counters, table cells.
- **Placa** (mono, 700, 22px, 0.16em, uppercase): the licence-plate input only. The spacing imitates the physical plate and makes a 7-character typo visible.

### Named Rules

**The Pinned Face Rule.** Inter is pinned by decision, not by inertia. The bundled detector flags it as an overused face and the finish reviewer examined and upheld the rejection: swapping it for something more distinctive is exactly the smuggled authorship the chosen direction forbids. Do not "fix" the typeface.

**The Tabular Number Rule.** `th`, `td`, `output`, `time` and anything marked `data-numeros` render in tabular figures. A number column must not dance when its value changes.

**The Label-Not-Kicker Rule.** The uppercase 12px label exists for data: definition terms, table headers, group tags inside a card, a tooltip's date. It is never a kicker or eyebrow above a headline. A headline needs no label announcing it.

## Layout

A centred single-column container (`container-app`: 76rem max, 1.25rem inline padding) carries every public page; the panel replaces it with a fixed sidebar (256px, collapsible to 4.5rem) plus a fluid content column. Spacing runs on a 4px scale, with 12/16/20/24px as the dominant internal steps and 64px (80px at `lg`) as the section rhythm on the site.

The site header is sticky, 64px tall, translucent (`surface` at 92% with a backdrop blur) over a single hairline. Mobile is the default read: layouts start as one column, pick up a second at `sm` (640px), and only reflow structurally at `lg` (1024px) — `lg` is where the hero becomes two columns (1.05fr / 1fr), where the desktop sidebar replaces the mobile drawer, and where the site's section nav appears. `md` and `xl` are used sparingly; the system is effectively a three-stop responsive model.

The first fold of the landing page is headline, one supporting line, and the working search card — not an anchor pointing down to it. The search card is the right-hand column at `lg` and sits immediately under the copy on a phone. The privacy seal sits directly under the plate field, inside the card.

Controls share a 44px (`h-11`) height so a field and a button align on one row without a nudge; the hero search field and its amber button both rise to 56px.

### Named Rules

**The Search-In-The-First-Fold Rule.** The vehicle search is operable in the first viewport on every size. If the fold holds only illustration and promise, the page has failed.

**The Four-Pixel Rule.** Every gap, pad and offset is a multiple of 4px. Half-steps exist only where the 4px grid and optical alignment genuinely disagree (the 3.5 / 2.5 / 1.5 steps in field padding and gaps).

## Elevation & Depth

Hybrid, weighted toward tonal layering. Depth comes first from tone (canvas → surface → raised, with sunken as the recessed well) and a single hairline border; shadow is added on top only where an element genuinely floats above the page. The vocabulary is four short, offset, softly blurred steps, re-authored in dark as deeper blacks rather than reused from light.

### Shadow Vocabulary
- **sm** (`0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.07)`): resting lift on buttons, the brand plate, the active tab, compact cards.
- **md** (`0 4px 8px -2px rgba(16,24,40,.08), 0 2px 4px -2px rgba(16,24,40,.06)`): hover and small raised panels.
- **lg** (`0 12px 24px -6px rgba(16,24,40,.12), 0 4px 10px -4px rgba(16,24,40,.08)`): things that leave the document flow — popovers, the combobox list, toasts, tooltips, the chart tooltip.
- **xl** (`0 24px 48px -12px rgba(16,24,40,.18), 0 8px 16px -8px rgba(16,24,40,.1)`): the modal dialog, and the hero search card. Nothing else.

### Named Rules

**The Offset Shadow Rule.** Every shadow has vertical offset and soft blur. A coloured glow with no offset, or a hard offset with zero blur, is not part of this world — this is not a neobrutalist surface and must not acquire one by accident.

**The Hero Card Rule.** `xl` is the signature of exactly two things: the modal dialog and the first-fold search card. Spending it anywhere else flattens the one place the page wants the eye.

## Shapes

Radius scales with the element: 4px for inner chips and nested controls, 8px for every control (button, input, select, combobox trigger, nav item, tab panel), 12px for content cards and popovers, 16px for the hero search card and the dialog, 22px for the largest panels. Pills (999px) are reserved for status badges, socket chips, counters and progress bars — anything that reads as a token rather than a container.

Form language is rectangular and thin-lined. A container is a 1px hairline plus a tonal fill; it almost never relies on shadow alone to separate. Circles appear only as functional affordances: the 24px selection dot on a product row, the 24px rotating `+` on an accordion summary, the icon plates behind position glyphs (which are rounded squares, not circles).

### Named Rules

**The Shadow-Line Grid Rule.** A seamless grid of equal cells draws its cell lines with `box-shadow: 0 0 0 1px var(--border)` on each cell, inside a rounded, overflow-hidden container. Never with `gap` over a coloured container: when the item count is not a multiple of the column count, the gap technique renders the empty trailing cells as grey holes.

**The Fixed Table Rule.** Any table that must not overflow declares `table-fixed` and a `colgroup` with explicit widths. `truncate` or `break-words` inside an auto-layout table widens the cell instead of constraining it; this shipped as two separate defects (ranking overflow, ticket ids wrapping mid-token) before the rule existed.

## Components

Buttons, fields and cards are plain and sturdy: a real border, a real height, a short press. Nothing is glassy, nothing is gradient-filled, and the only persistent motion in the system is the entry settle.

### Buttons
- **Shape:** softly rounded (8px), fixed heights of 36 / 44 / 52px, never auto-height.
- **Primary:** navy fill with white text and a resting `sm` shadow; hover deepens to `brand-700`. In dark the fill lightens and the label flips to near-black ink.
- **Accent:** amber fill with dark-brown ink (`accent-ink`). The search action. Hover deepens one step.
- **Secondary:** surface fill, strong hairline, ink text; hover fills with the sunken tone.
- **Ghost:** no fill or border, muted text; hover fills sunken and promotes text to ink. Used for close and icon-only actions.
- **Danger:** danger-tinted fill and text with a 35% danger border that strengthens on hover. Destructive confirmation only.
- **Hover / Focus / Press:** colour transitions at 150ms on the exponential ease-out; press scales to 0.985; focus uses the global amber ring. Disabled drops to 55% opacity and loses pointer events.
- **Loading:** a spinning icon replaces the leading icon and the button sets `aria-busy`, so the control reads as busy rather than broken.

### Inputs / Fields
- **Style:** surface fill, strong hairline, 8px radius, 44px height, 14px inline padding. Label, optional accessory, control, then one line of hint or error — always in that envelope.
- **Hover:** the border darkens by mixing 22% ink into `border-strong` in OKLab.
- **Focus:** the global amber ring (2px, 2px offset). Fields do not invent their own focus treatment.
- **Error:** the border turns danger and the hint line is replaced by a danger-coloured message with `role="alert"`; the control sets `aria-invalid` and points `aria-describedby` at it. The hint never coexists with the error.
- **Disabled:** sunken fill, subtle text, not-allowed cursor.
- **Select:** native, for short known lists (year), with the chevron supplied as an inline SVG data URI so the control keeps the platform picker on a phone.

### Chips
- **Style:** pill, sunken or tinted fill, strong or tinted hairline, 12px semibold, no shadow.
- **Badge tones:** neutral, info (navy tint), success, warning, danger, accent — six, and no more. Every badge carries a text label; colour is never the only carrier of meaning.

### Cards / Containers
- **Corner Style:** 12px for content cards, 16px for the hero search card and the dialog.
- **Background:** `surface`, with `sunken` for inner wells and footers.
- **Shadow Strategy:** none at rest for content cards (hairline only); `sm` for compact variants; `xl` only per the Hero Card Rule.
- **Border:** always a 1px `border` hairline. Header and footer strips divide with the same hairline.
- **Internal Padding:** 16px for card bodies, 16–20px for the search card, 16px/14px for header/footer strips.

### Navigation
- **Site header:** sticky, translucent, 64px. Section links are 13.5px medium muted, promoting to ink on hover, with a 4px hover radius. Active route is marked by ink colour, never by an underline or a pill. Below `lg` the link row disappears entirely; the header keeps only the mark, the theme toggle and the user menu.
- **Panel sidebar:** `brand-800` ground in both themes. Items are 8px-radius rows, 14px medium, `sidebar-ink-muted` at rest, white on hover over a 10% white overlay, and white on a 14% white overlay when active. Pending counts ride as an amber pill with dark ink. The rail collapses to icons at 4.5rem and becomes a Radix drawer below `lg`.
- **Tabs:** a segmented control — sunken strip, 4px inner radius, active segment lifting to a surface fill with `sm` shadow. Counts ride inside the trigger as a navy pill.

### Combobox (signature)
An ARIA combobox/listbox pair driven entirely from the keyboard: `aria-expanded`, `aria-haspopup`, `aria-activedescendant`, an internal filter field, and a navy check on the selected option. Trigger matches the field metrics exactly (44px, 8px radius); the list is a `raised` popover at 12px radius with `lg` shadow. Used for make and model, where the list is long and server-fed; the native select stays for year.

### Ranking (signature)
A real `<table>` with a screen-reader-only caption and header row, `table-fixed` plus `colgroup`, label and value as the two columns. Under each label sits an 8px pill track whose fill is the same navy at full strength — the bar is only the visual reading of the number already printed beside it. A nested quantity (searches without results inside the total) draws as a *lighter step of the same hue*, offset by a 2px width inset instead of a border, and is always accompanied by a written label. Single series, single hue, no legend; the card title states what is measured.

### Chart (signature)
A single-series area chart: one navy stroke, a vertical gradient fill from 26% to 2%, horizontal-only dashed grid in `border`, no legend, and exact values deferred to a hover tooltip. Missing days are filled with zeroes before rendering so the time axis cannot lie. The empty state is a sunken plate with a sentence, not an axis with no data.

### Money (signature)
Price is stored and transported as integer cents (`priceCents`, `costCents`) and formatted once, in `lib/formato.ts`, through `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`. A component never divides by 100 or concatenates "R$" itself, and a null price is a designed state — the muted words **"sem preço"**, never `R$ 0,00`, because zero is a price and absence is not.

Every figure is set in tabular figures: it carries `data-numeros` or sits in a `th`/`td`/`time`/`output`. On the product row the price is the largest type in the row (16px bold ink), with the kit rótulo beside it at 12px muted — the number leads, the unit explains.

**Cost is a separate class of information from price.** `costCents` belongs to the admin only (RN06): it renders in the stock list as a 12px muted line under the price and inside the product dialog as a field labelled "Custo (interno)" with the hint "Só você e o representante veem." The public compatibility response selects its columns explicitly so cost cannot leak through a future spread. Margin is shown where the two numbers are being typed — a sunken strip under the price fields giving the value and the rounded percentage — and nowhere a client can reach.

### Product photo (signature)
A product photo is `object-contain` on white with 1px of inner padding, inside a hairline box at `sm` radius — never `object-cover`. These are catalogue cutouts of lamps on a white ground; cropping to fill would cut the bulb. The absent state is not an empty box but an explicit plate: dashed `border-strong`, sunken fill, a centred `ImageOff` glyph, `aria-hidden`. Sizes are 96px on the result row, 80px in the upload field preview, 48px in the stock list and the reservation summary.

The upload field states its own contract in its hint line — "JPG, PNG, WEBP ou AVIF, até 3 MB. A foto aparece na vitrine e no painel." — and validates type and size in the browser before spending a request. Its error replaces that same hint line in danger colour, in the field envelope, like any other field. The button reads "Escolher foto" when empty and "Trocar foto" when filled, with "Remover" as a ghost beside it; while uploading the button is the loading variant, so the control reads as busy rather than broken.

### Kit vocabulary
A kit is a product, not a quantity. `unitsPerKit` is catalogue data (1, 2 or 4), so the interface never infers it from the lighting position: a `FAROL_BAIXO` is a pair on the car, but the product that serves it may be sold as a par or as a torpedo avulso. Three rules follow, and all three read from the data:

- **Quantity defaults to 1, always** (`quantidadePadrao`). Asking for 2 of a paired position would ship four lamps.
- **The rótulo beside the price** comes from `rotuloDoKit`: "o kit (par)" at 2 or more, "a unidade" at 1.
- **The page-level notice** comes from `explicacaoDoKit` and appears only when every listed product carries the *same* `unitsPerKit` and that number is 2 or more — one banner can only state one number. A mixed list (par beside torpedo, or par beside jogo) drops the banner and lets each product's rótulo tell the truth.

`emPar` survives in `META_POSICAO` to explain the car to the driver, never to multiply a quantity.

### Alternative sockets
A position can list more than one socket (`socketCodes`), because a model/year spans trims — halogen and xenon on the same car. The chips are then joined by the lowercase word **"ou"**, never a comma, so the badges read as a choice and not a set. When the catalogue covers only some of them, an amber warning names the uncovered socket explicitly rather than reporting a generic shortage, and every product row promotes its own socket line to bold navy with the phrasing "serve no encaixe X" — because with alternatives on screen, which socket a product fits is the deciding fact, not a footnote.

### Feedback
Toasts are `raised` cards at 12px radius with `lg` shadow, a tone-coloured leading icon, a semibold title and an optional muted line. Tooltips are the same material at 8px radius, capped at 18rem, with an arrow filled from `surface-raised`. Skeletons are a pulsing block tinted by mixing `border` with 35% `canvas`, marked `aria-hidden` — the announcement comes from the region's `aria-busy`, not from the placeholder.

## Do's and Don'ts

### Do:
- **Do** reach colour only through the semantic custom properties in `styles/app.css`; add a token there rather than a hex in a component.
- **Do** spend amber only on the primary search action, the focus ring, the brand lamp and the sidebar pending count.
- **Do** take panel sidebar foregrounds from `sidebar-ink` / `sidebar-ink-muted`, because that rail is dark in both themes.
- **Do** keep one series and one hue in every chart and ranking, and carry comparison with a written label.
- **Do** put dark-brown ink (`accent-ink`) on amber, never white.
- **Do** draw seamless grid cell lines with `box-shadow: 0 0 0 1px var(--border)` on each cell.
- **Do** declare `table-fixed` plus a `colgroup` on any table that must not overflow.
- **Do** format money once, through `lib/formato.ts`, from integer cents — never divide by 100 or concatenate "R$" in a component.
- **Do** read kit size from the product's `unitsPerKit` and let `rotuloDoKit` / `explicacaoDoKit` phrase it; the position never implies the quantity.
- **Do** set a product photo `object-contain` on white, and give its absence the dashed plate rather than an empty box.
- **Do** keep exactly one theme toggle on a surface, in the header, where a user already looks for it.
- **Do** join alternative sockets with the word "ou", and name the uncovered socket when the catalogue misses one.
- **Do** mark every changing figure with `data-numeros` (or put it in a `th`/`td`/`time`/`output`) so it renders in tabular figures.
- **Do** ship every data surface with its empty state, its skeleton and its error in the field envelope — convention executed badly is the one thing this world refuses.
- **Do** keep controls at 44px so a field and a button align on one row.
- **Do** write pt-BR, and explain a domain term (encaixe, posição de farol) in the interface at the moment it appears rather than assuming it.
- **Do** rely on the single global focus ring; it is visible in both themes.
- **Do** use Lucide SVG icons at 14–20px with `aria-hidden`, paired with a text label.

### Don't:
- **Don't** make it quirkier. The category standard is the chosen commitment; an authored flourish smuggled inside it is non-compliance, not improvement.
- **Don't** replace Inter. It is pinned by an examined and upheld decision.
- **Don't** use green, amber or red as a series, category or decorative colour. They mean state.
- **Don't** derive sidebar text from the brand ramp — that is the exact bug the constant ink tokens exist to prevent.
- **Don't** produce a dark value by inverting, filtering or opacity-fading a light one.
- **Don't** ship a shadow without offset and blur: no colourless hard offsets, no coloured haloes. This is not a neobrutalist world.
- **Don't** spend the `xl` shadow outside the dialog and the hero search card.
- **Don't** build a seamless grid with `gap` over a coloured container; trailing empty cells render as grey holes.
- **Don't** rely on `truncate` inside an auto-layout table to constrain a cell; it widens the cell instead.
- **Don't** render a missing price as `R$ 0,00`. Zero is a price; absence is "sem preço".
- **Don't** let `costCents` reach any surface a client can open, or a response that is not admin-only (RN06).
- **Don't** multiply a quantity by the position's `emPar`, and don't state a kit size the listed products don't all share.
- **Don't** `object-cover` a product photo; these are cutouts on white and cropping cuts the lamp.
- **Don't** separate alternative sockets with a comma — a comma reads as "and both", and the car takes one.
- **Don't** offer a second theme toggle on the same surface; three of them shipped once and all were redundant.
- **Don't** put an uppercase kicker or eyebrow above a headline. The uppercase label belongs to data.
- **Don't** add a seventh badge tone or a sixth button variant; extend by composition.
- **Don't** let colour be the only carrier of a state — every badge keeps its text label.
- **Don't** invent a testimonial, customer, price, benchmark, case study or sales figure. None exist, and no surface may imply one.
- **Don't** put a licence plate in a URL, in global state, in storage or in a log (RN02). Only make, model and year travel; a regression test enforces the URL contract.
- **Don't** design a stock or catalogue affordance for the representative (RN06, admin-only), a purchase affordance on a reservation (RN04), an edit affordance on a cancelled ticket (RN10), a swap across sockets (RN11), or a client cancel outside pending/in-service (RN14).
- **Don't** add motion beyond the single entry settle (`assenta`, 260ms on the exponential ease-out) and the short state transitions; everything collapses under `prefers-reduced-motion`.
