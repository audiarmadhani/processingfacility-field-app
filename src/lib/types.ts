export type FermentationBatch = {
  id: number;
  batchNumber: string | null;
  experimentNumber?: string | null;
  referenceNumber?: string | null;
  tank?: string | null;
  tanks?: string[];
  status: string;
  missingPeriod?: "morning" | "evening";
  fermentationStart?: string | null;
  startDate?: string | null;
  fermentationEnd?: string | null;
  endDate?: string | null;
  fermentationTimeTarget?: number | string | null;
};

export type PendingCheckInsResponse = {
  activePeriod: "morning" | "evening" | null;
  inReminderWindow: boolean;
  checkInDate: string;
  pending: FermentationBatch[];
  overdue: FermentationBatch[];
};

export type CheckInRecord = {
  id: number;
  fermentationId: number;
  batchNumber: string;
  period: "morning" | "evening";
  checkInDate: string;
  notes?: string | null;
  imageUrl?: string | null;
  createdBy?: string | null;
  createdAt?: string;
};

export type PipelineBatch = {
  batchNumber: string;
  processingType: string;
  farmerName?: string | null;
  lotNumber?: string | null;
  referenceNumber?: string | null;
  experimentNumber?: string | null;
  status?: string;
  roastCount?: number;
  cuppingCount?: number;
  roastedAt?: string | null;
};

export type RoastPipelineBatch = PipelineBatch & {
  roastPipelineStatus: "awaiting" | "roasted";
};

export type PipelineListsResponse = {
  drying: PipelineBatch[];
  dried: PipelineBatch[];
  roast: PipelineBatch[];
  readyForQc: PipelineBatch[];
};

export type RoastRecord = {
  id: number;
  batchNumber: string;
  processingType: string;
  roastedAt: string;
  roastedBy?: string | null;
  notes?: string | null;
  roastProfile?: string | null;
  endTemp?: number | null;
  firstCrackMinutes?: number | null;
  firstCrackTemp?: number | null;
};

export type CuppingOutcome = "Production" | "Good" | "Redo" | "Not Good";

export type CuppingEntry = {
  id?: number | null;
  cuppedAt: string;
  notes: string;
  cuppingOutcome: CuppingOutcome | null;
  cuppedBy?: string | null;
};
