import type { FormField } from '../types/form';

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
  if (field.multiple) {
    if (!Array.isArray(value)) return value;
    return Promise.all(value.map((item) => uploadMediaItem(item, uploadMedia)));
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
      const val = values[field.id];
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
