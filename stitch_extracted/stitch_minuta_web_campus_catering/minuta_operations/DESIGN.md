---
name: Minuta Operations
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-tabular:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system is crafted for high-stakes enterprise catering logistics, institutional food services, and large-scale industrial dining facilities (such as mining camps and remote operational hubs). It conveys absolute precision, logistical reliability, operational speed, and hygienic integrity. The aesthetic pairs executive data transparency with the rigorous functionality required by head chefs, logistics directors, and camp procurement officers.

The design movement blends **Modern Executive SaaS** with **Structured High-Density Utility**. It avoids decorative clutter in favor of scannable, dense information architecture: deep slate structural surfaces, authoritative geometric headlines, tabular monospaced alignment for portion and headcount tracking, and surgical emerald highlights indicating operational completion and nutritional compliance.

## Colors

The palette establishes an authoritative hierarchy rooted in industrial slate and navy foundations, illuminated by purposeful emerald and amber signifiers:

- **Primary (`#059669`)**: Emerald green signaling verified production, active headcount quotas, compliant food safety logs, and critical operational CTAs.
- **Secondary (`#0F172A`)**: Deep Navy Slate used for structural sidebars, authoritative column headers, modal header bands, and primary typographic weight.
- **Tertiary (`#F59E0B`)**: Warm Amber providing urgent but non-blocking signals—shift preparation warnings, inventory threshold alerts, and pending dietary reviews.
- **Neutral (`#64748B`)**: Slate neutral delivering balanced secondary typography, structural borders (`#E2E8F0`), surface backgrounds (`#F8FAFC`), and low-contrast table cell separators.

### Operational Status Badges
Status chips utilize high-contrast tinted pairings for rapid identification across busy kitchen displays:
- **Confirmado**: Fill `#DCFCE7`, Text `#15803D`
- **Por Confirmar**: Fill `#FEF3C7`, Text `#B45309`
- **En Revisión**: Fill `#DBEAFE`, Text `#1D4ED8`

### Protein & Category Tokens
Distinct semantic pairings allow line cooks and procurement managers to isolate allergen and protein distribution without visual fatigue:
- **Vacuno (Beef)**: Fill `#FEE2E2`, Text `#991B1B`
- **Pollo (Poultry)**: Fill `#FEF9C3`, Text `#854D0E`
- **Cerdo (Pork)**: Fill `#FFE4E6`, Text `#9F1239`
- **Pasta / Carbs**: Fill `#FFEDD5`, Text `#9A3412`
- **Legumbre (Legumes)**: Fill `#DCFCE7`, Text `#166534`

## Typography

Typography balances authoritative display power with legible, tabular data density:
- **Headlines (Plus Jakarta Sans)**: Used for campus views, weekly planning schedules, kitchen section headings, and KPIs. The semi-geometric curves provide an approachable executive finish without compromising seriousness.
- **Body & Tabular Readouts (Manrope)**: Selected for balanced proportions and numerical clarity. Manrope must render with `font-feature-settings: "tnum" 1` across meal counts, calorie calculations, portion grams, and delivery timetables to guarantee column alignment across complex multi-shift rosters.
- **Labels & Micro-Tokens**: Rendered in uppercase or bold weights with slight letter spacing to ensure immediate scannability on warehouse and line-prep rugged tablets.

## Layout & Spacing

The layout is built upon an 8pt structural rhythm optimized for dense data tables, production rosters, and weekly calendar matrices:
- **Desktop (12-Column Fluid Grid)**: Uses 24px gutters with 32px canvas margins. Sidebars and tool ribbons are locked to dedicated 280px / 64px rails, allowing the primary meal-planning matrix to maximize remaining viewport width.
- **Tablet (8-Column Fluid Grid)**: Employs 16px gutters and 24px margins. Weekly planning boards collapse into segmented daily schedules or swipeable tab panels.
- **Mobile (4-Column Layout)**: Uses 16px gutters and 16px canvas margins. Shift checklists and stock verification forms stack vertically.

Internal component gaps are compact: table cells utilize `space-sm` vertically and `space-md` horizontally to preserve viewable record counts without scrolling.

## Elevation & Depth

Visual hierarchy uses crisp boundary containment instead of soft blur dispersion, ensuring clean visibility under industrial fluorescent lighting:
- **Level 0 (Base Canvas)**: Background rendered in clean slate `#F8FAFC`.
- **Level 1 (Card & Table Surface)**: Crisp white surfaces (`#FFFFFF`) framed by precise 1px borders in `#E2E8F0`. Shadow is faint and grounded: `0 1px 3px 0 rgba(15, 23, 42, 0.05)`.
- **Level 2 (Interactive Flyouts & Hover Cards)**: Elevated menus, recipe quick-drawers, and popovers maintain a 1px border (`#CBD5E1`) paired with `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`.
- **Level 3 (Modals & Batch Roster Dialogs)**: Modals sit above a 40% slate-navy backdrop (`rgba(15, 23, 42, 0.40)`), casting a directional shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.10), 0 8px 10px -6px rgba(15, 23, 42, 0.08)`.

## Shapes

The design system implements a **Soft (Level 1)** geometric standard. This geometry reflects functional industrial instrumentation:
- **Inputs, Buttons, and Table Cells**: Base radius of `0.25rem` (4px). Provides structure and crisp alignment when placed in high-density matrices.
- **Cards, Modals, and Flyout Panels**: Medium radius of `0.5rem` (8px). Softens larger viewport surfaces while maintaining clean alignment against grid boundaries.
- **Tokens and Semantic Badges**: Pill or mini-capsule radius (`0.25rem` to full rounding depending on chip context) to contrast sharply against square data grid cells.

## Components

### Buttons
- **Primary CTA**: Emerald green (`#059669`) fill with pure white typography, 4px border radius, 0 1px 2px rgba(0, 0, 0, 0.05) shadow. Hover transitions to `#047857`. Focus ring: 2px solid `#A7F3D0` with 2px offset.
- **Secondary Action**: Slate Navy (`#0F172A`) solid fill with white text, or clean white fill with `#0F172A` text and `#CBD5E1` border.
- **Tertiary / Utility**: Ghost styling with transparent fill, slate hover (`#F1F5F9`), and `#475569` text.

### Badges & Category Chips
- **Status & Protein Badges**: Padding is strictly `2px 8px` with font size `11px`, bold weight (`700`), uppercase or title-case text, and a subtle internal tint border (1px solid border at 20% opacity of the badge text color).
- Text colors and background fills must strictly adhere to the defined category and status palette tokens.

### Data Tables (Rosters & Menus)
- **Headers**: Slate-Navy tinted background (`#F8FAFC` or `#0F172A` in high-contrast modes), text in uppercase `11px` Slate-600 (`#475569`), bottom border 2px solid `#E2E8F0`.
- **Rows**: Alternating hover fill (`#F8FAFC`), single-pixel `#F1F5F9` bottom borders, and numeric values aligned right using tabular figures. Compact line height (36px to 44px per row).

### Input Fields & Selectors
- **Input Elements**: White surface, 1px border in `#CBD5E1`, text in `#0F172A`, placeholder in `#94A3B8`. Height constrained to 36px for dense tabular data-entry forms. Focus state displays `#059669` border and matching soft halo.

### Roster Cards & Meal Units
- **Planning Cards**: White surface with a 1px solid border (`#E2E8F0`), partitioned into meal timing (Breakfast, Lunch, Dinner, Night Shift), with right-aligned headcount quotas and status badge indicators. Left accent border (3px) indicates primary protein grouping.