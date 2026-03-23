# Amelia — Components & Design System
**Stack:** shadcn/ui · Tailwind v4 · Space Mono · Poppins · Radix UI primitives

---

## Design Tokens

### Color Palette (CSS Variables)

```css
/* Light Mode */
:root {
  /* Backgrounds */
  --bg-base:        #FEF7EE;   /* page background — warm cream */
  --bg-subtle:      #FDF0DE;   /* inputs, table rows on hover */
  --surface:        #FFFCF8;   /* cards, sidebar, topbar */
  --surface-raised: #FEF0DC;   /* elevated cards */
  --surface-sunken: #FDEBD0;   /* inset areas */

  /* Borders */
  --border:         #EDD9BE;   /* default border */
  --border-strong:  #E0C9A6;   /* hover state border */

  /* Text */
  --text-primary:   #1C0A00;   /* headings, primary content */
  --text-secondary: #5C3D1E;   /* labels, secondary content */
  --text-muted:     #9B7355;   /* placeholders, helper text */

  /* Brand (Orange) */
  --accent:         #E07B39;   /* primary buttons, active states */
  --accent-hover:   #C4651A;   /* button hover */
  --accent-subtle:  rgba(224, 123, 57, 0.12);  /* tinted backgrounds */
  --accent-glow:    rgba(224, 123, 57, 0.22);  /* focus rings */

  /* Semantic */
  --success:        #2D9B5A;
  --success-subtle: rgba(45, 155, 90, 0.13);
  --danger:         #B83222;
  --danger-subtle:  rgba(184, 50, 34, 0.11);
  --warning:        #C07B0A;
  --warning-subtle: rgba(192, 123, 10, 0.12);
  --info:           #1A5FA8;
  --info-subtle:    rgba(26, 95, 168, 0.10);
}

/* Dark Mode */
.dark {
  --bg-base:        #150800;
  --bg-subtle:      #1E0D03;
  --surface:        #261005;
  --surface-raised: #331708;
  --surface-sunken: #40200C;
  --border:         #4A2810;
  --border-strong:  #5C3418;
  --text-primary:   #FEF7EE;
  --text-secondary: #D4A882;
  --text-muted:     #8B6644;
  --accent:         #F4924A;
  --accent-hover:   #E07B39;
  --accent-subtle:  rgba(244, 146, 74, 0.15);
  --accent-glow:    rgba(244, 146, 74, 0.25);
  --success:        #4ADE80;
  --success-subtle: rgba(74, 222, 128, 0.12);
  --danger:         #F87171;
  --danger-subtle:  rgba(248, 113, 113, 0.12);
  --warning:        #FBB544;
  --warning-subtle: rgba(251, 181, 68, 0.12);
}
```

### Typography

```css
/* Fonts */
--font-display: 'Space Mono', 'Courier New', monospace;
--font-body:    'Poppins', 'Trebuchet MS', system-ui, sans-serif;
/* Loaded from public/fonts/ via @font-face — do NOT use Google Fonts or @fontsource */

/* Scale */
--text-xs:   11px;   /* badges, timestamps, helper text */
--text-sm:   12px;   /* labels, table headers */
--text-base: 13.5px; /* body, form inputs */
--text-md:   15px;   /* card subtitles */
--text-lg:   17px;   /* page section titles */
--text-xl:   20px;   /* card titles, modal headings */
--text-2xl:  24px;   /* stat values, large headings */
--text-3xl:  28px;   /* hero headings */

/* Display (Space Mono) — always use for: */
/* - Logo wordmark */
/* - Page titles */
/* - Stat card values (₦127,500) */
/* - Bill totals */
/* - Section headings */
```

### Spacing & Shape

```css
--radius-sm:  5px;   /* badges, small chips */
--radius-md:  7px;   /* inputs, buttons, small cards */
--radius-lg:  10px;  /* main cards, panels */
--radius-xl:  14px;  /* modals, drawers */
--radius-full: 9999px; /* pill badges */

/* Shadows (minimal — prefer border instead) */
--shadow-sm:  0 1px 2px rgba(28,10,0,.04);
--shadow-md:  0 2px 8px rgba(28,10,0,.06);
--shadow-lg:  0 4px 24px rgba(28,10,0,.08);
```

