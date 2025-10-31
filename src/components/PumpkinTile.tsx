import { useState } from "react";

interface Props {
  n: number;
  checked: boolean;
  onChange: (v: boolean) => void;
  showLinks: boolean;
  url: string;
  onAssign: (n: number, url: string) => void;
  onClearLink: (n: number) => void;
}

export default function PumpkinTile({
  n,
  checked,
  onChange,
  showLinks,
  url,
  onAssign,
  onClearLink,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  return (
    <div className={["tile", checked ? "claimed" : ""].join(" ")}>
      <input
        id={`pumpkin-${n}`}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={`Claim pumpkin ${n}`}
      />

      {showLinks && (
        <a
          className="map-link"
          href={url}
          target="_blank"
          rel="noopener"
          title={`Open map for pumpkin #${n}`}
        >
          <i className="fa-solid fa-map-location-dot" />
        </a>
      )}

      {showLinks && (
        <button
          className="edit-link"
          type="button"
          title="Assign specific wplace link"
          onClick={() => setEditing((s) => !s)}
        >
          <i className="fa-solid fa-pen" />
        </button>
      )}

      {showLinks && editing && (
        <div className="edit-pop">
          <input
            className="text"
            placeholder="Paste https://wplace.live/?lat=…&lng=…&zoom=14"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button
            className="btn"
            onClick={() => {
              onAssign(n, value);
              setEditing(false);
              setValue("");
            }}
          >
            Assign
          </button>
          <button
            className="btn"
            onClick={() => {
              onClearLink(n);
              setEditing(false);
            }}
          >
            Clear
          </button>
        </div>
      )}

      <span className="num">{String(n).padStart(2, "0")}</span>
    </div>
  );
}
