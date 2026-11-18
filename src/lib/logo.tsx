// App icon drawn with plain boxes so next/og can render it to PNG (no image files to keep around).
export function Logo({ size }: { size: number }) {
  const u = size / 100;
  const line = (w: number, color = "#2b2420") => (
    <div style={{ width: w * u, height: 5 * u, borderRadius: 3 * u, background: color, marginTop: 7 * u }} />
  );
  return (
    <div style={{ width: size, height: size, background: "#c2553b", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: 52 * u,
          height: 58 * u,
          background: "#fffcf7",
          borderRadius: 8 * u,
          display: "flex",
          flexDirection: "column",
          padding: `${6 * u}px ${9 * u}px`,
        }}
      >
        {line(30)}
        {line(24)}
        {line(30)}
        {line(16, "#55845c")}
      </div>
    </div>
  );
}