---

## shadcn/ui Components (Install These)

Run to install all at once:

```bash
bunx shadcn@latest add button input label select textarea
bunx shadcn@latest add form
bunx shadcn@latest add dialog sheet drawer
bunx shadcn@latest add dropdown-menu command popover
bunx shadcn@latest add table
bunx shadcn@latest add badge
bunx shadcn@latest add card
bunx shadcn@latest add tabs
bunx shadcn@latest add toast sonner
bunx shadcn@latest add alert
bunx shadcn@latest add avatar
bunx shadcn@latest add separator
bunx shadcn@latest add skeleton
bunx shadcn@latest add progress
bunx shadcn@latest add tooltip
bunx shadcn@latest add calendar date-picker
bunx shadcn@latest add checkbox radio-group switch
bunx shadcn@latest add scroll-area
bunx shadcn@latest add hover-card
bunx shadcn@latest add collapsible
```

---

## Custom Components (Build These)

### Layout

**`AppShell`**
- Root layout after authentication
- Renders: `<Sidebar>` + `<Topbar>` + `<main>` content area
- Manages sidebar open/closed state (mobile)
- Props: `children`

**`Sidebar`**
- Fixed left panel, 218px wide
- Sections: logo block, nav items, bottom user card
- Collapses to 56px icon-only on `lg` breakpoint
- Props: `isCollapsed`, `onToggle`

**`SidebarNavItem`**
- Single navigation link
- States: default, hover, active (orange left-border indicator)
- Shows badge (red pill) for unread counts
- Props: `icon`, `label`, `href`, `isActive`, `badgeCount?`

**`Topbar`**
- Fixed top bar, 56px height
- Left: page title (Space Mono font)
- Center: global search input
- Right: notifications bell, dark mode toggle, (future: user menu)
- Props: `pageTitle`

**`PageHeader`**
- Used at top of each page content area
- Title + subtitle + right-aligned CTA button slot
- Props: `title`, `subtitle`, `action?`

---

### Data Display

**`StatCard`**
- Metric summary card
- Structure: icon chip → label → value (Space Mono) → meta text with trend
- Variants: default, success (green), danger (red), warning (amber)
- Clickable variant: hover lift effect
- Props: `icon`, `label`, `value`, `meta`, `variant?`, `onClick?`

**`DataTable`**
- Wrapper around shadcn `Table` with Amelia styling
- Props: `columns`, `data`, `isLoading`, `emptyState`
- Includes: column headers with sort, row hover, skeleton loading rows

**`StatusBadge`**
- Pill badge for bill/claim status
- Variants: `awaiting_auth` (amber) · `pending` (orange) · `paid` (green) · `overdue` (red) · `claimed` (blue) · `new` (amber)
- Props: `status`

**`AuthCodeBadge`**
- Inline display of auth code status
- Shows: green tick + code text (if confirmed) | red "Missing" text (if absent)
- Props: `authCode?`, `status`

**`TrendIndicator`**
- Small inline metric change indicator
- Up arrow (green) or down arrow (red) with percentage
- Props: `value`, `direction: 'up' | 'down'`

**`RevenueChart`**
- Recharts `ResponsiveContainer` + `LineChart`
- Dual line: Collections (orange) + HMO Claims (green)
- Tooltip styled to match Amelia palette
- Props: `data: Array<{date, collections, claims}>`

**`PaymentMixChart`**
- Recharts `ResponsiveContainer` + `PieChart` (donut, cutout 68%)
- Legend below chart
- Props: `data: Array<{channel, amount}>`

**`ProgressBarList`**
- Vertical list of label + value + animated progress bar
- Used in Analytics > Top Services
- Props: `items: Array<{label, value, max}>`

---

### Forms & Inputs

**`PatientSelector`**
- Combobox (shadcn `Command` inside `Popover`)
- Searches patients by name or phone
- Displays: name + HMO badge in dropdown options
- Props: `onSelect`, `selectedPatientId?`

**`ServiceAutocomplete`**
- Combobox for selecting services from `service_catalog`
- Creates new service inline if not found
- Props: `onSelect`, `onCreateNew`

