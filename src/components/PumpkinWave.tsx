import { useEffect, useMemo, useState } from "react";

type Phase = "idle" | "pumpkins" | "blackout" | "message";

interface PumpkinParticle {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startSize: number;
  endSize: number;
  delay: number;
}

interface PumpkinWaveProps {
  active: boolean;
  onComplete?: () => void;
}

const PARTICLE_COUNT = 28;
const RUN_DURATION_MS = 6200;
const MOVE_DURATION_SECONDS = 3.1;

function createPumpkins(count: number): PumpkinParticle[] {
  const pumpkins: PumpkinParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const startRadius = 52 + Math.random() * 8; // around the edges
    const endRadius = 6 + Math.random() * 10; // toward the center
    const delay = (i / count) * 0.8 + Math.random() * 0.6;
    const startSize = 4 + Math.random() * 3; // vmin units
    const growthBoost = 1 + delay * 0.6;
    const endSize = startSize * (2.4 + Math.random() * 0.6) * growthBoost;

    pumpkins.push({
      id: i,
      startX: 50 + Math.cos(angle) * startRadius,
      startY: 50 + Math.sin(angle) * startRadius,
      endX: 50 + Math.cos(angle) * endRadius,
      endY: 50 + Math.sin(angle) * endRadius,
      startSize,
      endSize,
      delay,
    });
  }

  pumpkins.sort((a, b) => a.delay - b.delay);
  return pumpkins;
}

export default function PumpkinWave({ active, onComplete }: PumpkinWaveProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [animatePumpkins, setAnimatePumpkins] = useState(false);
  const [centerVisible, setCenterVisible] = useState(false);
  const [centerReveal, setCenterReveal] = useState(false);

  const pumpkins = useMemo(
    () => (active ? createPumpkins(PARTICLE_COUNT) : []),
    [active],
  );

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      setAnimatePumpkins(false);
      setCenterVisible(false);
      setCenterReveal(false);
      return;
    }

    setPhase("pumpkins");
    setAnimatePumpkins(false);
    setCenterVisible(false);
    setCenterReveal(false);

    const startRaf = requestAnimationFrame(() => setAnimatePumpkins(true));
    const centerTimer = window.setTimeout(() => {
      setCenterVisible(true);
      requestAnimationFrame(() => setCenterReveal(true));
    }, 1800);
    const blackoutTimer = window.setTimeout(() => setPhase("blackout"), 3300);
    const messageTimer = window.setTimeout(() => setPhase("message"), 4000);
    const doneTimer = window.setTimeout(() => {
      onComplete?.();
    }, RUN_DURATION_MS);

    return () => {
      cancelAnimationFrame(startRaf);
      window.clearTimeout(centerTimer);
      window.clearTimeout(blackoutTimer);
      window.clearTimeout(messageTimer);
      window.clearTimeout(doneTimer);
    };
  }, [active, onComplete]);

  if (!active) return null;

  const centerClassName = [
    "pumpkin-wave-center",
    centerReveal ? "reveal" : "",
    phase !== "pumpkins" ? "fade-out" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`pumpkin-wave-overlay phase-${phase}`}>
      <div className="pumpkin-wave-particles">
        {pumpkins.map((pumpkin) => {
          const top = (animatePumpkins ? pumpkin.endY : pumpkin.startY).toFixed(2);
          const left = (animatePumpkins ? pumpkin.endX : pumpkin.startX).toFixed(2);
          const size = (
            animatePumpkins ? pumpkin.endSize : pumpkin.startSize
          ).toFixed(2);

          const opacity = phase === "pumpkins" && animatePumpkins ? 1 : 0;
          const transition = `top ${MOVE_DURATION_SECONDS}s cubic-bezier(0.33, 1, 0.68, 1) ${pumpkin.delay}s, ` +
            `left ${MOVE_DURATION_SECONDS}s cubic-bezier(0.33, 1, 0.68, 1) ${pumpkin.delay}s, ` +
            `width ${MOVE_DURATION_SECONDS}s cubic-bezier(0.33, 1, 0.68, 1) ${pumpkin.delay}s, ` +
            `opacity 0.8s ease ${phase === "pumpkins" ? pumpkin.delay : 0}s`;

          return (
            <img
              key={pumpkin.id}
              src="/wplace-pumpkin.svg"
              alt=""
              className="pumpkin-wave-pumpkin"
              style={{
                top: `${top}vh`,
                left: `${left}vw`,
                width: `${size}vmin`,
                opacity,
                transition,
              }}
            />
          );
        })}
      </div>

      {centerVisible && (
        <img src="/wplace-pumpkin.svg" alt="" className={centerClassName} />
      )}

      <div
        className={`pumpkin-wave-message${phase === "message" ? " visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        Happy Halloween...
      </div>
    </div>
  );
}
