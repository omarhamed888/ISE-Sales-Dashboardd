/**
 * Single source of truth for which admin routes expose the global FilterBar.
 *
 * Both `AppLayout` (to allocate top-offset for the bar) and `FilterBar` itself
 * (to decide whether to render) import this list. Adding a new analytics page
 * that should share the global filters? Add its path here.
 *
 * Phase 4.2 of the enhancement plan migrates `/deals-analytics`,
 * `/marketing-insights`, `/meta-insights`, and `/ads-management` to use the
 * shared FilterContext — those are commented out until their page refactors
 * land, to avoid showing the bar over pages that re-implement filters locally.
 */
export const FILTERED_ROUTES: string[] = [
  "/dashboard",
  "/team",
  "/ads",
  "/reports",
  "/metrics",
  "/deals-analytics",
  "/marketing-insights",
  "/meta-insights",
];

/**
 * Ad-spend analytics routes. The global filter's deal/report dimensions
 * (rep, course, booking, category, messaging platform) don't map to ad-spend
 * data — only the date/period does. On these routes the FilterBar shows just
 * the date controls; each page keeps its own domain-specific filters
 * (e.g. Meta's source = API vs manual) locally.
 */
export const DATE_ONLY_FILTER_ROUTES: string[] = [
  "/marketing-insights",
  "/meta-insights",
];
