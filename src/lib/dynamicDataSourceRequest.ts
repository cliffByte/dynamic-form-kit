import type { DynamicDataSource } from '../types/form';

function parentPlaceholder(ds: DynamicDataSource): string {
  const key = ds.parentValuePath ?? '';
  if (!key) return '';
  return key.startsWith('{') ? key : `{${key}}`;
}

/** Build URL + fetch init for loading dynamic select/checkbox options. */
export function buildDynamicDataSourceRequest(
  ds: DynamicDataSource,
  parentValue?: unknown,
): { url: string; init: RequestInit } {
  let url = ds.url;
  const method = ds.method || 'GET';
  const hasParentField = Boolean(ds.dependsOn && ds.dependsOn !== 'none');
  const hasParent =
    parentValue !== undefined && parentValue !== null && parentValue !== '';

  if (method === 'GET' && ds.parentValuePath && hasParent) {
    url = url.replace(parentPlaceholder(ds), encodeURIComponent(String(parentValue)));
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(ds.headers ?? {}),
  };

  const init: RequestInit = { method, headers };

  if (method === 'POST') {
    const body: Record<string, unknown> = { ...(ds.body ?? {}) };
    if (hasParentField && ds.parentValueParam && hasParent) {
      body[ds.parentValueParam] = parentValue;
    }
    if (Object.keys(body).length > 0) {
      init.body = JSON.stringify(body);
    }
  } else if (hasParentField && ds.parentValueParam && hasParent) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.append(ds.parentValueParam, String(parentValue));
      url = urlObj.toString();
    } catch {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}${encodeURIComponent(ds.parentValueParam)}=${encodeURIComponent(String(parentValue))}`;
    }
  }

  return { url, init };
}

export function formatDataSourceBody(body?: Record<string, unknown>): string {
  if (!body || Object.keys(body).length === 0) return '';
  return JSON.stringify(body, null, 2);
}

export function parseDataSourceBody(
  text: string,
): { ok: true; body: Record<string, unknown> | undefined } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, body: undefined };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: 'Body must be a JSON object (e.g. {"filter": "active"})' };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
}
