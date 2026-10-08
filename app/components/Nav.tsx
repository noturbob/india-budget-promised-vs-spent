const LINKS = [
  { href: "#gap", label: "The gap" },
  { href: "#governments", label: "Governments" },
  { href: "#ministries", label: "Ministries" },
  { href: "#schemes", label: "Schemes" },
  { href: "#total", label: "The bill" },
  { href: "#method", label: "Method" },
];

/** Frosted top bar: wordmark left, chapter links centre, one outlined action right. */
export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b" style={{ background: "rgba(22,22,24,0.6)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderColor: "rgba(107,107,107,0.6)" }}>
      <div className="mx-auto flex h-[56px] max-w-[1200px] items-center justify-between gap-24 px-16 sm:px-32">
        <a href="#top" className="text-[15px] tracking-[0.02em]"><span className="font-bold">PROMISED</span><span className="font-light">.SPENT</span></a>
        <nav aria-label="Chapters" className="hidden md:block">
          <ul className="flex gap-24">
            {LINKS.map((l) => <li key={l.href}><a href={l.href} className="label text-almost-white/80 hover:text-almost-white">{l.label}</a></li>)}
          </ul>
        </nav>
        <a href="#ministries" className="btn">Find a ministry</a>
      </div>
    </header>
  );
}
