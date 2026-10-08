"use client";

import { useState } from "react";
import { LineChart } from "./charts/LineChart";
import { ACTUAL, PLAN, crore } from "./charts/format";

/**
 * Budgeted vs actual over time with a live readout beside it: totals for every year by default,
 * the hovered year while the crosshair is on the chart.
 */
export function ReadoutChart({ label, x, be, actual, actualName, gapName, caption }: {
  label: string;
  x: string[];
  be: number[];
  actual: number[];
  actualName: string;
  gapName: string;
  caption: string;
}) {
  const [i, setI] = useState<number | null>(null);
  const sum = (v: number[]) => v.reduce((t, n) => t + n, 0);
  const b = i === null ? sum(be) : be[i];
  const a = i === null ? sum(actual) : actual[i];
  const missed = be.filter((v, k) => actual[k] < v).length;

  return (
    <div className="grid gap-32 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <p className="mb-24 text-[14px] text-steel">{caption}</p>
        <LineChart label={label} x={x} onHover={setI} endLabels={false}
          series={[
            { name: "budgeted", color: PLAN, dashed: true, values: be },
            { name: actualName, color: ACTUAL, values: actual },
          ]} />
      </div>
      <div aria-live="polite" className="flex flex-col justify-center gap-24 border-t pt-24 lg:border-l lg:border-t-0 lg:pl-32 lg:pt-0" style={{ borderColor: "var(--hair)" }}>
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-steel">{i === null ? `All ${x.length} years` : x[i]}</p>
        <div>
          <p className="text-[13px] text-steel">Budgeted</p>
          <p className="num text-[32px] leading-[1.1] tight">{crore(b)}</p>
        </div>
        <div>
          <p className="text-[13px] text-steel">{actualName[0].toUpperCase() + actualName.slice(1)}</p>
          <p className="num text-[32px] leading-[1.1] tight text-saffron-mist">{crore(a)}</p>
        </div>
        <div className="border-t pt-16" style={{ borderColor: "var(--grid)" }}>
          <p className="text-[13px] text-steel">{b > a ? gapName : "More than budgeted"}</p>
          <p className="num text-[24px] leading-[1.1] tight">{crore(Math.abs(b - a))}</p>
          <p className="mt-8 text-[13px] text-steel">
            {i === null ? `Target missed in ${missed} of ${x.length} years.` : `${Math.round((a / b) * 100)}% of the target.`}
          </p>
        </div>
      </div>
    </div>
  );
}
