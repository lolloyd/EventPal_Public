---
name: heyPal! Avant-Garde
colors:
  surface: '#faf9f3'
  surface-dim: '#dbdad4'
  surface-bright: '#faf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f4ee'
  surface-container: '#efeee8'
  surface-container-high: '#e9e8e2'
  surface-container-highest: '#e3e3dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#58423d'
  inverse-surface: '#30312d'
  inverse-on-surface: '#f2f1eb'
  outline: '#8b716c'
  outline-variant: '#dfc0b9'
  surface-tint: '#a73823'
  primary: '#a73823'
  on-primary: '#ffffff'
  primary-container: '#c85038'
  on-primary-container: '#ffffff'
  inverse-primary: '#ffb4a5'
  secondary: '#45655b'
  on-secondary: '#ffffff'
  secondary-container: '#c5e7db'
  on-secondary-container: '#4a695f'
  tertiary: '#7a5800'
  on-tertiary: '#ffffff'
  tertiary-container: '#977018'
  on-tertiary-container: '#ffffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad3'
  primary-fixed-dim: '#ffb4a5'
  on-primary-fixed: '#3e0500'
  on-primary-fixed-variant: '#87210e'
  secondary-fixed: '#c8eade'
  secondary-fixed-dim: '#accec2'
  on-secondary-fixed: '#002019'
  on-secondary-fixed-variant: '#2e4d44'
  tertiary-fixed: '#ffdea4'
  tertiary-fixed-dim: '#efbf62'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#faf9f3'
  on-background: '#1b1c19'
  surface-variant: '#e3e3dd'
  electric-lime: '#A3E635'
  chromatic-violet: '#7C3AED'
  slate-blue: '#82A6C4'
  charcoal-ink: '#111816'
  paper-bright: '#FAF9F5'
typography:
  display-hero:
    fontFamily: Bodoni Moda
    fontSize: 80px
    fontWeight: '700'
    lineHeight: 84px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Bodoni Moda
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bodoni Moda
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Bodoni Moda
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Bodoni Moda
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Bodoni Moda
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 26px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.12em
  label-mono-tag:
    fontFamily: Hanken Grotesk
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.08em
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style

The design system establishes a high-energy, avant-garde editorial experience for private event documentation. Merging high-fashion print publishing with brutalist gallery discipline, it treats communal memory collection not as utilitarian cloud storage, but as an interactive living exhibition.

The audience consists of cultural connoisseurs, creative event directors, modern teams, and design-literate organizers who reject bland corporate tooling. The emotional tone evokes urgency, refined taste, and tactile intimacy: razor-sharp typography creates dramatic tension against electric, chromatic accents, while brutalist framing and collage-like structures celebrate real, unvarnished human moments.

## Colors

The palette balances warm editorial neutrals with sudden bursts of vibrant chromatic tension:
- **Primary (`#C85038` - Vivid Coral):** Drives the primary CTA pathways, interactive states, key metadata badges, and high-impact editorial moments.
- **Secondary (`#18372F` - Deep Forest):** Provides structural mass, dense typography, solid banners, and grounded contrasts.
- **Tertiary (`#DFB155` - Vivid Amber):** Used for archival notices, curation markers, and secondary focal points.
- **Neutral (`#F4F3ED` - Archival Canvas):** Serves as the tactile background substrate, replacing sterile digital white with warm, physical gallery paper.

### Additional Chromatic Roles
- **Electric Lime (`#A3E635`):** Reserved for live sync beacons, camera capture cues, and real-time activity bursts.
- **Chromatic Violet (`#7C3AED`):** Used for VIP/curator privileges and high-contrast asymmetric gradient bleeds.
- **Slate Blue (`#82A6C4`):** Used for technical metadata labels, framing coordinates, and quiet secondary plates.

## Typography

The typographic structure relies on strict, aggressive juxtaposition:
- **Bodoni Moda:** Drives the narrative soul of the system. Its extreme vertical contrast, razor serifs, and italic flourishes evoke high-fashion manifestos and gallery exhibition catalogues.
- **Hanken Grotesk:** Implements clean, functional precision for body text, administrative actions, and high-density technical metadata tags.

