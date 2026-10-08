"use client";

import { useMemo, useState } from "react";
import { LineChart, useWidth } from "./charts/LineChart";
import { ACTUAL, MUTED, PLAN, UNDER, cr, crore, pct } from "./charts/format";

type Point = { fy: string; be: number; re: number; actual: number };
// under/over are summed year by year: a ministry that underspends one year and overspends the next
// has both gaps counted, matching the grand total, rather than letting them cancel out.
type Row = { name: string; be: number; actual: number; under: number; over: number };

const short = (m: string) => m.replace(/^Ministry of /, "").replace(/^Department of /, "Dept. of ");
const TOP = 10;
const OTHERS = "All other ministries";
// Interest, transfers to states and pensions would be ~40% of the picture and say nothing about programmes.
const EXCLUDED = "Ministry of Finance";

/**
 * Sankey of budget into spending. Left: what each ministry was budgeted, plus top-ups beyond budget.
 * Right: what each spent, plus the pool of money promised but never spent. Every ribbon is real money:
 * a ministry's budget flows to its own spending, and any part it didn't spend drains to the pool.
 */
export function MinistrySankey({ data, initial }: { data: Record<string, Point[]>; initial: string }) {
  const names = useMemo(() => Object.keys(data).sort((a, b) => short(a).localeCompare(short(b))), [data]);
  const years = useMemo(() => [...new Set(Object.values(data).flat().map((p) => p.fy))].sort(), [data]);
  const [year, setYear] = useState("all");
  const [selected, setSelected] = useState(initial);
  const [hover, setHover] = useState<string | null>(null);
  const [ref, w] = useWidth<HTMLDivElement>(720);

  const sumBy = (rs: Row[], k: keyof Omit<Row, "name">) => rs.reduce((t, r) => t + r[k], 0);
  const all: Row[] = names.filter((n) => n !== EXCLUDED).flatMap((name) => {
    const ps = year === "all" ? data[name] : data[name].filter((p) => p.fy === year);
    const row = {
      name,
      be: ps.reduce((t, p) => t + p.be, 0),
      actual: ps.reduce((t, p) => t + p.actual, 0),
      under: ps.reduce((t, p) => t + Math.max(0, p.be - p.actual), 0),
      over: ps.reduce((t, p) => t + Math.max(0, p.actual - p.be), 0),
    };
    return row.be > 0 ? [row] : [];
  }).sort((a, b) => b.be - a.be);
  const rest = all.slice(TOP);
  const rows: Row[] = [...all.slice(0, TOP),
    { name: OTHERS, be: sumBy(rest, "be"), actual: sumBy(rest, "actual"), under: sumBy(rest, "under"), over: sumBy(rest, "over") }];
  const flows = rows.map((r) => ({ ...r, own: r.be - r.under }));
  const totalOver = flows.reduce((t, f) => t + f.over, 0), totalUnder = flows.reduce((t, f) => t + f.under, 0);
  const totalBe = flows.reduce((t, f) => t + f.be, 0), totalActual = flows.reduce((t, f) => t + f.actual, 0);

  // Geometry. Both sides hold the same total: budgets + top-ups = spending + never spent.
  const narrow = w < 640;
  const labelW = narrow ? 104 : 210, nodeW = 10, gap = 8, H = narrow ? 560 : 640, minH = 3;
  const xa = labelW, xb = w - labelW - nodeW, xm = (xa + nodeW + xb) / 2;
  const n = rows.length + 1;
  const k = (H - gap * (n - 1) - minH * n) / (totalBe + totalOver);
  const size = (v: number) => minH + v * k;
  const stack = (vals: number[]) => {
    let y = 0;
    return vals.map((v) => { const top = y; y += size(v) + gap; return top; });
  };
  const leftY = stack([...flows.map((f) => f.be), totalOver]);
  const rightY = stack([...flows.map((f) => f.actual), totalUnder]);
  const ribbon = (y0: number, y1: number, v: number) => {
    const t = v * k;
    return `M${xa + nodeW},${y0}C${xm},${y0} ${xm},${y1} ${xb},${y1}L${xb},${y1 + t}C${xm},${y1 + t} ${xm},${y0 + t} ${xa + nodeW},${y0 + t}Z`;
  };
  let topupCursor = leftY[rows.length], poolCursor = rightY[rows.length];
  const lit = (name: string) => !hover || hover === name;
  const pick = (row: Row) => setSelected(row.name === OTHERS ? selected : row.name);

  const sel = data[selected];
  const selBe = sel.reduce((t, p) => t + p.be, 0), selActual = sel.reduce((t, p) => t + p.actual, 0);

  return (
    <div>
      <div className="flex flex-wrap gap-8" role="group" aria-label="Year">
        {["all", ...years].map((y) => (
          <button key={y} type="button" onClick={() => setYear(y)} aria-pressed={year === y}
            className={`rounded-full border px-16 py-8 font-mono text-[12px] transition-colors ${year === y ? "border-almost-white bg-almost-white text-near-black" : "border-almost-white/20 text-almost-white/70 hover:border-almost-white/50"}`}>
            {y === "all" ? "All years" : y}
          </button>
        ))}
      </div>
      <p className="mt-16 text-[14px] text-steel">
        {year === "all" ? `${years[0]} to ${years[years.length - 1]} combined` : year}: {crore(totalBe)} budgeted, {crore(totalActual)} spent.{" "}
        {crore(totalUnder)} was never spent; {crore(totalOver)} was spent beyond budgets. Finance Ministry (interest, transfers to states) left out.
      </p>

      <div className="mt-32 grid grid-cols-1 gap-32 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div ref={ref}>
          <svg viewBox={`0 0 ${w} ${H}`} width="100%" role="img" className="block select-none"
            aria-label={`Budget to spending by ministry. ${flows.map((f) => `${short(f.name)}: ${crore(f.be)} budgeted, ${crore(f.actual)} spent`).join("; ")}.`}
            onPointerLeave={() => setHover(null)}>
            {flows.map((f, i) => {
              const ownD = ribbon(leftY[i], rightY[i], f.own);
              const underD = f.under ? ribbon(leftY[i] + f.own * k, poolCursor, f.under) : null;
              const overD = f.over ? ribbon(topupCursor, rightY[i] + f.own * k, f.over) : null;
              if (f.under) poolCursor += f.under * k;
              if (f.over) topupCursor += f.over * k;
              const on = lit(f.name);
              const events = { onPointerEnter: () => setHover(f.name), onClick: () => pick(f), style: { cursor: "pointer", transition: "opacity 0.25s" } };
              return (
                <g key={f.name}>
                  <path d={ownD} fill="#f7f9fa" opacity={on ? (hover ? 0.32 : 0.13) : 0.04} {...events} />
                  {underD && <path d={underD} fill={UNDER} opacity={on ? (hover ? 0.95 : 0.65) : 0.08} {...events} />}
                  {overD && <path d={overD} fill={ACTUAL} opacity={on ? (hover ? 0.95 : 0.6) : 0.1} {...events} />}
                </g>
              );
            })}
            {flows.map((f, i) => (
              <g key={`n${f.name}`} opacity={lit(f.name) ? 1 : 0.35} style={{ transition: "opacity 0.25s" }}>
                <rect x={xa} y={leftY[i]} width={nodeW} height={size(f.be)} rx={2} fill="#f7f9fa" />
                <rect x={xb} y={rightY[i]} width={nodeW} height={size(f.actual)} rx={2} fill={f.actual > f.be ? ACTUAL : "#f7f9fa"} />
                <text x={xa - 10} y={leftY[i] + size(f.be) / 2} dy="0.32em" textAnchor="end" fontSize={narrow ? 10 : 12} fill="#f7f9fa">
                  {narrow ? short(f.name).slice(0, 16) : short(f.name).slice(0, 26)}
                  {!narrow && <tspan fill={MUTED}> {cr(f.be)}</tspan>}
                </text>
                <text x={xb + nodeW + 10} y={rightY[i] + size(f.actual) / 2} dy="0.32em" fontSize={narrow ? 10 : 12} fill="#f7f9fa" className="num">
                  {pct(f.actual / f.be)}<tspan fill={MUTED}> {narrow ? "" : `spent · ${cr(f.actual)}`}</tspan>
                </text>
              </g>
            ))}
            <rect x={xa} y={leftY[rows.length]} width={nodeW} height={size(totalOver)} rx={2} fill={ACTUAL} />
            <text x={xa - 10} y={leftY[rows.length] + size(totalOver) / 2} dy="0.32em" textAnchor="end" fontSize={narrow ? 10 : 12} fill="#ffc285">
              Beyond budget{!narrow && ` ${cr(totalOver)}`}
            </text>
            <rect x={xb} y={rightY[rows.length]} width={nodeW} height={size(totalUnder)} rx={2} fill={UNDER} />
            <text x={xb + nodeW + 10} y={rightY[rows.length] + size(totalUnder) / 2} dy="0.32em" fontSize={narrow ? 10 : 12} fill="#f7f9fa">
              Never spent<tspan fill={MUTED}>{!narrow && ` ${cr(totalUnder)}`}</tspan>
            </text>
          </svg>
          <div className="mt-12 flex flex-wrap gap-x-24 gap-y-8 text-[12px] text-steel">
            <span className="flex items-center gap-8"><span className="h-[10px] w-[18px] rounded-sm bg-almost-white/30" />budget that was spent</span>
            <span className="flex items-center gap-8"><span className="h-[10px] w-[18px] rounded-sm" style={{ background: UNDER }} />budget never spent</span>
            <span className="flex items-center gap-8"><span className="h-[10px] w-[18px] rounded-sm" style={{ background: ACTUAL }} />spent beyond budget</span>
          </div>
        </div>

        <div className="flex flex-col gap-24 self-start rounded-2xl border p-24 sm:p-32" style={{ borderColor: "var(--hair)", background: "rgba(247,249,250,0.03)" }}>
          <label className="flex flex-col gap-8 text-[13px] text-steel">
            Ministry (or click a ribbon)
            <select autoComplete="off" value={selected} onChange={(e) => setSelected(e.target.value)}
              className="h-[44px] rounded-lg border border-almost-white/60 px-12 text-[15px] text-almost-white">
              {names.map((nm) => <option key={nm} value={nm}>{short(nm)}</option>)}
            </select>
          </label>
          <div>
            <p className="num text-[48px] leading-none tight">{pct(selActual / selBe)}</p>
            <p className="mt-8 text-[14px] text-steel">
              of its budget spent, {sel[0].fy} to {sel[sel.length - 1].fy}: {crore(selActual)} of {crore(selBe)}
            </p>
          </div>
          <LineChart label={`${short(selected)}: budget vs actual spending by year`} height={220} endLabels={false}
            x={sel.map((p) => p.fy)}
            series={[
              { name: "budget", color: PLAN, dashed: true, values: sel.map((p) => p.be) },
              { name: "spent", color: ACTUAL, values: sel.map((p) => p.actual) },
            ]} />
          <details>
            <summary className="cursor-pointer text-[13px] text-almost-white/80">Show the numbers (₹ crore)</summary>
            <div className="mt-12 overflow-x-auto">
              <table className="ledger num">
                <thead><tr><th>Year</th><th>Budget</th><th>Revised</th><th>Spent</th><th>Spent ÷ budget</th></tr></thead>
                <tbody>
                  {sel.map((p) => (
                    <tr key={p.fy}>
                      <td>{p.fy}</td><td>{Math.round(p.be).toLocaleString("en-IN")}</td><td>{Math.round(p.re).toLocaleString("en-IN")}</td>
                      <td>{Math.round(p.actual).toLocaleString("en-IN")}</td><td>{p.be ? pct(p.actual / p.be) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
