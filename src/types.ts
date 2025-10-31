export type LinksMap = Record<number, string>;

export interface PersistedState {
  claimed: number[];
  mapTemplate: string;
  mapLinks: LinksMap;
  filterOnlyUnclaimed: boolean;
  autoClearLinksOnHour: boolean;
}
