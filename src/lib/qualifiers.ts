type Qualifiers = {
  time: string | null;
  scope: string | null;
  location: string | null;
};

export function qualifiersText(q: Qualifiers): string {
  return [
    q.time && `time: ${q.time}`,
    q.scope && `scope: ${q.scope}`,
    q.location && `location: ${q.location}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
