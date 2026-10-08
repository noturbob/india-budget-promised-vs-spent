// Indian money format: ₹ thousands, lakhs (L) and crores (Cr).
export const inr = (n: number) => {
  const a = Math.abs(n), s = n < 0 ? "−" : "";
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(1)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(1)} L`;
  if (a >= 1e3) return `${s}₹${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
  return `${s}₹${Math.round(a)}`;
};

export const rupees = (n: number) => `${n < 0 ? "−" : ""}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;

// Chart colours on the near-black canvas, from the Indian flag. PLAN (what was budgeted) is the white
// reference line, always dashed; ACTUAL (what was spent, or more than budgeted) is saffron; UNDER
// (less than budgeted, never spent) is India green. Saffron/green pass the CVD separation check.
export const PLAN = "#c9cacb";
export const ACTUAL = "#ff9933";
export const UNDER = "#138808";
export const MUTED = "#828384";
export const SURFACE = "#090909";

// Budget amounts arrive in ₹ crore. 1 lakh crore = 100,000 crore.
export const cr = (n: number) => {
  const a = Math.abs(n), s = n < 0 ? "−" : "";
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(a >= 1e6 ? 0 : 1)} L cr`;
  if (a >= 1e3) return `${s}₹${Math.round(a / 1e3)}k cr`;
  return `${s}₹${Math.round(a)} cr`;
};

// Long form for prose: "₹53.5 lakh crore", "₹22,615 crore".
export const crore = (n: number) => {
  const a = Math.abs(n), s = n < 0 ? "−" : "";
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(1)} lakh crore`;
  return `${s}₹${Math.round(a).toLocaleString("en-IN")} crore`;
};

export const pct = (x: number, signed = false) => {
  const r = Math.round(x * 100);
  return `${signed && r > 0 ? "+" : ""}${r < 0 ? "−" : ""}${Math.abs(r)}%`;
};
