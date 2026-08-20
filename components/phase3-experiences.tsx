"use client";
import { useEffect, useMemo, useState } from "react";
import { useAppData } from "./app-provider";

type Row = Record<string, unknown>;

export function OutcomesLoader() {
  const { refresh } = useAppData();
  useEffect(() => {
    fetch("/api/outcomes", { cache: "no-store" })
      .then(() => refresh())
      .catch(() => undefined);
  }, [refresh]);
  return null;
}

export function CompanionConnections() {
  const { data, refresh } = useAppData();
  const [pair, setPair] = useState<{
    code: string;
    platform: string;
    expiresAt: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const create = async (platform: "ios" | "android") => {
    const response = await fetch("/api/native/pairing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    const result = (await response.json()) as {
      code?: string;
      platform?: string;
      expiresAt?: string;
      error?: string;
    };
    if (response.ok && result.code)
      setPair(result as { code: string; platform: string; expiresAt: string });
    else setNotice(result.error ?? "Could not create pairing code");
    await refresh();
  };
  return (
    <section className="paper-card companion-panel">
      <div className="section-head compact">
        <div>
          <span className="card-kicker">DIRECT PHONE SYNC</span>
          <h2>Apple Health & Health Connect</h2>
        </div>
        <span className="live-chip">
          <i /> incremental sync
        </span>
      </div>
      <p>
        Your phone companion reads only the categories you approve, sends
        changed records in encrypted batches, and keeps deletions and source
        attribution synchronized.
      </p>
      <div className="companion-actions">
        <button onClick={() => void create("ios")}>
          <span></span>
          <strong>Pair iPhone</strong>
          <small>Apple Watch through HealthKit</small>
        </button>
        <button onClick={() => void create("android")}>
          <span>H</span>
          <strong>Pair Android</strong>
          <small>Health Connect on device</small>
        </button>
      </div>
      {pair ? (
        <div className="pairing-ticket">
          <span>{pair.platform.toUpperCase()} PAIRING CODE</span>
          <strong>{pair.code}</strong>
          <small>
            Enter once in the companion app. Expires at{" "}
            {new Date(pair.expiresAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </small>
        </div>
      ) : null}
      {notice ? <p className="workflow-notice">{notice}</p> : null}
      <div className="paired-devices">
        {(data?.phase3.companions ?? []).map((device) => (
          <span key={String(device.id)}>
            <i className={String(device.status) === "active" ? "ready" : ""} />
            <strong>{String(device.deviceName)}</strong>
            <small>
              {String(device.platform).toUpperCase()} ·{" "}
              {device.lastSyncAt
                ? `Synced ${new Date(String(device.lastSyncAt)).toLocaleString()}`
                : "Ready for first sync"}
            </small>
          </span>
        ))}
      </div>
    </section>
  );
}

export function OutcomesExperience() {
  const { data, refresh } = useAppData();
  const [notice, setNotice] = useState("");
  const state = data?.phase3;
  const outcomes = state?.outcomes ?? [];
  const consent = Boolean(state?.researchConsent?.granted);
  const updateConsent = async (granted: boolean) => {
    await fetch("/api/research/consent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ granted }),
    });
    setNotice(
      granted
        ? "Research contribution enabled. Your personal experience is unchanged."
        : "Research contribution stopped.",
    );
    await refresh();
  };
  const exportFhir = async () => {
    const response = await fetch("/api/interoperability/fhir/export", {
      method: "POST",
    });
    const result = (await response.json()) as { bundle?: unknown };
    if (response.ok && result.bundle) {
      const blob = new Blob([JSON.stringify(result.bundle, null, 2)], {
        type: "application/fhir+json",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "antiaging-labs-fhir-r4.json";
      link.click();
      URL.revokeObjectURL(link.href);
      setNotice("Your FHIR R4 record was created.");
    }
  };
  return (
    <>
      {notice ? <p className="workflow-notice">{notice}</p> : null}
      <section className="progress-hero paper-card">
        <div>
          <span className="card-kicker">LONGITUDINAL OUTCOMES</span>
          <h2>Change you can inspect.</h2>
          <p>
            Every comparison keeps its baseline, current value, dates, unit,
            data quality, and source references. No composite score hides the
            movement.
          </p>
        </div>
        <div className="progress-orbit">
          <span>{outcomes.length}</span>
          <small>
            measured
            <br />
            outcomes
          </small>
          <i />
        </div>
      </section>
      <section className="outcome-grid">
        {outcomes.length ? (
          outcomes.map((outcome, index) => (
            <OutcomeCard
              key={String(outcome.id)}
              item={outcome}
              index={index}
            />
          ))
        ) : (
          <article className="paper-card outcome-empty">
            <span>COLLECTING YOUR SECOND TIMEPOINT</span>
            <h2>Progress begins with a reliable comparison.</h2>
            <p>
              Wearables compare your recent seven days with the preceding
              baseline. Lab outcomes appear after a verified retest.
            </p>
          </article>
        )}
      </section>
      <section className="paper-card validation-panel">
        <div>
          <span className="card-kicker">RESPONSE MODEL READINESS</span>
          <h2>Predictions earn their way into the product.</h2>
          <p>
            Each target is evaluated separately for temporal accuracy, interval
            calibration, supported subgroups, and out-of-range inputs. Until a
            model passes, the app says “collecting validation” instead of
            inventing a forecast.
          </p>
        </div>
        <div className="validation-steps">
          <span className="done">
            <i>1</i>
            <strong>Outcome contract</strong>
            <small>Versioned</small>
          </span>
          <span>
            <i>2</i>
            <strong>Prospective data</strong>
            <small>Collecting</small>
          </span>
          <span>
            <i>3</i>
            <strong>Calibration</strong>
            <small>Gated</small>
          </span>
          <span>
            <i>4</i>
            <strong>Member estimate</strong>
            <small>Abstains safely</small>
          </span>
        </div>
      </section>
      <section className="progress-controls">
        <article className="paper-card">
          <span className="card-kicker">OPTIONAL RESEARCH CONTRIBUTION</span>
          <h2>Help validate what works.</h2>
          <p>
            Only de-identified outcome rows enter cohort analytics, and small
            groups are suppressed. Turn it off anytime.
          </p>
          <label className="consent-toggle">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => void updateConsent(event.target.checked)}
            />
            <span />
            <strong>{consent ? "Contributing" : "Not contributing"}</strong>
          </label>
        </article>
        <article className="paper-card">
          <span className="card-kicker">PORTABLE RECORD</span>
          <h2>FHIR R4 export</h2>
          <p>
            Create an ABDM-aligned bundle of observations, your current
            protocol, and provenance. ABDM linking remains optional.
          </p>
          <button
            className="secondary-button"
            onClick={() => void exportFhir()}
          >
            Create health record export →
          </button>
        </article>
      </section>
    </>
  );
}

function OutcomeCard({ item, index }: { item: Row; index: number }) {
  const change = Number(item.absoluteChange ?? 0);
  const percent =
    item.percentChange === null || item.percentChange === undefined
      ? null
      : Number(item.percentChange);
  const favourable = [
    "resting_hr",
    "apob",
    "homa_ir",
    "hba1c",
    "fasting_glucose",
  ].includes(String(item.targetCode))
    ? change < 0
    : change > 0;
  const label = String(item.targetCode).replaceAll("_", " ");
  const path = useMemo(() => {
    const base = Number(item.baselineValue);
    const current = Number(item.currentValue);
    const midpoint =
      (base + current) / 2 +
      (index % 2 ? Math.abs(change) * 0.2 : -Math.abs(change) * 0.15);
    const min = Math.min(base, current, midpoint);
    const max = Math.max(base, current, midpoint);
    const y = (value: number) => 70 - ((value - min) / (max - min || 1)) * 46;
    return `M 5 ${y(base)} C 28 ${y(base)}, 48 ${y(midpoint)}, 66 ${y(midpoint)} S 92 ${y(current)}, 115 ${y(current)}`;
  }, [item, index, change]);
  return (
    <article className="paper-card outcome-card">
      <div>
        <span className="card-kicker">{label}</span>
        <span className={`change-pill ${favourable ? "positive" : "neutral"}`}>
          {change > 0 ? "+" : ""}
          {percent !== null
            ? `${percent.toFixed(1)}%`
            : `${change.toFixed(1)} ${item.unit}`}
        </span>
      </div>
      <svg
        viewBox="0 0 120 78"
        role="img"
        aria-label={`${label} changed from ${item.baselineValue} to ${item.currentValue}`}
      >
        <path className="outcome-guide" d="M5 66 H115" />
        <path className="outcome-line" d={path} />
        <circle cx="5" cy="54" r="3" />
        <circle cx="115" cy="24" r="4" />
      </svg>
      <div className="outcome-values">
        <span>
          <small>BASELINE</small>
          <strong>
            {Number(item.baselineValue).toFixed(1)} {String(item.unit)}
          </strong>
          <i>{new Date(String(item.baselineAt)).toLocaleDateString()}</i>
        </span>
        <span>
          <small>CURRENT</small>
          <strong>
            {Number(item.currentValue).toFixed(1)} {String(item.unit)}
          </strong>
          <i>{new Date(String(item.currentAt)).toLocaleDateString()}</i>
        </span>
      </div>
      <footer>
        <span>Quality {Math.round(Number(item.quality) * 100)}%</span>
        <a href="/data">Inspect sources →</a>
      </footer>
    </article>
  );
}

export function ExperimentsExperience() {
  const [data, setData] = useState<{
    templates: Row[];
    experiments: Row[];
  } | null>(null);
  const [notice, setNotice] = useState("");
  const load = () =>
    fetch("/api/experiments", { cache: "no-store" })
      .then(
        async (response) =>
          (await response.json()) as { templates: Row[]; experiments: Row[] },
      )
      .then(setData);
  useEffect(() => {
    void load();
  }, []);
  const active = data?.experiments.find((item) => item.status === "active");
  const start = async (code: string) => {
    const response = await fetch("/api/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateCode: code }),
    });
    const result = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? "Experiment scheduled. Your first day starts tomorrow."
        : (result.error ?? "Could not start"),
    );
    await load();
  };
  const check = async (periodId: string, completed: boolean) => {
    await fetch("/api/experiments/check-in", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodId,
        completed,
        adherence: completed ? 1 : 0,
      }),
    });
    await load();
  };
  return (
    <>
      {notice ? <p className="workflow-notice">{notice}</p> : null}
      {active ? (
        <ActiveExperiment experiment={active} onCheck={check} />
      ) : (
        <section className="experiment-intro paper-card">
          <div>
            <span className="card-kicker">YOUR N-OF-1 LAB</span>
            <h2>Learn from your own response.</h2>
            <p>
              Run one low-friction comparison at a time. The app randomizes two
              routines, captures adherence and wearable outcomes, then shows the
              effect with uncertainty—not a premature verdict.
            </p>
          </div>
          <span className="experiment-number">
            14<small>days</small>
          </span>
        </section>
      )}
      <section className="template-grid">
        {(data?.templates ?? []).map((template) => (
          <article
            className="paper-card template-card"
            key={String(template.code)}
          >
            <span className="experiment-glyph">
              {String(template.code).slice(0, 1).toUpperCase()}
            </span>
            <small>{String(template.outcome).replaceAll("_", " ")}</small>
            <h3>{String(template.title)}</h3>
            <p>{String(template.hypothesis)}</p>
            <div>
              <span>A · {String(template.a)}</span>
              <span>B · {String(template.b)}</span>
            </div>
            <button
              disabled={Boolean(active)}
              onClick={() => void start(String(template.code))}
            >
              {active ? "One experiment active" : "Start this experiment →"}
            </button>
          </article>
        ))}
      </section>
      <section className="paper-card experiment-history">
        <div className="section-head compact">
          <div>
            <span className="card-kicker">EXPERIMENT ARCHIVE</span>
            <h2>What your body taught us</h2>
          </div>
        </div>
        {(data?.experiments ?? []).filter((item) => item.status !== "active")
          .length ? (
          (data?.experiments ?? [])
            .filter((item) => item.status !== "active")
            .map((item) => (
              <div key={String(item.id)}>
                <strong>{String(item.title)}</strong>
                <span>
                  {String((item.resultJson as Row)?.conclusion ?? "Completed")}
                </span>
              </div>
            ))
        ) : (
          <p>
            No completed experiments yet. Your first clean comparison will live
            here.
          </p>
        )}
      </section>
    </>
  );
}

