import type { FormField } from '../types/form';
import { getChoiceFieldValue } from './formUtils';

type MediaFileLike = {
  id?: string;
  url?: string;
  name?: string;
  size?: number;
  type?: string;
  preview?: string;
  file?: File;
};

/** Parse maxFiles from schema (handles string values and snake_case from API). */
export function parseMediaMaxFiles(field: FormField): number {
  const raw =
    field.maxFiles ?? (field as { max_files?: unknown }).max_files;
  const n = typeof raw === 'string' ? parseInt(raw, 10) : Number(raw);
  if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  return 1;
}

/** Normalize stored form value to a file list for the media field UI. */
export function normalizeMediaFieldValue(value: unknown): MediaFileLike[] {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value as MediaFileLike[];
  if (typeof value === 'object') return [value as MediaFileLike];
  return [];
}

/** Shape written back to form state (array when multi-upload is allowed). */
export function toMediaFieldValue(
  files: MediaFileLike[],
  allowMultiple: boolean,
): MediaFileLike | MediaFileLike[] | null {
  if (files.length === 0) return allowMultiple ? [] : null;
  return allowMultiple ? files : files[0];
}

/** True when the media field allows more than one file. maxFiles wins over legacy `multiple: false`. */
export function isMediaMultipleField(field: FormField): boolean {
  if (parseMediaMaxFiles(field) > 1) return true;
  return field.multiple === true;
}

/** Effective upload cap for a media field. */
export function getMediaMaxFiles(field: FormField): number {
  const fromConfig = parseMediaMaxFiles(field);
  if (fromConfig > 1) return fromConfig;
  if (field.multiple === true) return 10;
  return 1;
}

/** Max bytes per file (default 10 MB). */
export function getMediaMaxSize(field: FormField): number {
  const raw = field.maxSize ?? (field as { max_size?: unknown }).max_size;
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return 10 * 1024 * 1024;
}

/** Max combined bytes for all files (optional). */
export function getMediaMaxTotalSize(field: FormField): number | undefined {
  const raw =
    field.maxTotalSize ?? (field as { max_total_size?: unknown }).max_total_size;
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return undefined;
}

export function formatMediaFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface MediaUploadValidationResult {
  accepted: File[];
  errors: string[];
}

/** Client-side checks before adding files to a media field. */
export function validateMediaUploadSelection(
  incoming: File[],
  currentFiles: MediaFileLike[],
  options: {
    allowMultiple: boolean;
    maxFiles: number;
    maxSize: number;
    maxTotalSize?: number;
  },
): MediaUploadValidationResult {
  const errors: string[] = [];
  const { allowMultiple, maxFiles, maxSize, maxTotalSize } = options;

  if (incoming.length === 0) {
    return { accepted: [], errors: [] };
  }

  const toProcess = allowMultiple ? Array.from(incoming) : [incoming[0]];

  if (allowMultiple) {
    const remaining = maxFiles - currentFiles.length;
    if (remaining <= 0) {
      errors.push(
        `Maximum ${maxFiles} file${maxFiles === 1 ? '' : 's'} allowed`,
      );
      return { accepted: [], errors };
    }
    if (toProcess.length > remaining) {
      errors.push(
        `Maximum ${maxFiles} file${maxFiles === 1 ? '' : 's'} allowed. You can add ${remaining} more.`,
      );
      return { accepted: [], errors };
    }
  }

  const accepted: File[] = [];
  let pendingTotal = currentFiles.reduce((sum, f) => sum + (f.size || 0), 0);

  for (const file of toProcess) {
    if (file.size > maxSize) {
      errors.push(
        `${file.name} exceeds the maximum size of ${formatMediaFileSize(maxSize)} per file`,
      );
      continue;
    }

    if (
      maxTotalSize !== undefined &&
      pendingTotal + file.size > maxTotalSize
    ) {
      errors.push(
        `Total file size exceeds the maximum of ${formatMediaFileSize(maxTotalSize)}`,
      );
      continue;
    }

    accepted.push(file);
    pendingTotal += file.size;
  }

  return { accepted, errors };
}

