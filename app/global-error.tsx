"use client";

/** Last-resort boundary: replaces the root layout, so it ships its own
 *  <html>/<body> and cannot rely on globals.css having loaded. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f2eee6", color: "#152329", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <main style={{ maxWidth: 560 }} role="alert">
          <p style={{ margin: 0, fontFamily: "system-ui, sans-serif", fontSize: 11, fontWeight: 650, letterSpacing: ".15em", color: "#5f6b70" }}>
            ANTIAGING LABS
          </p>
          <h1 style={{ margin: "14px 0", fontSize: 38, fontWeight: 400, lineHeight: 1.1 }}>
            The app could not start.
          </h1>
          <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 15, lineHeight: 1.6, color: "#5f6b70" }}>
            Your health record is unchanged. Reload to try again, or contact
            support if this keeps happening.
          </p>
          <button
            onClick={reset}
            type="button"
            style={{ marginTop: 12, padding: "13px 20px", border: 0, borderRadius: 8, background: "#bb593a", color: "#fff", fontFamily: "system-ui, sans-serif", fontSize: 13, cursor: "pointer" }}
          >
            Reload
          </button>
          {error.digest ? (
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, color: "#5f6b70" }}>Reference: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
