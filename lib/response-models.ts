export type ModelRow = { features: number[]; target: number; subgroup: string; observedAt: string };
export type TrainedResponseModel = {
  coefficients: number[];
  featureRanges: Array<{ min: number; max: number }>;
  metrics: { n: number; trainN: number; testN: number; mae: number; rmse: number; r2: number };
  calibration: { interval: number; residualRadius: number; coverage: number };
  subgroups: Record<string, { n: number; mae: number; coverage: number }>;
  eligible: boolean;
  gateReasons: string[];
};

const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const round = (value: number, places = 4) => Number(value.toFixed(places));
const quantile = (values: number[], q: number) => { const sorted = [...values].sort((a, b) => a - b); if (!sorted.length) return 0; return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]; };

function solve(matrix: number[][], vector: number[]) {
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < matrix.length; column++) {
    let pivot = column;
    for (let row = column + 1; row < matrix.length; row++) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column] || 1e-10;
    for (let cell = column; cell <= matrix.length; cell++) augmented[column][cell] /= divisor;
    for (let row = 0; row < matrix.length; row++) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let cell = column; cell <= matrix.length; cell++) augmented[row][cell] -= factor * augmented[column][cell];
    }
  }
  return augmented.map((row) => row[matrix.length]);
}

function fit(rows: ModelRow[], ridge = .001) {
  const width = (rows[0]?.features.length ?? 0) + 1;
  const matrix = Array.from({ length: width }, () => Array(width).fill(0));
  const vector = Array(width).fill(0);
  for (const row of rows) {
    const x = [1, ...row.features];
    for (let i = 0; i < width; i++) {
      vector[i] += x[i] * row.target;
      for (let j = 0; j < width; j++) matrix[i][j] += x[i] * x[j];
    }
  }
  for (let index = 1; index < width; index++) matrix[index][index] += ridge;
  return solve(matrix, vector);
}

export function predictValue(coefficients: number[], features: number[]) {
  return coefficients[0] + features.reduce((total, feature, index) => total + feature * (coefficients[index + 1] ?? 0), 0);
}

export function trainAndValidateResponseModel(inputRows: ModelRow[], minimumSample = 30): TrainedResponseModel {
  const rows = inputRows.filter((row) => Number.isFinite(row.target) && row.features.every(Number.isFinite)).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const testN = Math.max(1, Math.ceil(rows.length * .25));
  const trainRows = rows.slice(0, Math.max(0, rows.length - testN));
  const testRows = rows.slice(Math.max(0, rows.length - testN));
  const coefficients = fit(trainRows.length ? trainRows : rows);
  const trainResiduals = trainRows.map((row) => Math.abs(row.target - predictValue(coefficients, row.features)));
  const residualRadius = quantile(trainResiduals, .8);
  const scored = testRows.map((row) => ({ row, prediction: predictValue(coefficients, row.features) }));
  const errors = scored.map(({ row, prediction }) => row.target - prediction);
  const mae = mean(errors.map(Math.abs));
  const rmse = Math.sqrt(mean(errors.map((error) => error ** 2)));
  const targetMean = mean(testRows.map((row) => row.target));
  const denominator = testRows.reduce((sum, row) => sum + (row.target - targetMean) ** 2, 0);
  const r2 = denominator ? 1 - errors.reduce((sum, error) => sum + error ** 2, 0) / denominator : 0;
  const coverage = mean(scored.map(({ row, prediction }) => Number(Math.abs(row.target - prediction) <= residualRadius)));
  const subgroupNames = [...new Set(testRows.map((row) => row.subgroup || "unspecified"))];
  const subgroups = Object.fromEntries(subgroupNames.map((subgroup) => {
    const group = scored.filter(({ row }) => (row.subgroup || "unspecified") === subgroup);
    return [subgroup, { n: group.length, mae: round(mean(group.map(({ row, prediction }) => Math.abs(row.target - prediction)))), coverage: round(mean(group.map(({ row, prediction }) => Number(Math.abs(row.target - prediction) <= residualRadius)))) }];
  }));
  const gateReasons: string[] = [];
  if (rows.length < minimumSample) gateReasons.push(`Need ${minimumSample - rows.length} more consented outcomes`);
  if (testRows.length < 8) gateReasons.push("Temporal holdout has fewer than 8 outcomes");
  if (coverage < .65 || coverage > .95) gateReasons.push("Prediction interval calibration is outside the 65–95% gate");
  if (Object.values(subgroups).some((group) => group.n >= 5 && group.mae > Math.max(mae * 1.75, 0.01))) gateReasons.push("A supported subgroup exceeds the error disparity gate");
  const featureRanges = Array.from({ length: rows[0]?.features.length ?? 0 }, (_, index) => ({ min: Math.min(...rows.map((row) => row.features[index])), max: Math.max(...rows.map((row) => row.features[index])) }));
  return { coefficients: coefficients.map((value) => round(value, 8)), featureRanges, metrics: { n: rows.length, trainN: trainRows.length, testN: testRows.length, mae: round(mae), rmse: round(rmse), r2: round(r2) }, calibration: { interval: .8, residualRadius: round(residualRadius), coverage: round(coverage) }, subgroups, eligible: gateReasons.length === 0, gateReasons };
}

export function applyResponseModel(model: TrainedResponseModel & { status?: string }, features: Array<number | null>) {
  if (model.status && model.status !== "validated") return { status: "abstained", reason: "Model has not passed prospective validation" } as const;
  if (features.some((feature) => feature === null || !Number.isFinite(feature))) return { status: "abstained", reason: "Required input data is missing" } as const;
  const numeric = features as number[];
  if (numeric.some((value, index) => value < model.featureRanges[index].min || value > model.featureRanges[index].max)) return { status: "abstained", reason: "Member is outside the validated feature range" } as const;
  const estimate = predictValue(model.coefficients, numeric);
  return { status: "estimated", estimate: round(estimate), lower: round(estimate - model.calibration.residualRadius), upper: round(estimate + model.calibration.residualRadius), confidence: round(model.calibration.coverage) } as const;
}

export function prospectiveValidationGate(input:{n:number;mae:number;coverage:number;maxSubgroupMaeRatio:number},retrospectiveMae:number){const reasons:string[]=[];if(!Number.isFinite(input.n)||input.n<30)reasons.push("Prospective cohort must contain at least 30 completed outcomes");if(!Number.isFinite(input.mae)||input.mae<0||input.mae>Math.max(retrospectiveMae*1.25,.01))reasons.push("Prospective MAE exceeds the predeclared error gate");if(!Number.isFinite(input.coverage)||input.coverage<.65||input.coverage>.95)reasons.push("Prospective interval coverage is outside 65–95%");if(!Number.isFinite(input.maxSubgroupMaeRatio)||input.maxSubgroupMaeRatio>1.75)reasons.push("Prospective subgroup error disparity exceeds 1.75×");return{passed:reasons.length===0,reasons};}
