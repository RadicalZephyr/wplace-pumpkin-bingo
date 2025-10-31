import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Container, Sprite, Text } from "@pixi/react";
import * as PIXI from "pixi.js";

type Pump = {
  x: number;
  y: number;
  r: number; // angle
  scale: number;
  rot: number;
  alpha: number;
};

const easeInCubic = (t: number) => t * t * t;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function PumpkinCelebrate({
  onDone,
  durationMs = 3000,
  show,
}: {
  onDone?: () => void;
  durationMs?: number;
  show: boolean;
}) {
  const [tex, setTex] = useState<PIXI.Texture | null>(null);
  const pumpsRef = useRef<Pump[]>([]);
  const heroRef = useRef<{ shown: boolean }>(() => ({ shown: false })) as any;
  const startRef = useRef<number>(0);
  const [fade, setFade] = useState(0);
  const [done, setDone] = useState(false);

  // Load and rasterize SVG once (fastest as Texture)
  useEffect(() => {
    const loader = new PIXI.Assets();
    (async () => {
      const base = (await PIXI.Assets.load(
        "/wplace-pumpkin.svg",
      )) as PIXI.Texture;
      setTex(base);
    })();
  }, []);

  // Animation loop using Pixi Ticker
  useEffect(() => {
    if (!show || !tex || done) return;
    startRef.current = performance.now();
    pumpsRef.current = [];
    heroRef.current = { shown: false };
    setFade(0);

    const ticker = PIXI.Ticker.shared;
    const update = () => {
      const now = performance.now();
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const e = easeInCubic(t);

      // Spawn rate grows over time
      const spawnsThisFrame = Math.floor(lerp(3, 25, e)); // tweak
      const W = window.innerWidth,
        H = window.innerHeight;
      const Rmax = Math.hypot(W, H) * 0.6; // start near edges
      const spawnRadius = lerp(Rmax, 0, e);

      for (let i = 0; i < spawnsThisFrame; i++) {
        const angle = Math.random() * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * 40;
        const r = spawnRadius + jitter;
        const cx = W / 2,
          cy = H / 2;
        pumpsRef.current.push({
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          r: angle,
          scale: lerp(0.15, 0.6, Math.pow(Math.random() * e, 1.5)),
          rot: (Math.random() - 0.5) * 0.6,
          alpha: lerp(0.6, 1, e),
        });
        // Trim to a few thousand to avoid unbounded growth
        if (pumpsRef.current.length > 1800) pumpsRef.current.shift();
      }

      // Drop a hero pumpkin late in the timeline
      if (!heroRef.current.shown && t > 0.85) {
        heroRef.current.shown = true;
      }

      // Fade to black at the end
      if (t >= 1) {
        setFade((f) => {
          const nf = Math.min(1, f + 0.06);
          if (nf === 1 && !done) {
            setDone(true);
            onDone?.();
          }
          return nf;
        });
      }
    };
    ticker.add(update);
    return () => ticker.remove(update);
  }, [show, tex, durationMs, done, onDone]);

  const prefersReducedMotion = useMemo(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
    [],
  );

  if (!show || !tex) return null;

  const W = window.innerWidth,
    H = window.innerHeight;
  const heroSize = Math.min(W, H) * 0.9;

  return (
    <Stage
      width={W}
      height={H}
      options={{
        backgroundAlpha: 0,
        antialias: true,
        resolution: devicePixelRatio,
      }}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <Container>
        {!prefersReducedMotion &&
          pumpsRef.current.map((p, i) => (
            <Sprite
              key={i}
              texture={tex}
              x={p.x}
              y={p.y}
              anchor={0.5}
              rotation={p.rot}
              scale={p.scale}
              alpha={p.alpha}
            />
          ))}

        {/* Hero pumpkin */}
        {heroRef.current.shown && (
          <Sprite
            texture={tex}
            x={W / 2}
            y={H / 2}
            anchor={0.5}
            // quick pop/settle using CSS-ish cubic
            scale={0.001 + (heroRef.current.shown ? 1 : 0)}
            // Pixi can animate via a small ticker-driven state if you want bounce; keep simple here
            width={heroSize}
            height={heroSize}
          />
        )}

        {/* Fade to black */}
        <Sprite
          texture={PIXI.Texture.WHITE}
          x={0}
          y={0}
          width={W}
          height={H}
          alpha={fade}
          tint={0x000000}
        />

        {/* Spooky text after fade */}
        {fade > 0.7 && (
          <Text
            text={"Happy Halloween..."}
            x={W / 2}
            y={H / 2}
            anchor={0.5}
            style={
              new PIXI.TextStyle({
                fill: "#ff6a00",
                fontWeight: "900",
                fontSize: Math.min(120, Math.floor(W * 0.08)),
                dropShadow: true,
                dropShadowColor: "#000000",
                dropShadowBlur: 8,
                letterSpacing: 1.5,
                fontFamily: "Metal Mania, Creepster, serif", // include a spooky webfont if you want
              })
            }
          />
        )}
      </Container>
    </Stage>
  );
}
