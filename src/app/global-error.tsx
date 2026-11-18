"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", background: "#f6f1e9", color: "#2b2420", padding: 24, textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <p>Your data is safe. Please try again.</p>
        <button onClick={reset} style={{ padding: "12px 20px", borderRadius: 14, border: 0, background: "#c2553b", color: "#fff", fontSize: 16 }}>
          Try again
        </button>
      </body>
    </html>
  );
}
