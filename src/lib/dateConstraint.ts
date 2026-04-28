export function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function resolveDateConstraint(constraint?: string): Date | undefined {
  if (!constraint) return undefined;

  if (constraint === 'today') {
    return normalizeDate(new Date());
  }

  const parsed = new Date(constraint);
  if (isNaN(parsed.getTime())) return undefined;

  return normalizeDate(parsed);
}

export function isTodayConstraint(constraint?: string): boolean {
  return constraint === 'today';
}
