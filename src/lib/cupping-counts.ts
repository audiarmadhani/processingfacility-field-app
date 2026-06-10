import axios from "axios";
import { apiUrl } from "@/lib/api";
import {
  type CuppingBatchSummary,
  isValidCuppingOutcome,
  summarizeCuppingOutcomes,
} from "@/lib/cupping-outcome";
import { normalizeCuppingCount } from "@/lib/qc";

const CHUNK_SIZE = 20;
const EMPTY_SUMMARY: CuppingBatchSummary = { total: 0, outcomes: {} };

async function fetchCuppingSummariesFallback(
  batchNumbers: string[]
): Promise<Record<string, CuppingBatchSummary>> {
  const unique = [...new Set(batchNumbers)];
  const summaries: Record<string, CuppingBatchSummary> = {};

  for (let index = 0; index < unique.length; index += CHUNK_SIZE) {
    const chunk = unique.slice(index, index + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (batchNumber) => {
        try {
          const res = await axios.get(apiUrl(`/gb-qc/cupping/${encodeURIComponent(batchNumber)}`));
          const entries = Array.isArray(res.data) ? res.data : [];
          const outcomes: CuppingBatchSummary["outcomes"] = {};

          for (const entry of entries as { cuppingOutcome?: string | null }[]) {
            if (!isValidCuppingOutcome(entry.cuppingOutcome)) continue;
            const outcome = entry.cuppingOutcome;
            outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
          }

          summaries[batchNumber] = {
            total: entries.length,
            outcomes,
          };
        } catch {
          summaries[batchNumber] = { ...EMPTY_SUMMARY };
        }
      })
    );
  }

  return summaries;
}

export async function loadCuppingSummaries(
  batchNumbers: string[]
): Promise<Record<string, CuppingBatchSummary>> {
  const unique = [...new Set(batchNumbers)];
  if (!unique.length) {
    return {};
  }

  try {
    const res = await axios.get<Record<string, CuppingBatchSummary>>(apiUrl("/gb-qc/cupping-summary"));
    const map = res.data || {};

    return Object.fromEntries(
      unique.map((batchNumber) => [
        batchNumber,
        map[batchNumber] ?? { ...EMPTY_SUMMARY },
      ])
    );
  } catch {
    return fetchCuppingSummariesFallback(unique);
  }
}

export function cuppingSummariesToSessionCounts(
  summaries: Record<string, CuppingBatchSummary>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(summaries).map(([batchNumber, summary]) => [
      batchNumber,
      normalizeCuppingCount(summary.total),
    ])
  );
}

export async function loadCuppingSessionCounts(
  batchNumbers: string[]
): Promise<Record<string, number>> {
  const summaries = await loadCuppingSummaries(batchNumbers);
  return cuppingSummariesToSessionCounts(summaries);
}
