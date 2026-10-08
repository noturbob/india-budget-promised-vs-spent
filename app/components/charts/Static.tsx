// Charts with no client state: plain HTML/CSS so they reflow to any width.
// Every value is printed beside its mark, so the native title tooltip is a bonus, not a gate.
import { ACTUAL, MUTED, PLAN, UNDER } from "./format";

// Horizontal bars around a zero line. Positive = saffron, negative = green; the sign is also in the text.
// data-grow lets the Reveal wrapper grow each bar from the zero line when it scrolls into view.
export function Bars({ rows, fmt, label, signed = false, labelsAbove = false }: {
  rows: { label: string; value: number }[];
  fmt: (n: number) => string;
  label: string;
  signed?: boolean; // values are changes, so show "+"
  labelsAbove?: boolean; // for narrow columns: label on its own line, bar gets the full width
}) {
  const min = Math.min(0, ...rows.map((r) => r.value));
  const max = Math.max(0, ...rows.map((r) => r.value));
  const pct = (v: number) => (Math.abs(v) / (max - min)) * 100;
  const zero = pct(min);
  return (
    <div role="table" aria-label={label} className="flex flex-col gap-12 text-[14px]">
      {rows.map((r) => (
        <div role="row" key={r.label} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-12 gap-y-4 ${labelsAbove ? "" : "sm:grid-cols-[300px_minmax(0,1fr)_88px]"}`}>
          <span role="cell" className={`col-span-2 ${labelsAbove ? "" : "sm:col-span-1"}`}>{r.label}</span>
          <div className="relative h-[22px]" title={`${r.label}: ${fmt(r.value)}`}>
            <div className="absolute inset-y-0 w-px" style={{ left: `${zero}%`, background: "var(--hair)" }} />
            <div
              data-grow={r.value >= 0 ? "right" : "left"}
              className="absolute inset-y-[3px]"
              style={r.value >= 0
                ? { left: `${zero}%`, width: `${pct(r.value)}%`, background: ACTUAL, borderRadius: "0 3px 3px 0" }
                : { right: `${100 - zero}%`, width: `${pct(r.value)}%`, background: UNDER, borderRadius: "3px 0 0 3px" }}
            />
          </div>
          <span role="cell" className="num text-right font-medium">{signed && r.value > 0 ? "+" : ""}{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Columns over time with a few labelled values. `tone` picks a column's colour: "hi" (sienna,
// the bars the text is about), "base" (ink) or "dim" (context).
export function Columns({ rows, fmt, label, tone, labelled = [], height = 220, every = 5 }: {
  rows: { label: string; value: number }[];
  fmt: (n: number) => string;
  label: string;
  tone: (r: { label: string; value: number }, i: number) => "hi" | "base" | "dim";
  labelled?: string[]; // row labels whose value is printed above the column
  height?: number;
  every?: number; // print every nth x label
}) {
  const max = Math.max(...rows.map((r) => r.value));
  const step = max > 40 ? 20 : max > 16 ? 10 : 4;
  const top = Math.ceil(max / step) * step;
  const at = (i: number) => `${((i + 0.5) / rows.length) * 100}%`;
  const colour = { hi: ACTUAL, base: PLAN, dim: PLAN };
  const opacity = { hi: 1, base: 0.7, dim: 0.25 };
  return (
    <div className="pl-40" role="img" aria-label={label}>
      <div className="relative">
        {[1, 2, 3].map((k) => (k * top) / 4).map((g) => (
          <div key={g} className="absolute inset-x-0 border-t" style={{ bottom: `${(g / top) * 100}%`, borderColor: "var(--grid)" }}>
            <span className="absolute -left-40 -translate-y-1/2 text-[13px]" style={{ color: MUTED }}>{fmt(g)}</span>
          </div>
        ))}
        {rows.map((r, i) => labelled.includes(r.label) && (
          <span key={r.label} className="num absolute -translate-x-1/2 text-[13px] font-medium" style={{ left: at(i), bottom: `calc(${(r.value / top) * 100}% + 4px)` }}>
            {fmt(r.value)}
          </span>
        ))}
        <div className="relative flex items-end gap-[3px] border-b" style={{ height, borderColor: "var(--hair)" }}>
          {rows.map((r, i) => {
            const t = tone(r, i);
            return (
              <div key={r.label} data-grow="up" title={`${r.label}: ${fmt(r.value)}`} className="flex-1"
                style={{ height: `${(r.value / top) * 100}%`, background: colour[t], opacity: opacity[t], borderRadius: "3px 3px 0 0" }} />
            );
          })}
        </div>
      </div>
      <div className="relative mt-8 h-[20px] text-[13px]" style={{ color: MUTED }}>
        {rows.map((r, i) => (i % every === 0 || i === rows.length - 1) && (
          <span key={r.label} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: at(i) }}>{r.label}</span>
        ))}
      </div>
    </div>
  );
}

export type Step = { label: string; value: number; note?: string };

// Horizontal waterfall measured from the budget (0). Each step floats from the running total before
// it to the running total after it: green where spending or income came in under plan, saffron where
// it came in over. The last row is the net result. Pass the same `domain` to charts that are compared.
export function Waterfall({ steps, totalLabel, domain, fmt, tickFmt = fmt, label }: {
  steps: Step[];
  totalLabel: string;
  domain: [number, number];
  fmt: (n: number) => string;
  tickFmt?: (n: number) => string;
  label: string;
}) {
  const [lo, hi] = domain;
  const x = (v: number) => ((v - lo) / (hi - lo)) * 100;
  const rows: (Step & { start: number; end: number })[] = [];
  let cum = 0;
  for (const s of steps) {
    rows.push({ ...s, start: cum, end: cum + s.value });
    cum += s.value;
  }
  const ticks = [];
  const tickStep = (hi - lo) / ((hi - lo) / 1e5 <= 4 ? (hi - lo) / 1e5 : 3);
  for (let v = lo; v <= hi + 1; v += tickStep) ticks.push(v);
  // Fixed label and value columns, so two waterfalls stacked with the same domain line up exactly.
  const row = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-16 gap-y-4 sm:grid-cols-[300px_minmax(0,1fr)_96px]";

  return (
    <div role="table" aria-label={label} className="text-[14px]">
      {rows.map((r) => (
        <div role="row" key={r.label} className={`${row} border-b py-12`} style={{ borderColor: "var(--grid)" }}>
          <div role="cell" className="col-span-2 sm:col-span-1">
            <div className="leading-[1.3]">{r.label}</div>
            {r.note && <div className="mt-4 text-[12px] leading-[1.35] text-steel">{r.note}</div>}
          </div>
          <div className="relative h-[16px]" title={`${r.label}: ${fmt(r.value)}`}>
            <div className="absolute inset-y-[-12px] w-px" style={{ left: `${x(0)}%`, background: "var(--hair)" }} />
            <div data-grow={r.value < 0 ? "left" : "right"} className="absolute inset-y-0 rounded-[3px]"
              style={{ left: `${x(Math.min(r.start, r.end))}%`, width: `${Math.max(0.4, Math.abs(x(r.end) - x(r.start)))}%`, background: r.value < 0 ? UNDER : ACTUAL }} />
          </div>
          <span role="cell" className="num text-right font-medium">{r.value > 0 ? "+" : ""}{fmt(r.value)}</span>
        </div>
      ))}
      <div role="row" className={`${row} pt-16`}>
        <div role="cell" className="col-span-2 font-semibold sm:col-span-1">{totalLabel}</div>
        <div className="relative h-[20px]">
          <div data-grow="left" className="absolute inset-y-0 rounded-[3px] bg-almost-white"
            style={{ left: `${x(Math.min(0, cum))}%`, width: `${Math.abs(x(cum) - x(0))}%` }} />
        </div>
        <span role="cell" className="num text-right font-semibold">{fmt(cum)}</span>
      </div>
      <div className={`${row} mt-8`} aria-hidden>
        <span className="hidden sm:block" />
        <div className="relative col-span-2 h-[16px] sm:col-span-1">
          {ticks.map((t) => (
            <span key={t} className="num absolute whitespace-nowrap font-mono text-[11px] text-steel"
              style={{ left: `${x(t)}%`, transform: `translateX(${x(t) < 5 ? "0" : x(t) > 95 ? "-100%" : "-50%"})` }}>
              {Math.round(t) === 0 ? "budget" : tickFmt(t)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
