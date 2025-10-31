import { useCallback, useMemo, useState } from "react";
import {
  exportAll,
  importAll,
  // isLikelyUrl,
  loadAutoClearLinks,
  loadClaimed,
  loadFilter,
  loadLinks,
  loadTemplate,
  saveAutoClearLinks,
  saveClaimed,
  saveFilter,
  saveLinks,
  saveTemplate,
} from "./storage";
import type { LinksMap } from "./types";
import { useCountdownToTopOfHour, useMedia } from "./hooks";
import PumpkinGrid from "./components/PumpkinGrid.tsx";

function downloadJson(filename: string, payload: string) {
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const CLAIMED_LINK =
    "https://backend.wplace.live/event/hallowen/pumpkins/claimed";

  // persistent state
  const [claimed, setClaimed] = useState<Set<number>>(() => loadClaimed());
  const [mapTemplate, setMapTemplate] = useState<string>(() => loadTemplate());
  const [mapLinks, setMapLinks] = useState<LinksMap>(() => loadLinks());
  const [filterOnlyUnclaimed, setFilterOnlyUnclaimed] = useState<boolean>(() =>
    loadFilter(),
  );
  const [autoClearLinksOnHour, setAutoClearLinksOnHour] = useState<boolean>(
    () => loadAutoClearLinks(),
  );

  const large = useMedia("(min-width: 1024px)"); // >=1024px => 10x10; otherwise rows of 5 & no link/edit
  const { mmss, atTop } = useCountdownToTopOfHour();
  const claimedCount = claimed.size;

  // handle top-of-hour auto action (links only, never unclaim pumpkins)
  const [processed, setProcessed] = useState(false);
  if (atTop && !processed) {
    setProcessed(true);
    if (autoClearLinksOnHour) {
      setMapLinks({});
      saveLinks({});
      toast("Hour rolled over – cleared stored links");
    }
  } else if (!atTop && processed) {
    setProcessed(false);
  }

  const toggleClaim = useCallback((n: number, val: boolean) => {
    setClaimed((prev) => {
      const next = new Set(prev);
      if (val) next.add(n);
      else next.delete(n);
      saveClaimed(next);
      return next;
    });
  }, []);

  // const nextUnclaimed = useMemo(() => {
  //   for (let i = 1; i <= 100; i++) if (!claimed.has(i)) return i;
  //   return null;
  // }, [claimed]);

  // const handleOpenNext = () => {
  //   if (!nextUnclaimed) return;
  //   const url =
  //     mapLinks[nextUnclaimed] ||
  //     (mapTemplate.includes("{num}")
  //       ? mapTemplate.replace("{num}", String(nextUnclaimed))
  //       : mapTemplate);
  //   window.open(url, "_blank", "noopener");
  // };

  // const handleAssign = (n: number, url: string) => {
  //   if (!isLikelyUrl(url)) return toast("Enter a valid URL");
  //   const next = { ...mapLinks, [n]: url };
  //   setMapLinks(next);
  //   saveLinks(next);
  //   toast(`Link set for #${n}`);
  // };
  // const handleClearLink = (n: number) => {
  //   const { [n]: _, ...rest } = mapLinks;
  //   setMapLinks(rest);
  //   saveLinks(rest);
  //   toast(`Link cleared for #${n}`);
  // };

  const handleExport = async () => {
    const payload = exportAll({
      claimed: [...claimed].sort((a, b) => a - b),
      mapTemplate,
      mapLinks,
      filterOnlyUnclaimed,
      autoClearLinksOnHour,
    });
    try {
      await navigator.clipboard.writeText(payload);
      toast("Exported to clipboard");
    } catch {
      downloadJson("pumpkins.json", payload);
    }
  };

  const handleImport = () => {
    const text = prompt(`Paste exported JSON, or contents of\n${CLAIMED_LINK}`);
    if (!text) return;
    const parsed = importAll(text);
    if (!parsed) return alert("Invalid JSON");
    const set = new Set(parsed.claimed);
    setClaimed(set);
    saveClaimed(set);
    setMapTemplate(parsed.mapTemplate);
    saveTemplate(parsed.mapTemplate);
    setMapLinks(parsed.mapLinks);
    saveLinks(parsed.mapLinks);
    setFilterOnlyUnclaimed(parsed.filterOnlyUnclaimed);
    saveFilter(parsed.filterOnlyUnclaimed);
    setAutoClearLinksOnHour(parsed.autoClearLinksOnHour);
    saveAutoClearLinks(parsed.autoClearLinksOnHour);
    toast("Import complete");
  };

  const handleClearAllChecks = () => {
    if (!confirm("Uncheck all pumpkins?")) return;
    const empty = new Set<number>();
    setClaimed(empty);
    saveClaimed(empty);
  };
  // const handleClearAllLinks = () => {
  //   if (!confirm("Clear all stored links?")) return;
  //   setMapLinks({});
  //   saveLinks({});
  // };

  const visibleNumbers = useMemo(() => {
    const arr: number[] = [];
    for (let i = 1; i <= 100; i++) {
      if (!filterOnlyUnclaimed || !claimed.has(i)) arr.push(i);
    }
    return arr;
  }, [claimed, filterOnlyUnclaimed]);

  // const getUrl = (n: number) => {
  //   if (mapLinks[n]) return mapLinks[n];
  //   return mapTemplate.includes("{num}")
  //     ? mapTemplate.replace("{num}", String(n))
  //     : mapTemplate;
  // };

  return (
    <div className="page">
      <header>
        <h1>🎃 Pumpkin Tracker</h1>
        <p className="sub">
          You can claim each number once. Pumpkins move every hour, on the hour.
        </p>
        <p>
          Copy your{" "}
          <a target="_blank" href={CLAIMED_LINK}>
            current list of claimed pumpkins
            <i className="fas fa-external-link"></i>
          </a>{" "}
          directly into the "Import" dialog to start filling out your grid!
        </p>
      </header>

      <section className="controls" aria-label="Controls">
        <label className="chip">
          <input
            type="checkbox"
            checked={filterOnlyUnclaimed}
            onChange={(e) => {
              setFilterOnlyUnclaimed(e.target.checked);
              saveFilter(e.target.checked);
            }}
          />{" "}
          Show unclaimed only
        </label>

        <div className="btnrow">
          <button className="btn" onClick={handleExport}>
            Export
          </button>
          <button className="btn" onClick={handleImport}>
            Import
          </button>
          <button className="btn" onClick={handleClearAllChecks}>
            Clear All Checks
          </button>
        </div>

        <div className="chip" title="Countdown until pumpkins move again">
          ⏳ Next move in <strong>{mmss}</strong>
        </div>
        <div className="progress" title="Claimed / Total">
          <div className="bar" aria-hidden="true">
            <span
              style={{ width: `${Math.round((claimedCount / 100) * 100)}%` }}
            />
          </div>
          <div>
            <strong>{claimedCount}</strong>/100
          </div>
        </div>
      </section>

      <PumpkinGrid
        numbers={visibleNumbers}
        claimed={claimed}
        onToggle={toggleClaim}
        large={large}
        // getUrl={getUrl}
        // onAssign={handleAssign}
        // onClearLink={handleClearLink}
      />
    </div>
  );
}

function toast(msg: string) {
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#111",
    border: "1px solid #333",
    padding: "8px 12px",
    borderRadius: "10px",
    color: "#ddd",
    zIndex: "9999",
  } as CSSStyleDeclaration);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1600);
}
