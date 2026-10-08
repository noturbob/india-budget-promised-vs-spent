import type { ReactNode } from "react";
import story from "@/data/story.json";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { StampRows } from "@/components/StampRows";
import { GapLine } from "@/components/GapLine";
import { GovStepper, type Gov } from "@/components/GovStepper";
import { Waffle } from "@/components/Waffle";
import { MinistrySankey } from "@/components/MinistrySankey";
import { ReadoutChart } from "@/components/ReadoutChart";
import { GrandTotal } from "@/components/GrandTotal";
import { TallyFooter } from "@/components/TallyFooter";
import { ChapterNav } from "@/components/ChapterNav";
import { Reveal } from "@/components/motion/Reveal";
import { Bars, Columns, Waterfall } from "@/components/charts/Static";
import { cr, crore, pct } from "@/components/charts/format";

type Est = { be: number | null; re: number | null; actual: number | null };
type Year = { fy: string; government: string } & Record<string, Est>;
const macro = story.macro as unknown as Year[];
const done = macro.filter((y) => y.total_expenditure.actual);
const dev = (y: Year, m: string) => y[m].actual! / y[m].be! - 1;
const current = macro[macro.length - 1];

// Finance Ministers who presented each government's full budgets in this period.
const FM: Record<string, string> = {
  "UPA-1": "P. Chidambaram",
  "UPA-2": "Pranab Mukherjee and P. Chidambaram",
  "NDA-1": "Arun Jaitley",
  "NDA-2": "Nirmala Sitharaman",
  "NDA-3": "Nirmala Sitharaman",
};

function Chapter({ id, stamp, title, intro, children }: { id: string; stamp: string; title: ReactNode; intro?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-label={stamp} className="flex min-h-[100svh] items-center py-128">
      <div className="mx-auto w-full max-w-[1200px] px-16 sm:px-32">
        <Reveal>
          <p className="stamp text-[13px] text-steel">{stamp}</p>
          <h2 className="mt-12 max-w-[860px] text-[36px] font-semibold leading-[1.05] tight sm:text-[56px]">{title}</h2>
          {intro && <div className="prose-col mt-20 text-[18px] font-light leading-[1.6] text-almost-white/80">{intro}</div>}
        </Reveal>
        <div className="mt-48">{children}</div>
      </div>
    </section>
  );
}

const Card = ({ children }: { children: ReactNode }) => (
  <Reveal className="rounded-2xl border p-24 sm:p-40" style={{ borderColor: "var(--hair)" }}>{children}</Reveal>
);

