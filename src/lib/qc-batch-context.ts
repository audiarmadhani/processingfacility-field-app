import axios from "axios";
import { apiUrl } from "@/lib/api";

export type QcBatchContext = {
  farmerName: string | null;
  description: string | null;
  purpose: string | null;
};

export function formatReceivingFarmerName(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const names = parsed.map((name) => String(name).trim()).filter(Boolean);
        return names.length ? names.join(", ") : null;
      }
    } catch {
      // fall through to raw string
    }
  }

  return raw;
}

export async function loadQcBatchContext(batchNumber: string): Promise<QcBatchContext> {
  const [receivingRes, fermentationRes] = await Promise.all([
    axios
      .get<Array<{ farmerName?: string | null }>>(apiUrl(`/receiving/${encodeURIComponent(batchNumber)}`))
      .catch(() => ({ data: [] as Array<{ farmerName?: string | null }> })),
    axios
      .get<Array<{ id?: number; description?: string | null; purpose?: string | null }>>(
        apiUrl(`/fermentation/details/${encodeURIComponent(batchNumber)}`)
      )
      .catch(() => ({ data: [] as Array<{ id?: number; description?: string | null; purpose?: string | null }> })),
  ]);

  const receivingRow = Array.isArray(receivingRes.data) ? receivingRes.data[0] : null;
  const fermentationRows = Array.isArray(fermentationRes.data) ? fermentationRes.data : [];
  const latestFermentation = [...fermentationRows].sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];

  return {
    farmerName: formatReceivingFarmerName(receivingRow?.farmerName),
    description: latestFermentation?.description?.trim() || null,
    purpose: latestFermentation?.purpose?.trim() || null,
  };
}
