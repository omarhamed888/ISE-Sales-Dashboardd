import { PRODUCTS, productLabels } from "@/lib/constants/products";
import type { DealInput } from "@/lib/services/gemini-parser";
import { DEAL_CATEGORY_CONFIG } from "@/lib/config";

const VALID_IDS = new Set(PRODUCTS.map((p) => p.id));
const CANONICAL_LABELS: Record<string, string> = {
  bdp_online: "BDP Online",
  bdp_offline: "BDP Offline",
  bdp_recorded: "BDP Recorded",
  negotiation: "Negotiation",
  ifp: "IFP",
  ibn_souq: "Ibn Souq",
  bds: "BDS",
  book: "Book",
  subscription: "Subscription",
  workshop: "Workshop",
  business_track: "Business Track",
};
const SIDE_PRODUCT_IDS = new Set(
  DEAL_CATEGORY_CONFIG.sideProductIds.map((id) => normalizeForMatch(id))
);
const CORE_PRODUCT_IDS = new Set(
  DEAL_CATEGORY_CONFIG.coreProductIds.map((id) => normalizeForMatch(id))
);

/** Latin + common Arabic noise for matching */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map free text (single course name or fragment) to a canonical product id, or null.
 */
export function matchCourseTextToProductId(raw: string): string | null {
  const t = normalizeForMatch(raw);
  if (!t) return null;

  if (/\bbds\b|^bds$/i.test(t.trim()) || /بي\s*دي\s*اس|بي\s*دي\s*إس/.test(raw)) {
    return "bds";
  }

  if (/\bbdp\b/.test(t) || /بي\s*دي\s*بي/.test(raw)) {
    if (/online|on\s*line|أونلاين|اونلاين|أون\s*لاين|انلاين/.test(t) || /أونلاين/i.test(raw)) {
      return "bdp_online";
    }
    if (/offline|حضور|حضوري|presence|face[\s-]?to[\s-]?face|ف\s*كلاس|في\s*الكلاس/.test(t) || /حضور/i.test(raw)) {
      return "bdp_offline";
    }
  }
  if (/^bdp\s*online$|^bdp\s*on$/i.test(t.trim())) return "bdp_online";
  if (/^bdp\s*offline$/i.test(t.trim())) return "bdp_offline";

  if (
    /negotiation|negotiat|نيقوت|تفاوض|nego\b/.test(t) ||
    /negotiation/i.test(raw)
  ) {
    return "negotiation";
  }
  if (/\bifp\b|^ifp$|آي\s*آف\s*بي|اي\s*اف\s*بي/.test(t) || /^ifp$/i.test(raw.trim())) {
    return "ifp";
  }
  if (
    /ibn\s*souq|ibn\s*suq|ابن\s*السوق|ابن\s*سوق/.test(t) ||
    /ابن\s*سوق|ابن\s*السوق/i.test(raw)
  ) {
    return "ibn_souq";
  }
  if (/^book$|كتاب|الكتاب|book\b/.test(t) || /كتاب/.test(raw)) {
    return "book";
  }
  if (/subscription|اشتراك|sub\b/.test(t)) {
    return "subscription";
  }
  if (/workshop|ورشة|ورشه|ws\b/.test(t)) {
    return "workshop";
  }
  if (/business[\s_-]*track|biz[\s_-]*track|مسار\s*الأعمال|مسار\s*الاعمال/.test(t)) {
    return "business_track";
  }

  return null;
}

/** Split program name by common separators; Arabic comma included */
function splitProgramTokens(programName: string): string[] {
  return programName
    .split(/[,،؛;|/\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Infer product ids from a human-written programName (comma-separated courses).
 */
export function inferProductIdsFromProgramName(programName: string): string[] {
  const tokens = splitProgramTokens(programName);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tok of tokens) {
    const id = matchCourseTextToProductId(tok);
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return applyBdpExclusive(out);
}

function canonicalLabelFor(id: string): string {
  if (CANONICAL_LABELS[id]) return CANONICAL_LABELS[id];
  return id;
}

/**
 * Normalize mixed product IDs/text entries into canonical IDs where possible.
 * Also splits accidental combined entries such as "BDP Online، BDS" to two IDs.
 */
export function canonicalizeProductIds(rawProducts: string[]): string[] {
  const out: string[] = [];
  for (const raw of rawProducts) {
    const token = String(raw || "").trim();
    if (!token) continue;
    const parts = splitProgramTokens(token);
    if (parts.length > 1) {
      for (const part of parts) {
        const mapped = matchCourseTextToProductId(part) ?? normalizeForMatch(part);
        if (mapped) out.push(mapped);
      }
      continue;
    }
    const mapped = matchCourseTextToProductId(token);
    if (mapped) {
      out.push(mapped);
      continue;
    }
    out.push(normalizeForMatch(token));
  }
  return applyBdpExclusive(dedupeKeepOrder(out.filter(Boolean)));
}

export function buildProgramNameFromProducts(ids: string[]): string {
  const labels = ids.map(canonicalLabelFor);
  return labels.join("، ");
}

function applyBdpExclusive(ids: string[]): string[] {
  const iOn = ids.indexOf("bdp_online");
  const iOff = ids.indexOf("bdp_offline");
  if (iOn === -1 || iOff === -1) return ids;
  const keepOnline = iOn > iOff;
  return ids.filter((id) => (keepOnline ? id !== "bdp_offline" : id !== "bdp_online"));
}

/**
 * Normalize deal for Firestore: canonical product ids, programName from labels, and
 * optionally infer products from programName when checkboxes were empty (e.g. new saves).
 */
export function normalizeDealInput(
  deal: DealInput,
  inferFromProgramName = true
): DealInput {
  let products = canonicalizeProductIds(deal.products ?? []);

  if (
    products.length === 0 &&
    inferFromProgramName &&
    deal.programName?.trim()
  ) {
    products = inferProductIdsFromProgramName(deal.programName);
  }

  products = applyBdpExclusive(products);

  const hasOnlyLegacyKnownProducts = products.every((id) => VALID_IDS.has(id));
  const programName =
    products.length > 0 && hasOnlyLegacyKnownProducts
      ? productLabels(products)
      : products.length > 0
        ? buildProgramNameFromProducts(products)
        : deal.programName.trim();
  const programCount =
    products.length > 0 ? products.length : Math.max(1, deal.programCount || 1);

  return {
    ...deal,
    products,
    programName,
    programCount,
    dealValue: deal.dealValue,
  };
}

export type DealCategory = "core" | "side";

export function classifyDealCategory(input: {
  products?: string[];
  programName?: string;
}): DealCategory {
  const normalizedProducts = canonicalizeProductIds(input.products ?? []);
  const inferred =
    normalizedProducts.length > 0
      ? normalizedProducts
      : inferProductIdsFromProgramName(input.programName || "");
  if (inferred.length === 0) return "core";
  if (inferred.some((id) => CORE_PRODUCT_IDS.has(id))) return "core";
  return inferred.every((id) => SIDE_PRODUCT_IDS.has(id)) ? "side" : "core";
}

function dedupeKeepOrder(ids: string[]): string[] {
  const s = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!s.has(id)) {
      s.add(id);
      out.push(id);
    }
  }
  return out;
}
