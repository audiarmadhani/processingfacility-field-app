import type { CuppingEntry, PipelineBatch, RoastPipelineBatch } from "@/lib/types";

export type CuppingSessionFilter = "all" | "no_sessions" | "has_sessions";
export type RoastPipelineFilter = "all" | "awaiting" | "roasted";

export const ROAST_PROFILES = ["Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"] as const;

export function toDatetimeLocalValue(date = new Date()) {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function emptyCuppingDraft() {
  return {
    cuppedAt: new Date().toISOString().slice(0, 10),
    notes: "",
    okForFurtherProcess: null as boolean | null,
    editingIndex: null as number | null,
  };
}

export function mapCuppingEntry(entry: {
  id?: number | null;
  cuppedAt?: string | null;
  notes?: string | null;
  okForFurtherProcess?: boolean | null;
  cuppedBy?: string | null;
}): CuppingEntry {
  return {
    id: entry.id,
    cuppedAt: entry.cuppedAt ? String(entry.cuppedAt).slice(0, 10) : "",
    notes: entry.notes || "",
    okForFurtherProcess: entry.okForFurtherProcess ?? null,
    cuppedBy: entry.cuppedBy || null,
  };
}

export function isCuppingEntryComplete(entry: {
  cuppedAt?: string;
  notes?: string;
  okForFurtherProcess?: boolean | null;
}) {
  return (
    !!entry.cuppedAt &&
    typeof entry.notes === "string" &&
    entry.notes.trim() !== "" &&
    entry.okForFurtherProcess !== null
  );
}

export function buildCuppingOnlyPayload(
  cuppingEntries: CuppingEntry[],
  cuppedBy: string,
  isCompleted = false
) {
  return {
    kelembapan: 0,
    waterActivity: 0,
    triage: 0,
    bijiHitam: 0,
    bijiHitamSebagian: 0,
    bijiHitamPecah: 0,
    kopiGelondong: 0,
    bijiCoklat: 0,
    kulitKopiBesar: 0,
    kulitKopiSedang: 0,
    kulitKopiKecil: 0,
    bijiBerKulitTanduk: 0,
    kulitTandukBesar: 0,
    kulitTandukSedang: 0,
    kulitTandukKecil: 0,
    bijiPecah: 0,
    bijiMuda: 0,
    bijiBerlubangSatu: 0,
    bijiBerlubangLebihSatu: 0,
    bijiBertutul: 0,
    rantingBesar: 0,
    rantingSedang: 0,
    rantingKecil: 0,
    totalBobotKotoran: 0,
    seranggaHidup: null,
    bijiBauBusuk: null,
    cuppingEntries: cuppingEntries.map((entry) => ({
      id: entry.id,
      cuppedAt: entry.cuppedAt,
      notes: entry.notes.trim(),
      okForFurtherProcess: entry.okForFurtherProcess,
    })),
    cuppedBy,
    isCompleted,
  };
}

export function formatTankLabel(batch: { tank?: string | null; tanks?: string[] }) {
  if (batch.tanks?.length) return batch.tanks.join(", ");
  return batch.tank || "—";
}

export function periodLabel(period?: string | null) {
  if (period === "evening") return "Evening";
  if (period === "morning") return "Morning";
  return "Outside window";
}

export function matchesPipelineSearch(
  batch: {
    batchNumber: string;
    experimentNumber?: string | number | null;
    processingType?: string | null;
  },
  query: string
) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }

  const batchNumber = String(batch.batchNumber || "").toLowerCase();
  const experiment = String(batch.experimentNumber ?? "").toLowerCase();
  const processingType = String(batch.processingType || "").toLowerCase();
  const experimentQuery = q.replace(/^exp\s*/i, "").trim();

  return (
    batchNumber.includes(q) ||
    (experiment !== "" &&
      (experiment.includes(experimentQuery) ||
        experiment.includes(q) ||
        `exp ${experiment}`.includes(q))) ||
    processingType.includes(q)
  );
}

export function compareBatchNumbers(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true });
}

export function sortPipelineByBatchNumber<T extends { batchNumber: string }>(batches: T[]) {
  return [...batches].sort((a, b) => compareBatchNumbers(a.batchNumber, b.batchNumber));
}

export function normalizeCuppingCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

export function resolveCuppingSessionCount(
  batch: PipelineBatch,
  sessionCounts: Record<string, number>
) {
  if (Object.prototype.hasOwnProperty.call(sessionCounts, batch.batchNumber)) {
    return sessionCounts[batch.batchNumber];
  }
  return normalizeCuppingCount(batch.cuppingCount);
}

export function mergeRoastPipelineBatches(
  awaiting: PipelineBatch[],
  roasted: PipelineBatch[]
): RoastPipelineBatch[] {
  return [
    ...awaiting.map((batch) => ({ ...batch, roastPipelineStatus: "awaiting" as const })),
    ...roasted.map((batch) => ({ ...batch, roastPipelineStatus: "roasted" as const })),
  ];
}

export function filterRoastPipelineBatches(
  batches: RoastPipelineBatch[],
  roastFilter: RoastPipelineFilter
) {
  if (roastFilter === "all") {
    return batches;
  }
  if (roastFilter === "awaiting") {
    return batches.filter((batch) => batch.roastPipelineStatus === "awaiting");
  }
  return batches.filter((batch) => batch.roastPipelineStatus === "roasted");
}

export function normalizeRoastCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

export function filterCuppingBatchesBySessions(
  batches: PipelineBatch[],
  sessionFilter: CuppingSessionFilter,
  sessionCounts: Record<string, number> = {}
) {
  if (sessionFilter === "all") {
    return batches;
  }

  return batches.filter((batch) => {
    const count = resolveCuppingSessionCount(batch, sessionCounts);
    if (sessionFilter === "no_sessions") {
      return count === 0;
    }
    return count > 0;
  });
}