**`ChipSelector`**
- Toggle group of pill chips (single or multi select)
- Used for: Admission Type, Sex, Payment Type, filters
- Props: `options: Array<{value, label}>`, `value`, `onChange`, `multiple?`

**`DynamicLineItemTable`**
- Used for Investigations and Medications tables in Bill Builder
- Add/remove rows
- Each row: configurable column inputs (text, number)
- Auto-calculates row total
- Emits onChange with full rows array
- Props: `columns`, `rows`, `onChange`, `onAddRow`, `currency?`

**`NINInput`**
- Specialized input for Nigerian NIN
- Enforces: exactly 11 digits, numeric only
- Shows character count (X/11)
- Shows validation state: incomplete (grey) → complete (green)
- Props: standard input props

**`PhoneInput`**
- Nigerian phone number input
- Auto-formats: strips country code if pasted, normalizes to 080XXXXXXXX
- Validates against Nigerian mobile patterns
- Props: standard input props

**`DateRangePicker`**
- Built on shadcn `Calendar` + `Popover`
- Used in Claims page for "Period Covered"
- Displays: "1 Mar – 13 Mar 2026"
- Props: `startDate`, `endDate`, `onChange`

**`AuthCodeInput`**
- Amber-tinted card containing: label, text input, confirm button
- States: hidden → visible (on lock banner click) → confirmed (green)
- Emits `onConfirm(code: string)`
- Props: `hmoName`, `onConfirm`, `initialCode?`

---

### Feedback & Overlays

**`AlertBanner`**
- Full-width contextual alert with icon, title, body, optional dismiss
- Variants: `danger` (red), `warning` (amber), `success` (green), `info` (blue)
- Props: `variant`, `title`, `body`, `onDismiss?`

**`EmptyState`**
- Centered empty state for tables and pages
- Icon + heading + body + CTA button
- Props: `icon`, `heading`, `body`, `action?`

**`LoadingSkeleton`**
- Shimmer skeleton matching the shape of the content it replaces
- Variants: `table` (rows), `statCard`, `chart`, `form`
- Props: `variant`, `rows?`

**`ConfirmDialog`**
- shadcn `AlertDialog` wrapper
- Used for: delete confirmations, destructive actions
- Props: `title`, `description`, `onConfirm`, `isDestructive?`

**`ToastProvider`**
- Uses shadcn `Sonner` toaster
- Wrapper functions: `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`
- Position: bottom-right
- Custom styling to match Amelia palette

**`LoadingButton`**
- Button that shows spinner when in loading state
- Prevents double-submission
- Props: `isLoading`, `loadingText?`, all standard button props

---

### Domain-Specific Components

**`BillSummaryCard`**
- Right-panel summary in Bill Builder
- Shows: Investigations subtotal, Medications subtotal, Grand Total, HMO deduction (conditional), Expected Receivable
- Reactively updates as bill items change
- Props: `investigations`, `medications`, `isHMO`

**`AuthTrackerCard`**
- State-driven auth code tracker card
- Renders different UI based on state: `awaiting` | `entering` | `confirmed`
- Props: `status`, `hmoName`, `authCode?`, `onConfirm`

**`PaymentOptionsCard`**
- Post-payment-generation card
- Shows: Web Checkout (card) payment link, OPay Wallet payment link
- Props: `paymentLink`, `opayLink`, `transactionRef`

**`PatientCard`**
- Compact patient summary (used in bill builder + claim selection)
- Shows: name, age, HMO badge, NIN (masked), phone
- Props: `patient`

**`ClaimBatchCard`**
- Selectable patient card in Claims Generator
- Shows: name, HMO, amount, auth status
- States: selectable, selected, disabled (no auth code)
- Props: `patient`, `bill`, `isSelected`, `onToggle`

**`ClaimProgressBar`**
- Animated generation progress during claim batch creation
- 5 steps with labels, fills left to right
- Props: `currentStep`, `steps: string[]`

**`TPATrackerRow`**
- Single TPA submission row in tracker list
- Shows: TPA name, submission date, claim count, amount, status badge, days overdue/remaining
- Props: `submission`