function ActiveExperiment({
  experiment,
  onCheck,
}: {
  experiment: Row;
  onCheck: (id: string, done: boolean) => Promise<void>;
}) {
  const periods = (experiment.periods as Row[]) ?? [];
  const completed = periods.filter((period) => period.completed).length;
  const next = periods.find((period) => !period.completed);
  const result = experiment.resultJson as Row;
  return (
    <section className="active-experiment paper-card">
      <div className="active-experiment-head">
        <div>
          <span className="card-kicker">
            ACTIVE EXPERIMENT · {completed}/14 DAYS
          </span>
          <h2>{String(experiment.title)}</h2>
          <p>{String(experiment.hypothesis)}</p>
        </div>
        <span className="arm-badge">
          TODAY
          <br />
          <strong>{String(next?.arm ?? "—")}</strong>
        </span>
      </div>
      <div className="period-track">
        {periods.map((period) => (
          <button
            aria-label={`${period.day}: routine ${period.arm}`}
            className={
              period.completed
                ? "complete"
                : period.id === next?.id
                  ? "today"
                  : ""
            }
            key={String(period.id)}
            onClick={() =>
              !period.completed && void onCheck(String(period.id), true)
            }
          >
            <span>{new Date(String(period.day)).getUTCDate()}</span>
            <i>{String(period.arm)}</i>
          </button>
        ))}
      </div>
      {next ? (
        <div className="today-instruction">
          <span>NEXT ROUTINE</span>
          <strong>{String(next.instruction)}</strong>
          <button onClick={() => void onCheck(String(next.id), true)}>
            Mark complete
          </button>
        </div>
      ) : null}
      <p className="experiment-conclusion">
        {String(
          result?.conclusion ??
            "Complete each assigned routine; the outcome is attached only when your wearable data for that day is available.",
        )}
      </p>
    </section>
  );
}

