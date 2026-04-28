import type { FormField } from '../../types/form';
import type { FormSubmissionData } from '../../types/submission';

export interface FormKitClientEndpoints {
  form: string; // e.g. "/form"
  submission: string; // e.g. "/submission"
  formTemplate: string; // e.g. "/form-template"
  mediaUpload: string; // e.g. "/media/upload"
}

export interface CreateFormKitClientOptions {
  /**
   * Base URL for API calls.
   * Example: "https://example.com/api"
   */
  baseUrl: string;
  /**
   * Fetch credentials behavior (cookies).
   * Defaults to "include" to match cookie-based sessions.
   */
  credentials?: RequestCredentials;
  /**
   * Provide auth/tenant headers at request-time.
   * Useful when token changes over time.
   */
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  /**
   * Override endpoint paths (relative to baseUrl).
   */
  endpoints?: Partial<FormKitClientEndpoints>;
}

export interface FormKitClient {
  endpoints: FormKitClientEndpoints;
  getForm: (formId: string) => Promise<any>;
  getSubmission: (submissionId: string) => Promise<any>;
  createSubmission: (payload: {
    formId: string;
    data: Record<string, any>;
  }) => Promise<any>;
  updateSubmission: (submissionId: string, payload: { data: Record<string, any> }) => Promise<any>;
  uploadMedia: (formData: FormData) => Promise<{ url: string; filename: string }>;
}

const defaultEndpoints: FormKitClientEndpoints = {
  form: '/form',
  submission: '/submission',
  formTemplate: '/form-template',
  mediaUpload: '/media/upload',
};

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

async function readJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function buildHeaders(
  getHeaders: CreateFormKitClientOptions['getHeaders'],
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const dynamic = (await getHeaders?.()) ?? {};
  return {
    ...dynamic,
    ...(extra ?? {}),
  };
}

async function requestJson<T>(
  opts: CreateFormKitClientOptions,
  url: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: opts.credentials ?? 'include',
  });

  const payload = await readJsonSafe(res);
  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : `HTTP ${res.status}`) ?? `HTTP ${res.status}`;
    throw new Error(message);
  }

  // Many endpoints return { status, data } or { message, data }.
  // Prefer payload.data when present, otherwise return payload as-is.
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as any).data as T;
  }
  return payload as T;
}

export function createFormKitClient(options: CreateFormKitClientOptions): FormKitClient {
  const endpoints: FormKitClientEndpoints = {
    ...defaultEndpoints,
    ...(options.endpoints ?? {}),
  };

  return {
    endpoints,
    getForm: async (formId: string) => {
      const url = joinUrl(options.baseUrl, `${endpoints.form}/${encodeURIComponent(formId)}`);
      const headers = await buildHeaders(options.getHeaders);
      return requestJson<any>(options, url, { method: 'GET', headers });
    },
    getSubmission: async (submissionId: string) => {
      const url = joinUrl(
        options.baseUrl,
        `${endpoints.submission}/${encodeURIComponent(submissionId)}`,
      );
      const headers = await buildHeaders(options.getHeaders);
      return requestJson<any>(options, url, { method: 'GET', headers });
    },
    createSubmission: async (payload: { formId: string; data: Record<string, any> }) => {
      const url = joinUrl(options.baseUrl, endpoints.submission);
      const headers = await buildHeaders(options.getHeaders, {
        'Content-Type': 'application/json',
      });
      return requestJson<any>(options, url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    },
    updateSubmission: async (submissionId: string, payload: { data: Record<string, any> }) => {
      const url = joinUrl(
        options.baseUrl,
        `${endpoints.submission}/${encodeURIComponent(submissionId)}`,
      );
      const headers = await buildHeaders(options.getHeaders, {
        'Content-Type': 'application/json',
      });
      return requestJson<any>(options, url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
    },
    uploadMedia: async (formData: FormData) => {
      const url = joinUrl(options.baseUrl, endpoints.mediaUpload);
      const headers = await buildHeaders(options.getHeaders);
      // Let browser set multipart boundary.
      return requestJson<{ url: string; filename: string }>(options, url, {
        method: 'POST',
        headers,
        body: formData as any,
      });
    },
  };
}

// Types re-export convenience (runtime uses these shapes)
export type { FormField, FormSubmissionData };
