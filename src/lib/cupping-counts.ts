import axios from "axios";
import { apiUrl } from "@/lib/api";
import { normalizeCuppingCount } from "@/lib/qc";

const CHUNK_SIZE = 20;

async function fetchCuppingSessionCountsFallback(
  batchNumbers: string[]
): Promise<Record<string, number>> {
  const unique = [...new Set(batchNumbers)];
  const counts: Record<string, number> = {};

  for (let index = 0; index < unique.length; index += CHUNK_SIZE) {
    const chunk = unique.slice(index, index + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (batchNumber) => {
        try {
          const res = await axios.get(apiUrl(`/gb-qc/cupping/${encodeURIComponent(batchNumber)}`));
          counts[batchNumber] = Array.isArray(res.data) ? res.data.length : 0;
        } catch {
          counts[batchNumber] = 0;
        }
      })
    );
  }

  return counts;
}

export async function loadCuppingSessionCounts(
  batchNumbers: string[]
): Promise<Record<string, number>> {
  const unique = [...new Set(batchNumbers)];
  if (!unique.length) {
    return {};
  }

  try {
    const res = await axios.get<Record<string, number>>(apiUrl("/gb-qc/cupping-counts"));
    const map = res.data || {};
    return Object.fromEntries(
      unique.map((batchNumber) => [batchNumber, normalizeCuppingCount(map[batchNumber])])
    );
  } catch {
    return fetchCuppingSessionCountsFallback(unique);
  }
}