export function AdminPhase3() {
  const [data, setData] = useState<Row | null>(null);
  const [studyRef, setStudyRef] = useState("");
  const [validation, setValidation] = useState({
    n: "",
    mae: "",
    coverage: "",
    disparity: "",
    datasetHash: "",
  });
  const [notice, setNotice] = useState("");
  const reload = async () => {
    const response = await fetch("/api/admin/phase3", { cache: "no-store" });
    setData((await response.json()) as Row);
  };
  useEffect(() => {
    fetch("/api/admin/phase3", { cache: "no-store" })
      .then(async (response) => (await response.json()) as Row)
      .then(setData);
  }, []);
  const cohort = data?.cohort as Row | undefined;
  const cohortMetrics = (cohort?.metrics as Row[] | undefined) ?? [];
  const runs = data?.connectorRuns as Row[] | undefined;
  const models = data?.models as Row[] | undefined;
  const train = async (targetCode: string) => {
    const response = await fetch("/api/admin/models/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCode }),
    });
    const result = (await response.json()) as { status?: string; error?: string };
    setNotice(
      response.ok
        ? `Candidate trained: ${result.status?.replaceAll("_", " ")}.`
        : (result.error ?? "Training failed"),
    );
    await reload();
  };
  const validate = async (modelId: string) => {
    const response = await fetch("/api/admin/models/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId,
        prospectiveStudyId: studyRef,
        evaluation: {
          n: Number(validation.n),
          mae: Number(validation.mae),
          coverage: Number(validation.coverage),
          maxSubgroupMaeRatio: Number(validation.disparity),
          datasetHash: validation.datasetHash,
        },
      }),
    });
    const result = (await response.json()) as { error?: string };
    setNotice(
      response.ok
        ? "Model published with prospective validation reference."
        : (result.error ?? "Validation failed"),
    );
    await reload();
  };
  return (
    <section className="phase3-admin">
      <div className="section-head compact">
        <div>
          <span className="card-kicker">PHASE 3 · SCALE & VALIDATION</span>
          <h2>Connector, cohort, and model control</h2>
        </div>
        <span className="eta-chip">live governance</span>
      </div>
      {notice ? <p className="phase3-admin-notice">{notice}</p> : null}
      <div className="phase3-admin-grid">
        <article>
          <span>CONSENTED COHORT</span>
          <strong>{String(cohort?.consentedMembers ?? "—")}</strong>
          <small>
            Cells under {String(cohort?.minimumCell ?? 5)} suppressed
          </small>
        </article>
        <article>
          <span>CONNECTOR RUNS</span>
          <strong>{runs?.length ?? "—"}</strong>
          <small>
            {runs?.filter((run) => run.status === "failed").length ?? 0} recent
            failures
          </small>
        </article>
        <article>
          <span>VALIDATED MODELS</span>
          <strong>
            {models?.filter((model) => model.status === "validated").length ??
              0}
          </strong>
          <small>{models?.length ?? 0} registered targets</small>
        </article>
        <article>
          <span>NATIVE DEVICES</span>
          <strong>
            {(data?.installations as Row[] | undefined)?.length ?? "—"}
          </strong>
          <small>Apple + Android companions</small>
        </article>
      </div>
      <div className="model-ledger">
        {models?.length ? (
          models.map((model) => (
            <span key={String(model.id)}>
              <strong>
                {String(model.target_code).replaceAll("_", " ")} v
                {String(model.version)}
              </strong>
              <i className={String(model.status)} />
              <small>
                {String(model.status)} · n=
                {String((model.metrics_json as Row)?.n ?? 0)} · coverage{" "}
                {Math.round(
                  Number((model.calibration_json as Row)?.coverage ?? 0) * 100,
                )}
                %
              </small>
              <div>
                <button
                  onClick={() => void train(String(model.target_code))}
                >
                  Train next candidate
                </button>
                {model.status === "eligible_review" ? (
                  <>
                    <input
                      aria-label="Prospective study reference"
                      placeholder="Prospective study ID"
                      value={studyRef}
                      onChange={(event) => setStudyRef(event.target.value)}
                    />
                    <input
                      aria-label="Prospective cohort size"
                      placeholder="n"
                      inputMode="numeric"
                      value={validation.n}
                      onChange={(event) =>
                        setValidation({ ...validation, n: event.target.value })
                      }
                    />
                    <input
                      aria-label="Prospective mean absolute error"
                      placeholder="MAE"
                      inputMode="decimal"
                      value={validation.mae}
                      onChange={(event) =>
                        setValidation({
                          ...validation,
                          mae: event.target.value,
                        })
                      }
                    />
                    <input
                      aria-label="Prospective interval coverage"
                      placeholder="Coverage 0–1"
                      inputMode="decimal"
                      value={validation.coverage}
                      onChange={(event) =>
                        setValidation({
                          ...validation,
                          coverage: event.target.value,
                        })
                      }
                    />
                    <input
                      aria-label="Maximum subgroup error ratio"
                      placeholder="Subgroup ratio"
                      inputMode="decimal"
                      value={validation.disparity}
                      onChange={(event) =>
                        setValidation({
                          ...validation,
                          disparity: event.target.value,
                        })
                      }
                    />
                    <input
                      aria-label="Prospective dataset hash"
                      placeholder="Dataset SHA-256"
                      value={validation.datasetHash}
                      onChange={(event) =>
                        setValidation({
                          ...validation,
                          datasetHash: event.target.value,
                        })
                      }
                    />
                    <button
                      disabled={
                        !studyRef.trim() ||
                        !validation.n ||
                        !validation.mae ||
                        !validation.coverage ||
                        !validation.disparity ||
                        !validation.datasetHash.trim()
                      }
                      onClick={() => void validate(String(model.id))}
                    >
                      Validate & publish
                    </button>
                  </>
                ) : null}
              </div>
            </span>
          ))
        ) : (
          <p>
            No response model can publish until prospective outcome volume and
            calibration gates pass.
          </p>
        )}
      </div>
      <div className="cohort-ledger">
        <span className="card-kicker">CONSENTED COHORT OUTCOMES</span>
        {cohortMetrics.length ? (
          cohortMetrics.map((metric) => (
            <span key={String(metric.targetCode)}>
              <strong>{String(metric.targetCode).replaceAll("_", " ")}</strong>
              <small>n={String(metric.n)}</small>
              <b>
                {metric.suppressed
                  ? "Suppressed"
                  : `${Number(metric.averagePercentChange ?? 0).toFixed(1)}% average change`}
              </b>
            </span>
          ))
        ) : (
          <p>Metrics appear only after members explicitly opt in.</p>
        )}
      </div>
    </section>
  );
}
