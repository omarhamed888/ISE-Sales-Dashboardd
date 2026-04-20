import { PRODUCTS, productLabels } from "@/lib/constants/products";
import type { DealInput } from "@/lib/services/gemini-parser";

const VALID_IDS = new Set(PRODUCTS.map((p) => p.id));

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
  let products = (deal.products ?? []).filter((id) => VALID_IDS.has(id));
  products = dedupeKeepOrder(products);

  if (
    products.length === 0 &&
    inferFromProgramName &&
    deal.programName?.trim()
  ) {
    products = inferProductIdsFromProgramName(deal.programName);
  }

  products = applyBdpExclusive(products);

  const programName =
    products.length > 0 ? productLabels(products) : deal.programName.trim();
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
