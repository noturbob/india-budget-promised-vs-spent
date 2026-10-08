import story from "@/data/story.json";

const SQL = story.sql as Record<string, string>;
const KEYWORDS = new Set(("select from where group by order having with as and or not in is null case when then else end join left using on " +
  "union all distinct over partition filter create replace table view copy to header limit between like coalesce sum count min max avg " +
  "median list least greatest floor row_number arg_min arg_max regexp_matches read_csv values macro desc asc int").split(" "));

/** Colour comments, quoted strings and SQL keywords. Server-rendered, so no client JS. */
function highlight(sql: string) {
  return sql.split(/(--[^\n]*|'[^']*'|\b[A-Za-z_]+\b)/g).map((part, i) => {
    if (part.startsWith("--")) return <span key={i} className="text-almost-white/45">{part}</span>;
    if (part.startsWith("'")) return <span key={i} className="text-saffron-mist">{part}</span>;
    if (KEYWORDS.has(part.toLowerCase())) return <span key={i} className="text-saffron">{part}</span>;
    return part;
  });
}

/** "Show the SQL" under a chart: the exact query file(s) that computed it, from sql/ via story.json. */
export function SqlPanel({ files, className = "" }: { files: string[]; className?: string }) {
  return (
    <details className={`group rounded-xl border text-[13px] ${className}`} style={{ borderColor: "var(--hair)" }}>
      <summary className="stamp flex cursor-pointer list-none items-center gap-12 whitespace-nowrap px-20 py-12 text-almost-white/75 hover:text-almost-white">
        <span aria-hidden className="inline-block transition-transform group-open:rotate-90">▸</span>
        Show the SQL
        <span className="ml-auto hidden min-w-0 truncate text-almost-white/45 sm:inline">{files.map((f) => `sql/${f}.sql`).join(" · ")}</span>
      </summary>
      {files.map((f) => (
        <div key={f} className="border-t" style={{ borderColor: "var(--hair)" }}>
          <p className="stamp px-20 pt-12 text-[11px] text-almost-white/45">sql/{f}.sql</p>
          <pre className="overflow-x-auto px-20 pb-16 pt-8 font-mono text-[12.5px] leading-[1.6] text-almost-white/85"><code>{highlight(SQL[f].trim())}</code></pre>
        </div>
      ))}
    </details>
  );
}
