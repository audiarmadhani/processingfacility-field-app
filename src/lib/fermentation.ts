import type { FermentationBatch } from "@/lib/types";
import { compareBatchNumbers } from "@/lib/qc";

export const ALL_TANKS_FILTER = "all";
export const NO_TANK_FILTER = "none";

export function getBatchTankCodes(batch: { tank?: string | null; tanks?: string[] }) {
  const fromArray = (batch.tanks || []).map((tank) => tank.trim()).filter(Boolean);
  if (fromArray.length) {
    return [...new Set(fromArray)];
  }

  if (!batch.tank?.trim()) {
    return [];
  }

  return [...new Set(batch.tank.split(",").map((tank) => tank.trim()).filter(Boolean))];
}

export function collectTankFilterOptions(batches: FermentationBatch[]) {
  const tankSet = new Set<string>();
  let hasUnassigned = false;

  for (const batch of batches) {
    const tanks = getBatchTankCodes(batch);
    if (!tanks.length) {
      hasUnassigned = true;
      continue;
    }
    for (const tank of tanks) {
      tankSet.add(tank);
    }
  }

  const tanks = [...tankSet].sort((a, b) => compareBatchNumbers(a, b));
  return { tanks, hasUnassigned };
}

export function batchMatchesTankFilter(
  batch: FermentationBatch,
  tankFilter: string
) {
  if (tankFilter === ALL_TANKS_FILTER) {
    return true;
  }

  const tanks = getBatchTankCodes(batch);

  if (tankFilter === NO_TANK_FILTER) {
    return tanks.length === 0;
  }

  return tanks.includes(tankFilter);
}
