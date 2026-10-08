// A glowing ₹ coin: the marker that draws the gap line and caps the hero's underline.
export function RupeeMark({ size = 26 }: { size?: number }) {
  return (
    <span aria-hidden className="flex items-center justify-center rounded-full font-semibold leading-none"
      style={{
        width: size, height: size, fontSize: size * 0.55,
        background: "radial-gradient(circle at 35% 30%, #ffd2a6, #ff9933 60%, #b85a10)",
        boxShadow: "0 0 18px rgba(255,153,51,0.7)", color: "#090909",
      }}>
      ₹
    </span>
  );
}
