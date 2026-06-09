import dayjs, { type Dayjs } from "dayjs";
import type { CheckInRecord } from "@/lib/types";

type FermentationTimingRow = {
  status?: string | null;
  fermentationStart?: string | null;
  startDate?: string | null;
  fermentationEnd?: string | null;
  endDate?: string | null;
  fermentationTimeTarget?: number | string | null;
};

/** Parse API datetimes without timezone shift from stored UTC strings. */
export function parseFermentationDateTime(value: unknown): Dayjs | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const s = String(value).trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (match) {
    const [, y, mo, d, h, mi] = match;
    const parsed = dayjs(`${y}-${mo}-${d}T${h}:${mi}`);
    return parsed.isValid() ? parsed : null;
  }

  const fallback = dayjs(s);
  return fallback.isValid() ? fallback : null;
}

function fermentationStartValue(row: FermentationTimingRow) {
  return row.fermentationStart ?? row.startDate;
}

function plannedEndValue(row: FermentationTimingRow) {
  return row.fermentationEnd ?? row.endDate;
}

export function getEstimatedEndMoment(row: FermentationTimingRow | null): Dayjs | null {
  if (!row || row.status === "Finished") {
    return null;
  }

  const startRaw = fermentationStartValue(row);
  if (!startRaw) {
    return null;
  }

  const start = parseFermentationDateTime(startRaw);
  if (!start) {
    return null;
  }

  const plannedRaw = plannedEndValue(row);
  if (plannedRaw) {
    const planned = parseFermentationDateTime(plannedRaw) || dayjs(plannedRaw);
    if (planned?.isValid?.()) {
      return planned;
    }
  }

  const target = row.fermentationTimeTarget;
  if (target === "" || target == null) {
    return null;
  }

  const hours = parseFloat(String(target));
  if (!Number.isFinite(hours)) {
    return null;
  }

  return start.add(hours, "hour");
}

export function formatEstimatedFinish(row: FermentationTimingRow | null): string {
  const endMoment = getEstimatedEndMoment(row);
  if (!endMoment) {
    return "—";
  }

  return endMoment.format("DD MMM YYYY, HH:mm");
}

export function getLastCheckIn(checkIns: CheckInRecord[]): CheckInRecord | null {
  if (!checkIns.length) {
    return null;
  }

  return [...checkIns].sort((a, b) => {
    const dateA = a.checkInDate?.slice(0, 10) || "";
    const dateB = b.checkInDate?.slice(0, 10) || "";
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }

    const periodRank = (period: string) => (period === "evening" ? 1 : 0);
    const periodDiff = periodRank(b.period) - periodRank(a.period);
    if (periodDiff !== 0) {
      return periodDiff;
    }

    const createdA = a.createdAt || "";
    const createdB = b.createdAt || "";
    return createdB.localeCompare(createdA);
  })[0];
}

export function formatLastCheckIn(record: CheckInRecord | null): string {
  if (!record) {
    return "No check-ins yet";
  }

  const period = record.period === "morning" ? "Morning" : "Evening";

  if (record.createdAt) {
    const created = parseFermentationDateTime(record.createdAt);
    if (created) {
      return `${created.format("DD MMM YYYY, HH:mm")} (${period})`;
    }
  }

  const checkInDate = record.checkInDate?.slice(0, 10);
  if (checkInDate) {
    const date = dayjs(checkInDate);
    if (date.isValid()) {
      return `${date.format("DD MMM YYYY")} (${period})`;
    }
  }

  return period;
}
