/** Progress bar. Replaces the hand-rolled `<div><i style={{ width }} /></div>`
 *  pairs, which were invisible to assistive tech and clamped nothing. */
export function Meter({ value, label, className }: { value: number; label: string; className?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={["meter", className ?? ""].filter(Boolean).join(" ")}
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}
