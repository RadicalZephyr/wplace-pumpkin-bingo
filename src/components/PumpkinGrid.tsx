import PumpkinTile from "./PumpkinTile";

interface Props {
  numbers: number[];
  claimed: Set<number>;
  onToggle: (n: number, v: boolean) => void;
  large: boolean;
  // getUrl: (n: number) => string;
  // onAssign: (n: number, url: string) => void;
  // onClearLink: (n: number) => void;
}

export default function PumpkinGrid({
  numbers,
  claimed,
  onToggle,
  large,
  // getUrl,
  // onAssign,
  // onClearLink,
}: Props) {
  return (
    <div
      className={large ? "grid grid-10" : "grid grid-5"}
      role="grid"
      aria-label="Pumpkin grid"
    >
      {numbers.map((n) => (
        <PumpkinTile
          key={n}
          n={n}
          checked={claimed.has(n)}
          onChange={(v) => onToggle(n, v)}
          // showLinks={large}
          // url={getUrl(n)}
          // onAssign={onAssign}
          // onClearLink={onClearLink}
        />
      ))}
    </div>
  );
}
