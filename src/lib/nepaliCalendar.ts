import NepaliDate from '@zener/nepali-date';

/** Long BS label in Nepali, e.g. "१५ जेष्ठ २०८२". */
export function formatNepaliDateDisplay(date: Date): string {
  try {
    return new NepaliDate(date).format('D MMMM YYYY', 'np');
  } catch {
    return new NepaliDate(date).toString('np');
  }
}

export function adDateToNepaliDate(date: Date): NepaliDate {
  return new NepaliDate(date);
}

export function nepaliDateToIso(value: NepaliDate | null): string {
  if (!value) return '';
  return value.toADasDate().toISOString();
}

export function isoToNepaliDate(iso: string | undefined): NepaliDate | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return new NepaliDate(parsed);
}

/** Format a stored submission value (ISO string or range) for display. */
export function formatSubmissionDateValue(
  value: unknown,
  useNepaliCalendar: boolean,
  formatEnglish: (date: Date) => string = (date) =>
    date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const formatIso = (iso: string) => {
    const trimmed = iso.trim();
    if (!trimmed) return '';
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed;
    return useNepaliCalendar
      ? formatNepaliDateDisplay(parsed)
      : formatEnglish(parsed);
  };

  if (typeof value === 'object' && !Array.isArray(value)) {
    const range = value as { from?: string; to?: string };
    const from = range.from ? formatIso(range.from) : '';
    const to = range.to ? formatIso(range.to) : '';
    if (from && to) return `${from} - ${to}`;
    if (from) return from;
    if (to) return to;
    return null;
  }

  if (typeof value === 'string') {
    const formatted = formatIso(value);
    return formatted || null;
  }

  return String(value);
}
