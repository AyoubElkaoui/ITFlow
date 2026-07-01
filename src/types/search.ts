export type SearchType = "TICKET" | "KB" | "ASSET" | "CLIENT" | "CONTACT";

export interface SearchResult {
  type: SearchType;
  id: string;
  title: string;
  subtitle: string | null;
  snippet: string | null;
  url: string;
  score: number;
}

export interface SearchResponse {
  q: string;
  results: Record<SearchType, SearchResult[]>;
}

// Weergave-volgorde + labels van de groepen.
export const SEARCH_GROUPS: { type: SearchType; labelNl: string; labelEn: string }[] = [
  { type: "TICKET", labelNl: "Tickets", labelEn: "Tickets" },
  { type: "KB", labelNl: "Kennisbank", labelEn: "Knowledge base" },
  { type: "ASSET", labelNl: "Assets", labelEn: "Assets" },
  { type: "CLIENT", labelNl: "Klanten", labelEn: "Clients" },
  { type: "CONTACT", labelNl: "Contacten", labelEn: "Contacts" },
];
