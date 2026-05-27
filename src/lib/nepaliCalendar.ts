import NepaliDate from '@zener/nepali-date';

/** BS storage/display: day-month-year in Nepali digits, e.g. "२०-०२-२०८३". */
export const NEPALI_DATE_STORAGE_FORMAT = 'D-MM-YYYY';

const NEPALI_DIGITS = '०१२३४५६७८९';

export function nepaliToEnglishDigits(str: string): string {
  return str.replace(/[०-९]/g, (d) => String(NEPALI_DIGITS.indexOf(d)));
}

/** Split BS date parts (supports dash or legacy space separators). */
function splitNepaliDateParts(value: string): string[] {
  return nepaliToEnglishDigits(value)
    .split(/[-\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function isNepaliDateStorageString(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('T')) return false;
  const parts = splitNepaliDateParts(trimmed);
  if (parts.length !== 3) return false;
  const [day, month, year] = parts.map((p) => Number(p));
  return (
    Number.isFinite(day) &&
    Number.isFinite(month) &&
    Number.isFinite(year) &&
    day >= 1 &&
    day <= 32 &&
    month >= 1 &&
    month <= 12 &&
    year >= 2000 &&
    year <= 2100
  );
}

/** Format AD date as BS label with numeric month, e.g. "२०-०२-२०८३". */
export function formatNepaliDateDisplay(date: Date): string {
  try {
    return new NepaliDate(date).format(NEPALI_DATE_STORAGE_FORMAT, 'np');
  } catch {
    return new NepaliDate(date).toString('np');
  }
}

export function adDateToNepaliDate(date: Date): NepaliDate {
  return new NepaliDate(date);
}

/** Persist picker value in BS display format (not ISO). */
export function nepaliDateToStorageValue(value: NepaliDate | null): string {
  if (!value) return '';
  return value.format(NEPALI_DATE_STORAGE_FORMAT, 'np');
}

/** @deprecated Use nepaliDateToStorageValue — kept for existing imports. */
export function nepaliDateToIso(value: NepaliDate | null): string {
  return nepaliDateToStorageValue(value);
}

/** Parse stored value (BS display string or legacy ISO) to AD Date. */
export function parseNepaliDateStorageValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (!isNepaliDateStorageString(trimmed)) return null;

  const [dayStr, monthStr, yearStr] = splitNepaliDateParts(trimmed);
  const day = Number(dayStr);
  const month = Number(monthStr);
  const year = Number(yearStr);

  try {
    return new NepaliDate(year, month - 1, day).toADasDate();
  } catch {
    return null;
  }
}

export function parseStoredDateValue(
  value: string,
  useNepaliCalendar = false,
): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (useNepaliCalendar) {
    const nepali = parseNepaliDateStorageValue(trimmed);
    if (nepali) return nepali;
  }

  const iso = new Date(trimmed);
  if (!Number.isNaN(iso.getTime())) return iso;

  if (!useNepaliCalendar) {
    return parseNepaliDateStorageValue(trimmed);
  }

  return null;
}

export function storageValueToNepaliDate(
  value: string | undefined,
): NepaliDate | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const ad = parseNepaliDateStorageValue(trimmed);
  if (ad) {
    try {
      return new NepaliDate(ad);
    } catch {
      return null;
    }
  }

  return null;
}

/** Safe value for @zener/nepali-datepicker-react (expects NepaliDate, not BS strings). */
export function toNepaliPickerValue(
  value: string | undefined,
): NepaliDate | undefined {
  const parsed = storageValueToNepaliDate(value);
  if (!parsed) return undefined;
  try {
    parsed.format(NEPALI_DATE_STORAGE_FORMAT, 'np');
    return parsed;
  } catch {
    return undefined;
  }
}

/** Normalize form values (string, Date, ISO) for the Nepali picker storage format. */
export function coerceDateStorageValue(
  raw: unknown,
  useNepaliCalendar: boolean,
): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed || undefined;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return useNepaliCalendar
      ? nepaliDateToStorageValue(new NepaliDate(raw))
      : raw.toISOString();
  }
  return undefined;
}

/** @deprecated Use storageValueToNepaliDate */
export function isoToNepaliDate(iso: string | undefined): NepaliDate | null {
  return storageValueToNepaliDate(iso);
}

/** Format a stored submission value (BS string, ISO, or range) for display. */
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

  const formatStored = (stored: string) => {
    const trimmed = stored.trim();
    if (!trimmed) return '';

    if (useNepaliCalendar) {
      const parsed = parseStoredDateValue(trimmed, true);
      if (parsed) return formatNepaliDateDisplay(parsed);
      if (isNepaliDateStorageString(trimmed)) return trimmed;
      return trimmed;
    }

    const parsed = parseStoredDateValue(trimmed, false);
    if (parsed) return formatEnglish(parsed);
    return trimmed;
  };

  if (typeof value === 'object' && !Array.isArray(value)) {
    const range = value as { from?: string; to?: string };
    const from = range.from ? formatStored(range.from) : '';
    const to = range.to ? formatStored(range.to) : '';
    if (from && to) return `${from} - ${to}`;
    if (from) return from;
    if (to) return to;
    return null;
  }

  if (typeof value === 'string') {
    const formatted = formatStored(value);
    return formatted || null;
  }

  return String(value);
}
