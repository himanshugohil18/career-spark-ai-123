export function Logo({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/careerosai.png"
      alt="CareerOS"
      width={size}
      height={size}
      className="shrink-0 select-none object-contain"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}
