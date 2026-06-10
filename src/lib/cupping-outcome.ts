export type CuppingOutcomeValue = "Production" | "Good" | "Redo" | "Not Good";

export const CUPPING_OUTCOMES: {
  value: CuppingOutcomeValue;
  label: string;
  badgeClass: string;
  buttonClass: string;
  selectedButtonClass: string;
}[] = [
  {
    value: "Production",
    label: "Production",
    badgeClass: "bg-emerald-600 text-white hover:bg-emerald-600",
    buttonClass: "border-emerald-300 text-emerald-800",
    selectedButtonClass: "bg-emerald-600 text-white hover:bg-emerald-600",
  },
  {
    value: "Good",
    label: "Good",
    badgeClass: "bg-blue-600 text-white hover:bg-blue-600",
    buttonClass: "border-blue-300 text-blue-800",
    selectedButtonClass: "bg-blue-600 text-white hover:bg-blue-600",
  },
  {
    value: "Redo",
    label: "Redo",
    badgeClass: "bg-amber-500 text-white hover:bg-amber-500",
    buttonClass: "border-amber-300 text-amber-900",
    selectedButtonClass: "bg-amber-500 text-white hover:bg-amber-500",
  },
  {
    value: "Not Good",
    label: "Not Good",
    badgeClass: "bg-red-600 text-white hover:bg-red-600",
    buttonClass: "border-red-300 text-red-800",
    selectedButtonClass: "bg-red-600 text-white hover:bg-red-600",
  },
];

export const CUPPING_OUTCOME_VALUES = CUPPING_OUTCOMES.map((o) => o.value);

export function isValidCuppingOutcome(value: string | null | undefined): value is CuppingOutcomeValue {
  return value != null && CUPPING_OUTCOME_VALUES.includes(value as CuppingOutcomeValue);
}

export function getCuppingOutcomeMeta(value: string | null | undefined) {
  return CUPPING_OUTCOMES.find((o) => o.value === value);
}

export type CuppingOutcomeCount = { value: CuppingOutcomeValue; count: number };

export type CuppingBatchSummary = {
  total: number;
  outcomes: Partial<Record<CuppingOutcomeValue, number>>;
};

export function summarizeCuppingOutcomes(
  entries: { cuppingOutcome?: string | null }[]
): CuppingOutcomeCount[] {
  const counts = new Map<CuppingOutcomeValue, number>();

  for (const entry of entries) {
    if (!isValidCuppingOutcome(entry.cuppingOutcome)) continue;
    counts.set(entry.cuppingOutcome, (counts.get(entry.cuppingOutcome) ?? 0) + 1);
  }

  return CUPPING_OUTCOMES.filter((outcome) => counts.has(outcome.value)).map((outcome) => ({
    value: outcome.value,
    count: counts.get(outcome.value) ?? 0,
  }));
}

export function summarizeCuppingBatchSummary(summary: CuppingBatchSummary | undefined): CuppingOutcomeCount[] {
  if (!summary?.outcomes) return [];

  return CUPPING_OUTCOMES.filter((outcome) => (summary.outcomes[outcome.value] ?? 0) > 0).map(
    (outcome) => ({
      value: outcome.value,
      count: summary.outcomes[outcome.value] ?? 0,
    })
  );
}
