import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import PumpkinWave from "./components/PumpkinWave.tsx";

function downloadJson(filename: string, payload: string) {
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type AlarmOption = "visual" | "audible" | "alert";

type AlarmState = {
  active: boolean;
  minutes: number;
  visual: boolean;
  audible: boolean;
  alert: boolean;
  triggered: boolean;
};

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
  const { mmss, atTop, msUntilNextHour } = useCountdownToTopOfHour();
  const claimedCount = claimed.size;
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedAll, setCelebratedAll] = useState(false);
  const [alarm, setAlarm] = useState<AlarmState>({
    active: false,
    minutes: 5,
    visual: true,
    audible: true,
    alert: true,
    triggered: false,
  });
  const [showAlarmPopover, setShowAlarmPopover] = useState(false);
  const [visualOverlayActive, setVisualOverlayActive] = useState(false);
  const notificationsAvailable =
    typeof window !== "undefined" && "Notification" in window;
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationPermission>(() =>
      notificationsAvailable ? Notification.permission : "denied",
    );
  const audioContextRef = useRef<AudioContext | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const alarmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (claimedCount === 100 && !showCelebration && !celebratedAll) {
      setShowCelebration(true);
      setCelebratedAll(true);
    } else if (claimedCount < 100 && celebratedAll && !showCelebration) {
      setCelebratedAll(false);
    }
  }, [claimedCount, celebratedAll, showCelebration]);

  useEffect(() => {
    if (!showAlarmPopover) return;
    const handleClick = (event: MouseEvent) => {
      if (
        popoverRef.current?.contains(event.target as Node) ||
        alarmButtonRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setShowAlarmPopover(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAlarmPopover]);

  useEffect(() => {
    return () => {
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().catch(() => {
          /* ignore */
        });
      }
    };
  }, []);

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

  const ensureAudioContext = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }
  }, []);

  const playCackle = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const duration = 2.6;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const envelope = Math.min(1, t * 3) * Math.exp(-2.2 * t);
      const wobble =
        Math.sin(2 * Math.PI * 7 * t) + Math.sin(2 * Math.PI * 11 * t);
      const shriek = Math.sin(
        2 * Math.PI * (220 + 40 * Math.sin(2 * Math.PI * 4 * t)) * t,
      );
      const burst =
        Math.sin(2 * Math.PI * 620 * ((t * 4) % 0.25)) *
        (Math.floor((t * 8) % 2) === 0 ? 0.6 : 0.2);
      const noise = (Math.random() * 2 - 1) * 0.25;
      data[i] =
        envelope * (0.45 * wobble + 0.35 * shriek + 0.2 * burst + noise);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  }, []);

  const ensureNotificationPermission = useCallback(async () => {
    if (!notificationsAvailable) return false;
    if (Notification.permission === "granted") {
      setNotificationStatus("granted");
      return true;
    }
    const result = await Notification.requestPermission();
    setNotificationStatus(result);
    return result === "granted";
  }, [notificationsAvailable]);

  const sendNotification = useCallback(() => {
    if (!notificationsAvailable) return;
    if (notificationStatus !== "granted") return;
    new Notification("It's time to check for Placekins!", {
      icon: "/wplace-pumpkin.svg",
    });
  }, [notificationStatus, notificationsAvailable]);

  const handleSetAlarm = useCallback(
    async (minutes: number) => {
      ensureAudioContext();
      if (notificationsAvailable) {
        const granted = await ensureNotificationPermission();
        if (!granted) {
          toast("Enable browser notifications to receive alerts");
        }
      }
      setAlarm((prev) => ({
        ...prev,
        minutes,
        active: true,
        triggered: false,
      }));
      setVisualOverlayActive(false);
      setShowAlarmPopover(false);
      toast(
        `Wave end timer set for ${minutes} minute${minutes === 1 ? "" : "s"} before the hour`,
      );
    },
    [ensureAudioContext, ensureNotificationPermission, notificationsAvailable],
  );

  const handleToggleIndicator = useCallback((option: AlarmOption) => {
    let shouldDisableOverlay = false;
    setAlarm((prev) => {
      const next = { ...prev, [option]: !prev[option] } as AlarmState;
      if (option === "visual" && !next.visual) {
        shouldDisableOverlay = true;
      }
      return next;
    });
    if (shouldDisableOverlay) {
      setVisualOverlayActive(false);
    }
  }, []);

  const handleClearAlarm = useCallback(() => {
    setAlarm((prev) => ({ ...prev, active: false, triggered: false }));
    setVisualOverlayActive(false);
    setShowAlarmPopover(false);
  }, []);

  useEffect(() => {
    const { active, minutes, triggered, visual, audible, alert } = alarm;
    if (!active) {
      if (visualOverlayActive) setVisualOverlayActive(false);
      return;
    }
    const threshold = minutes * 60000;
    if (msUntilNextHour <= threshold && !triggered) {
      setAlarm((prev) => ({ ...prev, triggered: true }));
      if (visual) {
        setVisualOverlayActive(true);
      }
      if (audible) {
        playCackle();
      }
      if (alert) {
        if (!notificationsAvailable) {
          toast("Desktop notifications are not supported in this browser");
        } else if (notificationStatus === "denied") {
          toast("Desktop notifications are blocked for this site");
        } else {
          sendNotification();
        }
      }
    } else if (msUntilNextHour > threshold && triggered) {
      setAlarm((prev) => ({ ...prev, triggered: false }));
      if (visualOverlayActive) {
        setVisualOverlayActive(false);
      }
    }
  }, [
    alarm,
    msUntilNextHour,
    notificationStatus,
    notificationsAvailable,
    playCackle,
    sendNotification,
    visualOverlayActive,
  ]);

  useEffect(() => {
    if (!visualOverlayActive) return;
    const stopOverlay = () => {
      setVisualOverlayActive(false);
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown"]; // capture taps/clicks/keys
    events.forEach((event) => window.addEventListener(event, stopOverlay));
    return () => {
      events.forEach((event) => window.removeEventListener(event, stopOverlay));
    };
  }, [visualOverlayActive]);

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
        <h1>
          <img src="wplace-pumpkin.svg" alt="Placekin" /> Placekin Bingo Tracker
        </h1>
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

        <div className="alarm-wrapper">
          <div
            className="chip countdown-chip"
            title="Countdown until pumpkins move again"
          >
            <span>
              ⏳ Next move in <strong>{mmss}</strong>
            </span>
            <div className="alarm-actions">
              <button
                type="button"
                className={`icon-btn alarm-btn${alarm.active ? " alarm-active" : ""}`}
                onClick={() => setShowAlarmPopover((prev) => !prev)}
                aria-haspopup="dialog"
                aria-expanded={showAlarmPopover}
                title="Set a wave end timer"
                ref={alarmButtonRef}
              >
                <i className="fa-solid fa-alarm-clock" aria-hidden="true"></i>
                <span className="sr-only">Configure wave end timer</span>
              </button>
              {alarm.active && (
                <span className="alarm-summary">
                  notify at -{alarm.minutes} minutes
                </span>
              )}
            </div>
          </div>
          {showAlarmPopover && (
            <div
              className="alarm-popover"
              role="dialog"
              aria-label="Wave end timer options"
              ref={popoverRef}
            >
              <p className="alarm-title">
                Set a wave end timer to get notified before pumpkins move.
              </p>
              <div
                className="alarm-choices"
                role="group"
                aria-label="Minutes before the hour"
              >
                {[5, 10, 15].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    className={`alarm-choice${
                      alarm.minutes === minutes && alarm.active
                        ? " selected"
                        : ""
                    }`}
                    onClick={() => void handleSetAlarm(minutes)}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
              <div
                className="alarm-toggle-group"
                role="group"
                aria-label="Alarm indicators"
              >
                <button
                  type="button"
                  className={`alarm-toggle${alarm.visual ? " active" : ""}`}
                  onClick={() => handleToggleIndicator("visual")}
                  aria-pressed={alarm.visual}
                >
                  <i className="fa-solid fa-eye" aria-hidden="true"></i>
                  Visual indicator
                </button>
                <button
                  type="button"
                  className={`alarm-toggle${alarm.audible ? " active" : ""}`}
                  onClick={() => handleToggleIndicator("audible")}
                  aria-pressed={alarm.audible}
                >
                  <i className="fa-solid fa-volume-high" aria-hidden="true"></i>
                  Audible indicator
                </button>
                <button
                  type="button"
                  className={`alarm-toggle${alarm.alert ? " active" : ""}`}
                  onClick={() => handleToggleIndicator("alert")}
                  aria-pressed={alarm.alert}
                >
                  <i className="fa-solid fa-bell" aria-hidden="true"></i>
                  Alert
                </button>
              </div>
              {!notificationsAvailable && (
                <p className="alarm-note">
                  Your browser does not support desktop notifications.
                </p>
              )}
              {notificationsAvailable && notificationStatus === "denied" && (
                <p className="alarm-note">
                  Notifications are blocked. Update your browser settings to
                  allow alerts.
                </p>
              )}
              <div className="alarm-footer">
                <button
                  type="button"
                  className="alarm-clear"
                  onClick={handleClearAlarm}
                >
                  <i className="fa-solid fa-ban" aria-hidden="true"></i>
                  Clear timer
                </button>
              </div>
            </div>
          )}
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

      <footer className="footer">
        Made by{" "}
        <a target="_blank" href="https://github.com/RadicalZephyr/">
          @RadicalZephyr
        </a>
        <br />
        Contribute on{" "}
        <a
          target="_blank"
          href="https://github.com/RadicalZephyr/wplace-pumpkin-bingo"
        >
          <i className="fa-brands fa-github"></i> Github
        </a>
      </footer>

      <PumpkinWave
        active={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
      <div
        className={`alarm-overlay${visualOverlayActive ? " show" : ""}`}
        aria-hidden="true"
      ></div>
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
