import { useEffect, useRef, useState } from "react";

export function useInterval(callback: () => void, delay: number) {
  const saved = useRef(callback);
  useEffect(() => void (saved.current = callback), [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function useCountdownToTopOfHour() {
  const [mmss, setMmss] = useState("--:--");
  const [atTop, setAtTop] = useState(false);

  const tick = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(60, 0, 0);
    const ms = nextHour.getTime() - now.getTime();
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    setMmss(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    setAtTop(m === 0 && s === 0);
  };

  useInterval(tick, 250);
  return { mmss, atTop };
}

export function useMedia(query: string) {
  const [matches, setMatches] = useState<boolean>(
    () => matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
