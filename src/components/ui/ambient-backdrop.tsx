/**
 * Global ambient backdrop for authenticated pages.
 * Layered radial gradients + subtle grid, drifting slowly.
 * Purely decorative, pointer-events-none, sits behind main content.
 */
export function AmbientBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* base wash */}
      <div className="absolute inset-0 bg-background" />

      {/* drifting brand orbs */}
      <div
        className="animate-drift-a absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full opacity-[0.22] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(79,140,255,0.55), transparent 70%)",
        }}
      />
      <div
        className="animate-drift-b absolute top-1/3 right-[-10%] h-[600px] w-[600px] rounded-full opacity-[0.18] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(34,211,238,0.5), transparent 70%)",
        }}
      />
      <div
        className="animate-drift-c absolute bottom-[-15%] left-1/3 h-[560px] w-[560px] rounded-full opacity-[0.14] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(124,92,255,0.5), transparent 70%)",
        }}
      />

      {/* faint pulsing grid */}
      <div className="bg-grid animate-grid-pulse absolute inset-0 grid-fade-mask opacity-[0.35]" />

      {/* film grain */}
      <div className="bg-noise absolute inset-0 opacity-[0.25] mix-blend-overlay" />
    </div>
  );
}
