import React from "react";

interface Props {
  n: number;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export default function PumpkinTile({ n, checked, onChange }: Props) {
  const toggle = () => onChange(!checked);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <button
      type="button"
      className={["tile", "tile-number", checked ? "claimed" : ""].join(" ")}
      onClick={toggle}
      onKeyDown={handleKey}
      aria-pressed={checked}
      aria-label={`Toggle pumpkin ${n}`}
    >
      <span className="num only-num">{String(n).padStart(2, "0")}</span>
    </button>
  );
}
