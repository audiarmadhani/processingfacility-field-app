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