Titles often feature alternating Roman and Italic weights across consecutive lines or words to break digital monotony. All micro-copy, index markers, technical plates (e.g., `PLATE 01`, `ISO 400`, `35MM FL`), and protocol indicators must be set in uppercase via `label-caps` or `label-mono-tag` with generous tracking.

## Layout & Spacing

The layout is grounded in a 12-column asymmetric grid that intentionally embraces offset rhythms, dense catalog indexing, and unconfined white space:
- **Desktop (1024px+):** 12 columns, 1.5rem gutters, 3rem outer margins. Photo plates utilize varying aspect ratios (1:1, 4:5, 16:9) placed across staggered column spans (e.g., 5-col narrative left paired with a 7-col 4-tile contact sheet right).
- **Tablet (768px - 1023px):** 8 columns, 1.25rem gutters, 2rem margins. Cards reflow into paired modular groups with visible divider rules.
- **Mobile (<768px):** 4 columns, 1rem gutters, 1.25rem margins. Asymmetry is maintained through intentional horizontal bleed cards and staggered vertical steps.

Grid borders are explicitly articulated using continuous `1px` structural hairline dividers (`#18372F` at 15% opacity or solid black), echoing printed broadsheets and contact sheets.

## Elevation & Depth

This design system deliberately rejects soft ambient blur shadows in favor of **structural graphic flatplanes and brutalist tactile offsets**:
- **Baseline Surfaces:** Flat tonal paper substrates (`#F4F3ED` and `#FAF9F5`). Depth is established through crisp, overlapping planes rather than elevation blurs.
- **Hard Offset Shadows:** Interactive tactile elements (such as hovering photo tiles or highlighted action cards) employ zero-blur hard shadows: `3px 3px 0px #18372F` or `4px 4px 0px #C85038`.
- **Collage Overlap:** Spatial hierarchy is achieved through layering—floating metadata tags overlap image frames by 12px, breaking bounding boxes to mimic physical contact prints pinned to studio walls.
- **Backdrop Blurs:** Used exclusively for ephemeral sticky navigation ribbons (`rgba(244, 243, 237, 0.85)` with `backdrop-filter: blur(12px)`), framed with a crisp bottom hairline.

## Shapes

The geometric architecture is uncompromisingly **Sharp (`roundedness: 0`)**.
- Every visual container, button, image frame, form field, and interactive tag has exact 90-degree corners (`0px` border-radius).
- Circular apertures are strictly reserved for lens iconography, stamp seals, or technical reticle graphics overlaid onto photographs.
- Structural elements use `1px` to `2px` solid hairline borders to emphasize architectural framing and physical print trim edges.

## Components

### Buttons
- **Primary:** Sharp rectangular container filled with Deep Forest (`#18372F`) or Vivid Coral (`#C85038`). Text set in bold `Hanken Grotesk` uppercase or clean sentence case with an inline directional arrow glyph (`→`). Hover state executes a hard offset translation (`transform: translate(-2px, -2px)`) with a contrasting hard drop-shadow (`2px 2px 0px #111816`).
- **Ghost/Editorial:** Pure hairline border (`1px solid #18372F`), transparent background, instant color inversion on hover (`#18372F` fill with `#F4F3ED` text).

### Photo Plates & Cards
- **Curated Plates:** High-density framing with top-anchored monospace labels (e.g., `PLATE 01 // 35MM FL`). Images sit flush within borders with zero radius.
- **Collage Variations:** Solid color blocks (`#18372F`, `#C85038`, `#DFB155`, `#82A6C4`) layered with technical reticle diagrams (circle-and-crosshair motifs) act as album section separators.
- **Micro-Badges:** Uppercase classification tags (`PROTECTED`, `ARCHIVAL RAW`, `CURATED`) styled with high-contrast tinted fills and razor-thin borders.

### Input Fields & Controls
- **Inputs:** Underlined or crisp 4-sided boxed fields with zero radius. Active focus switches the border from `#18372F` (20% opacity) to solid `#C85038` (`2px`). Labels remain pinned in uppercase above the input.
- **Checkboxes & Radios:** Sharp square boxes (`0px` radius). Selected state fills solid with an inner high-contrast tick or solid fill block.

### Lists & Protocol Rows
- Numbered sequentially (`01`, `02`, `03`) using colored coral numerals, divided by continuous `1px` horizontal rules. Each row reacts to hover with a subtle background shift to `#FAF9F5` and right-side icon reveal.