// Budget vs spent per year as pairs of thin columns (outlined = budget, solid = spent).
function PairBars({ series, label, tint = "#f7f9fa" }: { series: { fy: string; be: number; actual: number }[]; label: string; tint?: string }) {
  const max = Math.max(...series.flatMap((x) => [x.be, x.actual]));
  return (
    <div className="mt-24">
      <div className="flex h-[96px] items-end gap-[6px]" role="img" aria-label={`${label}: ${series.map((x) => `${x.fy} ${crore(x.be)} budgeted, ${crore(x.actual)} spent`).join("; ")}`}>
        {series.map((x) => (
          <div key={x.fy} className="flex h-full flex-1 items-end gap-[2px]" title={`${x.fy}: ${crore(x.be)} budgeted, ${crore(x.actual)} spent`}>
            <div data-grow="up" className="flex-1 rounded-t-[2px] border border-b-0" style={{ height: `${(x.be / max) * 100}%`, borderColor: tint, opacity: 0.6 }} />
            <div data-grow="up" className="flex-1 rounded-t-[2px]" style={{ height: `${(x.actual / max) * 100}%`, background: tint }} />
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-between font-mono text-[11px]" style={{ color: tint, opacity: 0.7 }}>
        <span>{series[0].fy}</span>
        <span className="flex items-center gap-12">
          <span className="flex items-center gap-4"><span className="inline-block h-[8px] w-[8px] border" style={{ borderColor: tint }} />budget</span>
          <span className="flex items-center gap-4"><span className="inline-block h-[8px] w-[8px]" style={{ background: tint }} />spent</span>
        </span>
        <span>{series[series.length - 1].fy}</span>
      </div>
    </div>
  );
}

const Caption = ({ children }: { children: ReactNode }) => <p className="mb-24 text-[14px] text-steel">{children}</p>;
const I = ({ children }: { children: ReactNode }) => <span className="display font-normal">{children}</span>;

export default function Home() {
  // Chapter: the gap
  const points = done.map((y) => ({ fy: y.fy, dev: dev(y, "total_expenditure"), gov: y.government }));
  const within5 = points.filter((p) => Math.abs(p.dev) <= 0.05).length;
  const p = (fy: string) => points.find((x) => x.fy === fy)!;
  const notes = [
    { fy: "2008-09", title: pct(p("2008-09").dev, true), text: "Global financial crisis: stimulus, farm-loan waiver, pay commission." },
    { fy: "2020-21", title: pct(p("2020-21").dev, true), text: "COVID: free food grains, health and relief spending." },
  ];

  // Chapter: capex
  const capex = done.map((y) => ({ label: y.fy, value: dev(y, "capital_expenditure") }));
  const capexShort = capex.filter((c) => c.value < -0.02).length;
  const capexNow = current.capital_expenditure.be!;

  // Chapter: disinvestment
  const dis = done.filter((y) => y.other_receipts.be);
  const disMissed = dis.filter((y) => y.other_receipts.actual! < y.other_receipts.be!).length;
  const disBe = dis.reduce((t, y) => t + y.other_receipts.be!, 0);
  const disActual = dis.reduce((t, y) => t + y.other_receipts.actual!, 0);

  // Chapter: governments
  const govs: Gov[] = Object.entries(story.terms).map(([id, t]) => ({
    id,
    years: t.years.length > 1 ? `${t.years[0]} to ${t.years[t.years.length - 1]}` : t.years[0],
    fm: FM[id],
    rows: [
      { label: "Total spending vs budget", value: pct(t.total_median_dev, true) },
      { label: "Capital spending vs budget", value: pct(t.capex_median_dev, true) },
      { label: "Tax revenue vs budget", value: pct(t.tax_median_dev, true) },
      { label: "Fiscal deficit vs budget", value: pct(t.fiscal_deficit_median_dev, true) },
    ],
    counts: [
      ...(t.years.length === 1
        ? [`Only one year with audited actuals so far. Capital spending ${t.capex_short_years ? "fell short of" : "met"} its budget, and the disinvestment target was ${t.disinvestment_missed_years ? "missed" : "met"}: ${crore(t.disinvestment_actual)} raised against ${crore(t.disinvestment_be)}.`]
        : [`Capital spending fell short of its budget in ${t.capex_short_years} of ${t.years.length} years.`,
           `Disinvestment target missed in ${t.disinvestment_missed_years} of ${t.years.length} years: ${crore(t.disinvestment_actual)} raised against ${crore(t.disinvestment_be)} targeted.`]),
    ],
  }));

  // Chapter: ministries
  const mYears = `${story.explorer["Ministry of Rural Development"][0].fy} to ${story.explorer["Ministry of Rural Development"].at(-1)!.fy}`;

  // Chapter: schemes
  const flag = story.flagships;
  const jjmAll = flag.find((f) => f.name.startsWith("Jal Jeevan"))!;
  const jjm = jjmAll.series.find((x) => x.fy === "2024-25")!;
  const mg = flag.find((f) => f.name.startsWith("MGNREGA"))!;
  const under75 = story.schemes.per_year;
  const before = under75.filter((y) => y.fy < "2020-21");
  const after = under75.filter((y) => y.fy > "2020-21");
  const avg = (ys: typeof under75) => ys.reduce((t, y) => t + y.under75, 0) / ys.length;
  const covid = under75.find((y) => y.fy === "2020-21")!;

  // Chapter: where every ₹100 goes
  const NOTES: Record<string, string> = {
    "Interest on past borrowing": "More than a quarter of the budget pays interest on money borrowed in earlier years, before a single new road or school.",
    "Defence": "Salaries, equipment and pensions for the armed forces.",
    "Roads and railways": "The biggest share of the government's own investment: highways and rail lines.",
    "Transfers to states": "Grants to states and union territories. Their share of taxes comes on top and isn't counted as Union spending.",
    "Food and fertiliser subsidies": "Free grain under the food security law, and cheap fertiliser for farmers.",
    "Rural development and farming": "MGNREGA, rural housing and roads, PM-Kisan, crop insurance.",
    "Police and home affairs": "Central police forces, border guarding and union territories.",
    "Health and education": "Hospitals, health missions, schools and universities.",
    "Pensions": "Civilian government pensions. Defence pensions sit under defence.",
    "Everything else": "Every other ministry and department combined.",
  };
  const alloc = story.allocation;
  const cats = alloc.categories.map((c) => ({ ...c, note: NOTES[c.name] }));

  // Finale: the grand total
  const g = story.grand;
  const bill = (a: number, b: number) => `${a > b ? "+" : "−"}${crore(Math.abs(a - b))}`;

  // Chapter: where the last audited year's gap went
  const wf = story.waterfall;
  const PLAIN: Record<string, string> = {
    "Department of Drinking Water and Sanitation": "Rural tap water and sanitation",
    "Interest Payments": "Interest on government debt",
    "Ministry of Housing and Urban Affairs": "Urban housing and cities",
    "Department of Economic Affairs": "Department of Economic Affairs",
    "Transfers to States": "Grants to states",
    "Ministry of Micro, Small and Medium Enterprises": "Small businesses (MSME)",
    "Capital Outlay on Defence Services": "Defence equipment",
    "Ministry of Labour and Employment": "Labour and employment",
    "Ministry of Road Transport and Highways": "Roads and highways",
    "Department of Fertilisers": "Fertiliser subsidy",
    "Defence Pensions": "Defence pensions",
  };
  const schemeName = (n: string) => n.replace(/\s*\/.*$/, "").replace(/\s*\((?:JJM|PMAY-U)\)/, "");
  const spendSteps = wf.spending.map((x) => ({
    label: PLAIN[x.demand] ?? x.demand.replace(/^Ministry of /, ""),
    value: x.value,
    note: x.why ? `${schemeName(x.why.scheme)}: ${crore(x.why.be)} budgeted, ${crore(x.why.actual)} spent` : undefined,
  }));
  const fundSteps = wf.funding.map((x) => ({ label: x.demand, value: x.value }));
  let run = 0, lowest = 0;
  for (const x of wf.spending) {
    run += x.value;
    lowest = Math.min(lowest, run);
  }
  const domain: [number, number] = [Math.floor(lowest / 1e5) * 1e5, 0];
  const num = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(Math.round(v)).toLocaleString("en-IN")}`;
  const income = wf.funding.slice(0, 3).reduce((t, x) => t + x.value, 0);
  const gapOf = (i: number) => wf.spending[i].why!.be - wf.spending[i].why!.actual; // the named scheme's own shortfall
  const borrowing = wf.funding[3].value;

  // Chapter: limits
  const pub = story.publicity.series.at(-1)!;
  const fertReserve = wf.spending.find((x) => x.demand === "Department of Fertilisers")?.why?.actual ?? 0;
  const food = flag.find((f) => f.name === "Food subsidy")!.series;
  const foodPre = food.filter((x) => x.fy < "2020-21").map((x) => x.actual / x.be);
  const [foodLow, foodHigh] = [Math.min(...foodPre), Math.max(...foodPre)];
  const foodCovid = food.find((x) => x.fy === "2020-21")!.actual / food.find((x) => x.fy === "2020-21")!.be;

  const stops = [
    { id: "gap", stamp: "The gap", note: "Twenty years of budget vs actual spending" },
    { id: "capex", stamp: "Capex", note: "What gets cut when money runs short" },
    { id: "disinvestment", stamp: "Disinvestment", note: "The target that is almost never met" },
    { id: "governments", stamp: "Governments", note: "UPA-1 to NDA-3, one yardstick" },
    { id: "allocation", stamp: "Every ₹100", note: "Where this year's budget goes" },
    { id: "ministries", stamp: "Ministries", note: "Every ministry on one chart" },
    { id: "schemes", stamp: "Schemes", note: "The flagships on the posters" },
    { id: "trend", stamp: "The trend", note: "Underspending since COVID" },
    { id: "total", stamp: "The bill", note: "Everything, added up" },
    { id: "where", stamp: "The gap, traced", note: "Where last year's shortfall went" },
    { id: "limits", stamp: "The limits", note: "What a budget can and can't tell you" },
  ];

  return (
    <>
      <Nav />
      <main>
        <span data-chapter="Promised vs Spent" className="block" aria-hidden />
        <Hero budget={{ fy: current.fy, promised: crore(current.total_expenditure.be!) }}
          last={{ fy: done.at(-1)!.fy, promised: crore(done.at(-1)!.total_expenditure.be!), spent: crore(done.at(-1)!.total_expenditure.actual!),
            diff: bill(done.at(-1)!.total_expenditure.actual!, done.at(-1)!.total_expenditure.be!) }} />

        <section id="contents" data-chapter="Contents" aria-label="Contents" className="flex min-h-[100svh] items-center py-128">
          <div className="mx-auto w-full max-w-[1200px] px-16 sm:px-32">
            <Reveal>
              <p className="stamp text-[13px] text-steel">Contents</p>
              <h2 className="mt-12 text-[36px] font-semibold leading-[1.05] tight sm:text-[56px]">Eleven line items, <I>one question.</I></h2>
            </Reveal>
            <div className="mt-48"><StampRows stops={stops} /></div>
          </div>
        </section>

        <div data-chapter="The gap"><GapLine points={points} notes={notes} /></div>
        <div className="mx-auto max-w-[1200px] px-16 py-96 sm:px-32">
          <Reveal className="prose-col text-[24px] font-light leading-[1.45]">
            In {within5} of {points.length} years, spending landed within 5% of the budget. The two big misses were emergencies,
            not slips. The real story is <I>inside</I> the total: what gets cut, what never arrives, and who spends what they&apos;re given.
          </Reveal>
        </div>

        <div data-chapter="Capex">
          <Chapter id="capex" stamp="Capital spending" title={<>The first thing cut is the <I>future.</I></>}
            intro={<>Capital spending builds roads, railways and power lines. When revenue falls short mid-year, it is the easiest bill to
              postpone. It came in below budget in {capexShort} of {capex.length} years, worst from 2012-13 to 2014-15. Since then it has
              grown to {crore(capexNow)} in the {current.fy} budget, and mostly gets spent.</>}>
            <Card>
              <Caption>Actual capital spending vs budget, by fiscal year</Caption>
              <Bars rows={capex} fmt={(v) => pct(v)} signed label="Capital spending, actual vs budget, by year" />
            </Card>
          </Chapter>
        </div>

        <div data-chapter="Disinvestment">
          <Chapter id="disinvestment" stamp="Disinvestment" title={<>The money that never <I>lands.</I></>}
            intro={<>Every budget counts on selling stakes in public companies. That target was missed in {disMissed} of {dis.length} years,
              under every government: {crore(disActual)} raised against {crore(disBe)} promised.</>}>
            <Card>
              <ReadoutChart label="Disinvestment receipts, budget vs actual, by year" caption="Disinvestment and other non-debt capital receipts. Hover a year to read it."
                x={dis.map((y) => y.fy)} be={dis.map((y) => y.other_receipts.be!)} actual={dis.map((y) => y.other_receipts.actual!)}
                actualName="actually raised" gapName="Never came" />
            </Card>
          </Chapter>
        </div>

        <div data-chapter="Governments"><GovStepper govs={govs} /></div>
        <div data-chapter="Every ₹100"><Waffle fy={alloc.budget} total={alloc.total} cats={cats} /></div>

        <div data-chapter="Ministries">
          <Chapter id="ministries" stamp="Ministries" title={<>Where every ministry&apos;s money <I>went.</I></>}
            intro={<>Follow the money from each ministry&apos;s budget on the left to what it actually spent on the right. Green ribbons drain
              money that was never spent into one pool; saffron ribbons bring in money spent beyond the budget. Hover a ribbon, click
              it to open that ministry, or pick a year.</>}>
            <MinistrySankey data={story.explorer} initial="Ministry of Rural Development" />
          </Chapter>
        </div>

        <div data-chapter="Schemes">
          <Chapter id="schemes" stamp="Flagship schemes" title={<>The schemes on the <I>posters.</I></>}
            intro={<>Twenty-one flagship schemes, every budget line of each combined, {mYears}. Demand-driven
              entitlements like MGNREGA and food and fertiliser subsidies almost always cost more than budgeted. Newer missions and incentive
              schemes struggle to spend at all.</>}>
            <div className="flex flex-col gap-24">
              <div className="grid gap-24 lg:grid-cols-2">
              <Reveal className="rounded-2xl p-40" style={{ background: "radial-gradient(120% 90% at 20% 0%, #ffc285 0%, #ff9933 45%, #c8661a 100%)", boxShadow: "0 0 80px rgba(255,153,51,0.3)", color: "#090909" }}>
                <div>
                  <p className="label text-near-black/70">Jal Jeevan Mission, 2024-25</p>
                  <p className="num mt-24 text-[56px] leading-none tight">{pct(jjm.actual / jjm.be)}</p>
                  <p className="mt-16 text-[18px] leading-[1.5]">
                    of its budget spent: {crore(jjm.actual)} of {crore(jjm.be)}, in the year the mission to put a tap in every rural home
                    was meant to finish.
                  </p>
                  <PairBars series={jjmAll.series} label="Jal Jeevan Mission budget vs actual by year" tint="#090909" />
                </div>
              </Reveal>
              <Reveal className="rounded-2xl border p-40" style={{ borderColor: "var(--hair)" }}>
                <p className="label text-almost-white/70">MGNREGA, {mg.series[0].fy} to {mg.series.at(-1)!.fy}</p>
                <p className="num mt-24 text-[56px] leading-none tight">{pct(mg.use)}</p>
                <p className="mt-16 text-[16px] leading-[1.5] text-almost-white/80">
                  of its budget spent. It is a legal guarantee of work, so when demand rises the money has to follow: it spent more than
                  budgeted in {mg.series.filter((x) => x.actual > x.be).length} of {mg.series.length} years.
                </p>
                <PairBars series={mg.series} label="MGNREGA budget vs actual by year" />
              </Reveal>
              </div>
              <Card>
                <Caption>Actual spending vs budget, all years combined</Caption>
                <Bars rows={flag.map((f) => ({ label: f.name, value: f.use - 1 }))} fmt={(v) => pct(v)} signed label="Flagship schemes, actual spending vs budget" />
              </Card>
            </div>
          </Chapter>
        </div>

        <div data-chapter="The trend">
          <Chapter id="trend" stamp="The trend" title={<>Underspending is becoming <I>normal.</I></>}
            intro={<>Share of government programmes (₹100 crore or more) that spent less than three-quarters of their budget. Before
              COVID it was about {pct(avg(before))}. In 2020-21 it jumped to {pct(covid.under75)}, and it has stayed near {pct(avg(after))} since.
              Finance and Railways are left out: their lines are mostly transfers and commercial accounts, not programmes.</>}>
            <Card>
              <Caption>Programmes spending under 75% of budget, by fiscal year</Caption>
              <Columns rows={under75.map((y) => ({ label: y.fy, value: y.under75 * 100 }))} fmt={(v) => `${Math.round(v)}%`}
                label="Share of programmes spending under 75% of budget, by year" every={1} height={260}
                tone={(r) => (r.label >= "2020-21" ? "hi" : "base")} labelled={under75.map((y) => y.fy)} />
            </Card>
          </Chapter>
        </div>

        <div data-chapter="The bill">
          <Chapter id="total" stamp="The grand total" title={<>Add it all up, and here&apos;s the <I>bill.</I></>}
            intro={<>Every budget in this story, totalled. Money promised but never spent isn&apos;t money stolen, and money spent beyond a
              budget isn&apos;t money wasted. But each is a promise that didn&apos;t happen the way it was announced.</>}>
            <GrandTotal
              big={crore(g.never_spent)}
              bigLabel={`promised to ministries and departments and never spent, ${g.ministry_years[0]} to ${g.ministry_years[1]}. In the same years, ${crore(g.beyond_budget)} was spent beyond their budgets.`}
              sections={[
                { title: `Headline budget, ${g.years[0]} to ${g.years[1]}`, lines: [
                  { label: "Budgeted", value: crore(g.budgeted) },
                  { label: "Actually spent", value: crore(g.spent) },
                  { label: "Difference", value: bill(g.spent, g.budgeted), note: `${pct(g.spent / g.budgeted - 1, true)} over twenty years: overspends in crisis years outweigh underspends in the rest.` },
                ] },
                { title: `Inside the ministries, ${g.ministry_years[0]} to ${g.ministry_years[1]}`, lines: [
                  { label: "Promised, never spent", value: crore(g.never_spent) },
                  { label: "Spent beyond budget", value: crore(g.beyond_budget) },
                ] },
                { title: `Missing from the plan, ${g.years[0]} to ${g.years[1]}`, lines: [
                  { label: "Investment never made", value: crore(g.capex_unspent), note: "Capital spending budgeted but not carried out." },
                  { label: "Asset sales that never came", value: crore(g.disinvestment_missing) },
                  { label: "Tax that never came", value: crore(g.tax_missing) },
                  { label: "Extra borrowing", value: crore(g.extra_borrowing), note: "How much more the government borrowed than its budgets planned." },
                ] },
              ]} />
          </Chapter>
        </div>

        <div data-chapter="The gap, traced">
          <Chapter id="where" stamp={`${wf.fy}, traced`} title={<>So where did the {crore(-wf.total)} <I>go?</I></>}
            intro={<>In {wf.fy}, the latest year with audited accounts, the government budgeted {crore(wf.be)} and spent {crore(wf.actual)}.
              None of the difference vanished, because a budget is a plan to raise money as well as spend it. The first chart shows where
              spending came in under the budget, and where it ran over. The second shows how the books balanced. Both end at the same number.</>}>
            <div className="flex flex-col gap-24">
              <Card>
                <Caption>Where spending fell short of the {wf.fy} budget, ₹ crore</Caption>
                <Waterfall steps={spendSteps} totalLabel="Spent less than budgeted" domain={domain} fmt={num} tickFmt={cr}
                  label={`Where ${wf.fy} spending differed from the budget, by department`} />
              </Card>
              <Card>
                <Caption>How the books balanced, ₹ crore</Caption>
                <Waterfall steps={fundSteps} totalLabel="Spent less than budgeted" domain={domain} fmt={num} tickFmt={cr}
                  label={`How the ${wf.fy} shortfall was matched by lower income and borrowing`} />
                <p className="prose-col mt-32 text-[15px] leading-[1.6] text-almost-white/80">
                  About {pct(income / wf.total)} of the gap made up for tax, asset sales and other income that never arrived. The rest,{" "}
                  {crore(-borrowing)}, meant the government borrowed less than it planned. (The two totals differ by{" "}
                  ₹{Math.abs(Math.round(wf.total - wf.funding.reduce((t, x) => t + x.value, 0)))} crore, from rounding in the budget documents.)
                </p>
              </Card>
            </div>
            <Reveal className="prose-col mt-48 text-[22px] font-light leading-[1.5]">
              No rupees went missing. What went missing was what the money was meant to buy: {crore(gapOf(0))} less on the rural
              tap-water mission in the year it was meant to finish, {crore(gapOf(2))} less on urban housing, and new schemes that spent
              nothing at all. Departments underspent by {crore(-wf.gross_under)} in total while others overran by{" "}
              {crore(wf.gross_over)}; the budget data shows where, but only audits can show <I>why.</I>
            </Reveal>
          </Chapter>
        </div>

        <div data-chapter="The limits">
          <Chapter id="limits" stamp="The limits" title={<>So nothing went missing? <I>Not quite.</I></>}
            intro={<>The gap between budget and spending isn&apos;t where money disappears. But the budget can&apos;t see everything either.
              Here is what these documents can and can&apos;t tell you.</>}>
            <div className="grid gap-24 md:grid-cols-2">
              {[
                ["Unspent money never left.", "A budget line is permission to spend, not cash sitting in a ministry's account. When a scheme spends less than its budget, the rest is never paid out: the government simply raises and borrows less, as the previous chapter traced rupee by rupee."],
                ["Spent money is on the record.", "Every rupee that leaves the government's main account is booked against a budget line, and those accounts are audited by the Comptroller and Auditor General every year. Spending beyond a budget needs Parliament's approval through supplementary demands. The overruns in this story are all on the books."],
              ].map(([h, t]) => (
                <Reveal key={h} className="rounded-2xl border p-32" style={{ borderColor: "var(--hair)" }}>
                  <h3 className="text-[24px] font-medium leading-[1.2] tight">{h}</h3>
                  <p className="mt-12 text-[15px] leading-[1.6] text-almost-white/75">{t}</p>
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-64">
              <p className="stamp text-[13px] text-steel">Where the record goes thin</p>
            </Reveal>
            <div className="mt-24 grid gap-x-32 gap-y-40 md:grid-cols-2">
              {[
                ["“Spent” isn’t “delivered”.", "The budget records that money went to a scheme or a state, not whether the hospital was built or the worker was paid. If money leaks, it leaks downstream, with states, agencies and contractors, and only CAG's performance audits go looking for it."],
                ["Money parked in funds.", `Some lines count as spent the moment money moves into a reserve fund, and the fund spends it later. In ${wf.fy} the fertiliser department moved ${crore(fertReserve)} into a reserve fund this way. CAG has also flagged cess collections that never reached the funds they were raised for.`],
                ["Bills kept off the budget.", `From 2016-17 to 2019-20 the food subsidy paid through the budget was only ${pct(foodLow)} to ${pct(foodHigh)} of what was budgeted, while the Food Corporation's unpaid bills were covered with loans instead. In 2020-21 the budget cleared them: food subsidy came in at ${(foodCovid).toFixed(1)}× its budget.`],
                ["Money that was never budget money.", "PM CARES is a trust outside the Union Budget and isn't audited by the CAG. Donors to political parties through electoral bonds were anonymous until the Supreme Court struck the scheme down in 2024. Neither appears in these documents at all."],
                ["Advertising, mostly invisible.", `Only ${crore(pub.be)} of the ${pub.fy} budget sits in lines labelled publicity or advertising. Most publicity is paid from individual scheme budgets, so the real figure is higher and can't be read from these documents.`],
                ["Where to look next.", "If you want to follow money that really goes missing, the leads are CAG audit findings, off-budget borrowing and the funds outside the budget, not the gap between budget and spending. Those are the next datasets for this project."],
              ].map(([h, t]) => (
                <Reveal key={h} className="border-t pt-24" style={{ borderColor: "var(--hair)" }}>
                  <h3 className="text-[20px] font-medium leading-[1.25] tight">{h}</h3>
                  <p className="mt-12 text-[15px] leading-[1.6] text-almost-white/70">{t}</p>
                </Reveal>
              ))}
            </div>
          </Chapter>
        </div>

        <section id="method" data-chapter="Method" aria-label="Method and sources" className="border-t pb-160 pt-128" style={{ borderColor: "var(--hair)" }}>
          <div className="mx-auto max-w-[1200px] px-16 sm:px-32">
            <p className="stamp text-[13px] text-steel">Method</p>
            <h2 className="mt-12 text-[36px] font-semibold leading-[1.05] tight sm:text-[48px]">How this was <I>built.</I></h2>
            <div className="mt-48 grid gap-48 text-[15px] leading-[1.7] text-almost-white/75 md:grid-cols-2">
              <p>
                32 official documents from indiabudget.gov.in: <em>Budget at a Glance</em> for every budget from 2005-06 to 2026-27, and the
                full <em>Expenditure Budget</em> for 2017-18 to 2026-27, parsed into 31,389 budget lines. A year&apos;s budget figure comes from
                its own February budget; its actual spending from the audited figures published two years later.
              </p>
              <p>
                Every extraction is checked: accounting identities for every statement, each ministry&apos;s lines against its grand total,
                and the two document series against each other, which agree to the crore for all ten overlapping years. One page with no
                text layer was transcribed by hand. Code, raw files and checks are in the project repository.
              </p>
            </div>
          </div>
        </section>
      </main>
      <ChapterNav />
      <TallyFooter budgeted={story.grand.ministry_budgeted} spent={story.grand.ministry_spent} neverSpent={story.grand.never_spent}
        years={`${story.grand.ministry_years[0]} to ${story.grand.ministry_years[1]}`} />
    </>
  );
}
