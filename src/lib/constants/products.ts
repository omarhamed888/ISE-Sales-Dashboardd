export interface Product {
  id: string;
  label: string;
  type: "course" | "book";
  group?: string; // for exclusive groups
}

export const PRODUCTS: Product[] = [
  { id: "bdp_online",    label: "BDP Online",   type: "course", group: "bdp" },
  { id: "bdp_offline",   label: "BDP Offline",  type: "course", group: "bdp" },
  { id: "negotiation",   label: "Negotiation",  type: "course" },
  { id: "ifp",           label: "IFP",          type: "course" },
  { id: "ibn_souq",      label: "Ibn Souq",     type: "course" },
  { id: "bds",           label: "BDS",          type: "course" },
  { id: "book",          label: "Book",         type: "book"   },
];

/** BDP Online and BDP Offline are mutually exclusive — selecting one deselects the other */
export const EXCLUSIVE_GROUPS: Record<string, string[]> = {
  bdp: ["bdp_online", "bdp_offline"],
};

export function toggleProduct(selected: string[], productId: string): string[] {
  const product = PRODUCTS.find(p => p.id === productId);
  const isSelected = selected.includes(productId);

  if (isSelected) {
    return selected.filter(id => id !== productId);
  }

  let next = [...selected, productId];

  // Deselect any product in the same exclusive group
  if (product?.group && EXCLUSIVE_GROUPS[product.group]) {
    const siblings = EXCLUSIVE_GROUPS[product.group].filter(id => id !== productId);
    next = next.filter(id => !siblings.includes(id));
  }

  return next;
}

export function productLabels(ids: string[]): string {
  return ids.map(id => PRODUCTS.find(p => p.id === id)?.label ?? id).join("، ");
}