export interface MediaValueShape {
  id?: string;
  url?: string;
  name?: string;
  size?: number;
  type?: string;
  preview?: string;
  file?: File;
}

type UploadMediaFn = (
  formData: FormData,
) => Promise<{ url: string; filename: string }>;

function isMediaValue(value: unknown): value is MediaValueShape {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasPendingUpload(item: MediaValueShape): boolean {
  return item.file instanceof File && !item.url;
}

function toSubmittedMediaItem(
  item: MediaValueShape,
  uploadedUrl?: string,
): Record<string, unknown> {
  const url = uploadedUrl ?? item.url;
  const out: Record<string, unknown> = {
    name: item.name,
    size: item.size,
    type: item.type,
  };
  if (item.id) out.id = item.id;
  if (url) out.url = url;
  return out;
}

async function uploadMediaItem(
  item: unknown,
  uploadMedia: UploadMediaFn,
): Promise<unknown> {
  if (!isMediaValue(item)) return item;

  if (!hasPendingUpload(item)) {
    return toSubmittedMediaItem(item);
  }

  const formData = new FormData();
  formData.append('file', item.file!);
  const data = await uploadMedia(formData);
  if (!data?.url) {
    throw new Error(`Failed to upload ${item.name ?? 'file'}`);
  }

  return toSubmittedMediaItem(item, data.url);
}

async function processMediaFieldValue(
  value: unknown,
  field: FormField,
  uploadMedia: UploadMediaFn,
): Promise<unknown> {
  if (isMediaMultipleField(field)) {
    const items = normalizeMediaFieldValue(value);
    if (items.length === 0) return value;
    return Promise.all(items.map((item) => uploadMediaItem(item, uploadMedia)));
  }

  if (value == null || value === '') return value;
  return uploadMediaItem(value, uploadMedia);
}

async function walkFields(
  fieldList: FormField[],
  values: Record<string, any>,
  uploadMedia: UploadMediaFn,
): Promise<void> {
  for (const field of fieldList) {
    if (field.isHidden) continue;

    if (field.type === 'step_section' || field.type === 'ui_section') {
      if (field.fields?.length) {
        await walkFields(field.fields, values, uploadMedia);
      }
      continue;
    }

    if (field.type === 'media' && field.mediaMode !== 'preview') {
      if (values[field.id] !== undefined) {
        values[field.id] = await processMediaFieldValue(
          values[field.id],
          field,
          uploadMedia,
        );
      }
      continue;
    }

    if (field.type === 'array' && field.fields?.length) {
      const rows = values[field.id];
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row && typeof row === 'object') {
            await walkFields(field.fields, row as Record<string, any>, uploadMedia);
          }
        }
      }
      continue;
    }

    if (field.optionConfigs?.length) {
      const val = getChoiceFieldValue(values[field.id]);
      for (const opt of field.optionConfigs) {
        const isSelected = Array.isArray(val)
          ? val.includes(opt.value)
          : val === opt.value;
        if (isSelected && opt.nestedForm?.fields?.length) {
          await walkFields(opt.nestedForm.fields, values, uploadMedia);
        }
      }
    }
  }
}

/**
 * Uploads any media field values that still hold a local `File` (deferred upload).
 * Returns a new values object with `url` set and `file` / `preview` stripped.
 */
export async function uploadPendingMediaInValues(
  values: Record<string, any>,
  fields: FormField[],
  uploadMedia: UploadMediaFn,
): Promise<Record<string, any>> {
  const next = { ...values };
  await walkFields(fields, next, uploadMedia);
  return next;
}

export function mediaValueIsComplete(value: unknown): boolean {
  if (value == null || value === '') return false;
  if (Array.isArray(value)) {
    return (
      value.length > 0 &&
      value.every(
        (item) =>
          isMediaValue(item) && (Boolean(item.url) || item.file instanceof File),
      )
    );
  }
  return (
    isMediaValue(value) && (Boolean(value.url) || value.file instanceof File)
  );
}
