const BASE = "badge";

const TONES = {
  neutral: "bg-badge-neutral-bg text-badge-neutral-text",
  info: "bg-badge-info-bg text-badge-info-text",
  active: "bg-badge-active-bg text-badge-active-text",
  warn: "bg-badge-warn-bg text-badge-warn-text",
  error: "bg-badge-error-bg text-badge-error-text",
} as const;

const STATUS_TONES: Record<string, string> = {
  idle: TONES.neutral,
  uploading: TONES.info,
  parsing: TONES.info,
  extracting: TONES.info,
  running: TONES.info,
  done: TONES.active,
  failed: TONES.error,
};

const RELATIONSHIP_TONES: Record<string, string> = {
  SAME_FACT: TONES.active,
  CONTRADICTS: TONES.error,
  CONTEXTUALIZES: TONES.info,
};

export const statusBadge = (status: string) =>
  `${BASE} ${STATUS_TONES[status] ?? TONES.neutral}`;

export const relationshipBadge = (type: string) =>
  `${BASE} ${RELATIONSHIP_TONES[type] ?? TONES.neutral}`;

export const warnBadge = `${BASE} ${TONES.warn}`;
