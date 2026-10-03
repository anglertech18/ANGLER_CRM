# Section Collapse — Main Dashboard

Every `SectionHeading` on the Dashboard renders a chevron toggle on the
right that collapses/expands that section's body.

- Component: `SectionHeading` (`client/src/pages/Dashboard.tsx`) now takes
  `children` (the section body) and shows/hides them. A collapsed section
  keeps only its title + subtitle row visible.
- State is persisted to `localStorage`, `'1'` = collapsed. All reads and
  writes are wrapped in try/catch so a locked-down browser degrades to
  "always expanded" rather than throwing. Managed by the
  `usePersistedCollapse(key)` hook; `SectionHeading` uses its own
  title-keyed state (`dashboard:section-collapsed:<title>`) unless a
  `collapseControl` prop is passed.
- Collapse is **row-wise**. Each dashboard row = one collapse unit:
  - Sales Performance — single heading, key `…:<title>`.
  - Call Activities + Lead Pipeline Overview — one shared control
    (`row-call-pipeline`); either column's chevron collapses both.
  - Lead Sales Activities + Cash Flow Activities — one shared control
    (`row-lead-cashflow-activities`); either chevron collapses both.
  - Product-wise Quadrant Count — single heading.
  - Opportunity Value-wise Quadrant Count — single heading.
- The two shared-control hooks are created at the top of the `Dashboard`
  component and passed down as `collapseControl` to both headings in the row.
- Collapsing only hides the DOM; the underlying React Query fetches still
  run, so expanding again is instant and the header still reflects live data.
