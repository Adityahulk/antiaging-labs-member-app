"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled render error", error);
  }, [error]);

  return (
    <div className="shell-failure">
      <div className="record-unavailable paper-card" role="alert">
        <span className="card-kicker">SOMETHING BROKE</span>
        <h2>This screen stopped before it could finish.</h2>
        <p>
          Your health record is unchanged. Nothing was saved or altered by this
          error, and no partial values were shown.
        </p>
        <div className="failure-actions">
          <button className="primary-button" onClick={reset} type="button">
            <span>Reload this screen</span>
            <span aria-hidden="true">→</span>
          </button>
          <a className="quiet-button" href="/support">Contact support</a>
        </div>
        {error.digest ? <small className="failure-digest">Reference: {error.digest}</small> : null}
      </div>
    </div>
  );
}
