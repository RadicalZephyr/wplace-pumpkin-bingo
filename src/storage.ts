import type { LinksMap, PersistedState } from "./types";

const LS_CLAIMED = "pumpkin-claimed-v3";
const LS_TEMPLATE = "pumpkin-map-template-v2";
const LS_LINKS = "pumpkin-map-links-v2";
const LS_FILTER = "pumpkin-only-unclaimed-v2";
const LS_AUTOCLEAR_LINKS = "pumpkin-auto-clear-links-v1";

export const DEFAULT_TEMPLATE =
  "https://wplace.live/?lat={lat}&lng={lng}&zoom=14";

export function loadClaimed(): Set<number> {
  try {
    const raw = localStorage.getItem(LS_CLAIMED);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(
      arr.filter((n) => Number.isInteger(n) && n >= 1 && n <= 100),
    );
  } catch {
    return new Set();
  }
}

export function saveClaimed(s: Set<number>) {
  localStorage.setItem(LS_CLAIMED, JSON.stringify([...s]));
}

export function loadTemplate(): string {
  return localStorage.getItem(LS_TEMPLATE) || DEFAULT_TEMPLATE;
}

export function saveTemplate(t: string) {
  localStorage.setItem(LS_TEMPLATE, t);
}

export function loadLinks(): LinksMap {
  try {
    const raw = localStorage.getItem(LS_LINKS);
    const obj = raw ? (JSON.parse(raw) as LinksMap) : {};
    return sanitizeLinks(obj);
  } catch {
    return {};
  }
}

export function saveLinks(m: LinksMap) {
  localStorage.setItem(LS_LINKS, JSON.stringify(m));
}

export function loadFilter(): boolean {
  return localStorage.getItem(LS_FILTER) === "1";
}
export function saveFilter(v: boolean) {
  localStorage.setItem(LS_FILTER, v ? "1" : "0");
}

export function loadAutoClearLinks(): boolean {
  return localStorage.getItem(LS_AUTOCLEAR_LINKS) === "1";
}
export function saveAutoClearLinks(v: boolean) {
  localStorage.setItem(LS_AUTOCLEAR_LINKS, v ? "1" : "0");
}

export function sanitizeLinks(obj: LinksMap): LinksMap {
  const out: LinksMap = {};
  for (const [k, v] of Object.entries(obj)) {
    const n = Number(k);
    if (Number.isInteger(n) && n >= 1 && n <= 100 && isLikelyUrl(v))
      out[n] = String(v);
  }
  return out;
}

export function isLikelyUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

export function exportAll(state: PersistedState): string {
  return JSON.stringify(state, null, 2);
}

export function importAll(json: string): PersistedState | null {
  try {
    const p = JSON.parse(json) as Partial<PersistedState>;
    return {
      claimed: (p.claimed ?? []).filter(
        (n) => Number.isInteger(n) && n >= 1 && n <= 100,
      ),
      mapTemplate: p.mapTemplate || DEFAULT_TEMPLATE,
      mapLinks: sanitizeLinks(p.mapLinks || {}),
      filterOnlyUnclaimed: !!p.filterOnlyUnclaimed,
      autoClearLinksOnHour: !!p.autoClearLinksOnHour,
    };
  } catch {
    return null;
  }
}