**`OCRUploader`**
- File upload area for HMO card / pre-auth document
- Drag-and-drop + click-to-browse
- Shows thumbnail preview for images
- Loading state during OCR processing
- Success state with extracted fields preview
- Props: `onExtract`, `accept?`

**`ClaimScoreIndicator`**
- Per-bill AI completeness score before claim generation
- Shows: score (0–100), color-coded (green/amber/red), list of issues
- Props: `score`, `issues: string[]`

---

### Navigation Components

**`BreadcrumbNav`**
- Simple breadcrumb for deep pages (e.g. Patients > Emeka Okafor > Bill #00441)
- Props: `crumbs: Array<{label, href?}>`

**`FilterTabs`**
- Horizontal tab strip for filtering table views
- Used in Bills list (All / Awaiting Auth / Paid / Overdue)
- Shows count badge per tab
- Props: `tabs: Array<{value, label, count?}>`, `active`, `onChange`

**`SearchInput`**
- Styled search input with magnifier icon
- Debounced onChange (300ms)
- Clear button when value present
- Props: `placeholder`, `value`, `onChange`, `isLoading?`

---

## Page Layouts

### Two-Column Builder Layout
Used for: Bill Builder, (future) Patient detail
```
[Left 60%: Form sections stacked]  [Right 40%: Summary + Actions]
```

### Two-Column Claims Layout
Used for: Claims Generator
```
[Left 65%: Selectable patient list]  [Right 35%: Options + Generate]
```

### Full-Width Table Layout
Used for: Patient list, Bills list, Analytics
```
[PageHeader with CTA]
[FilterTabs or search]
[DataTable full width]
```

### Dashboard Layout
```
[StatCards row — 4 equal columns]
[Alert banners — full width]
[Revenue chart 60%] + [Mix chart 40%]
[Recent bills table — full width]
```

---

## Icon Set

Use `@phosphor-icons/react` exclusively. **Never install or import lucide-react.**

| Usage | Phosphor Icon |
|---|---|
| Dashboard | `SquaresFour` |
| Patients | `Users` |
| Bill Builder | `FileText` |
| Claims | `ClipboardText` |
| Analytics | `ChartBar` |
| Auth code (locked) | `Lock` |
| Auth code (confirmed) | `CheckCircle` |
| Payment | `CreditCard` |
| SMS | `ChatText` |
| Download | `DownloadSimple` |
| Alert / overdue | `Warning` |
| Success | `CheckCircle` |
| Delete / remove | `X` |
| Add row | `Plus` |
| Search | `MagnifyingGlass` |
| Notifications | `Bell` |
| Dark mode (sun) | `Sun` |
| Dark mode (moon) | `Moon` |
| Settings | `Gear` |
| Upload/scan | `Upload` |
| Generate/magic | `Sparkle` |
| Clinic | `Buildings` |
| Doctor | `Stethoscope` |

---

## Animation Guidelines

- Use `tailwindcss-animate` plugin (ships with shadcn)
- Page transitions: `animate-in fade-in-0 slide-in-from-bottom-2 duration-300`
- Card enter: `animate-in fade-in-0 zoom-in-95 duration-200`
- Toast: uses Sonner's built-in animation
- Stat card hover: `transition-transform hover:-translate-y-0.5 duration-150`
- Button press: `active:scale-95 transition-transform duration-75`
- Skeleton shimmer: built into shadcn `Skeleton` component
- Progress bar fill: `transition-all duration-500 ease-out`
- Claim generation progress: `transition-all duration-600 ease-in-out`

---

## Responsive Breakpoints

Using Tailwind v4 defaults:
- `sm`: 640px — stack form grids to single column
- `md`: 768px — sidebar collapses to icon-only
- `lg`: 1024px — full layout visible
- `xl`: 1280px — wider stat card grid

Mobile-first approach. All layouts are `grid-cols-1` by default, expanding at breakpoints.

---

## Utility Classes (Custom)

Add to your `index.css` or Tailwind config:

```css
/* Space Mono display text */
.font-display { font-family: var(--font-display); }

/* Currency values */
.currency {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: -0.02em;
}

/* Table cell with currency */
.td-currency {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 13.5px;
}

/* Muted uppercase label */
.label-caps {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* Active nav item accent */
.nav-active-bar::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 56%;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
}
```
