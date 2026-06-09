export const FERMENTATION_ALLOWED_ROLES = ["admin", "manager", "staff"] as const;
export const GB_QC_ALLOWED_ROLES = ["admin", "manager", "postprocessing"] as const;

export function canAccessFermentation(role?: string | null) {
  return !!role && FERMENTATION_ALLOWED_ROLES.includes(role as (typeof FERMENTATION_ALLOWED_ROLES)[number]);
}

export function canAccessQc(role?: string | null) {
  return !!role && GB_QC_ALLOWED_ROLES.includes(role as (typeof GB_QC_ALLOWED_ROLES)[number]);
}
