/** Reports with business date before this (YYYY-MM-DD) are excluded from dashboard aggregates (pre–parser-fix noise). */
export const DASHBOARD_DATA_QUALITY_FROM_DATE = "2026-04-03";

/**
 * Core/Side deal categorization defaults.
 * - Any deal containing at least one core product is categorized as `core`.
 * - A deal is `side` only when all detected products are from the side list.
 */
export const DEAL_CATEGORY_CONFIG = {
  coreProductIds: [] as string[],
  sideProductIds: ["book", "workshop", "business_track"] as string[],
};
