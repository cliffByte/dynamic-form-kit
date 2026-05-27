# `@dynamic-core/form-kit`

React library for **building**, **filling out**, and **viewing** dynamic forms.

- **Form builder** — drag-and-drop admin UI to design fields  
- **Runtime** — `FormRenderer`, `SubmissionViewer`, `SubmissionEditor` for end users  
- **Validation** — Zod schemas generated from your field definitions  
- **Optional API helper** — `createFormKitClient` for standard REST endpoints (or use your own fetch layer)

This document is a **generic integration guide** for any React application. Install from npm and follow the steps below.

---

## Requirements

| Requirement | Version |
|-------------|---------|
| React | ^18.2 or ^19 |
| React DOM | ^18.2 or ^19 |

All other UI/runtime libraries (Radix, react-hook-form, Zod, react-dnd, Leaflet, etc.) are **dependencies of this package**. You do not add them to your app unless you use them directly for other reasons.

---

## Installation

```bash
npm install @dynamic-core/form-kit
```

```bash
yarn add @dynamic-core/form-kit
```

```bash
pnpm add @dynamic-core/form-kit
```

---

## Integration checklist

Use this order in a new app:

1. Install the package (above).  
2. Add `@import "@dynamic-core/form-kit/tailwind.css"` to globals (see **§1 Styles**).  
3. Wrap your app (or the routes that use forms) in **`FormKitProvider`**.  
4. Configure **locale**, **`t()`** for labels, and **API methods** (client and/or your own functions).  
5. Render **`FormRenderer`** / **`SubmissionViewer`** / **`SubmissionEditor`** with **`form`** and **`submission`** objects loaded by **your** data layer.  
6. (Optional) Add **`FormBuilder`** on an admin route, still inside `FormKitProvider`.  
7. (Next.js only) Add **`transpilePackages: ['@dynamic-core/form-kit']`** if the bundler does not compile the package automatically.

Runtime components **never fetch by ID themselves**. Your app loads data, then passes it in as props (you may use `createFormKitClient` or any HTTP client you already use).

---

## 1. Styles

Form-kit uses your app’s **existing shadcn theme** (`:root` CSS variables such as `--background`, `--primary`, etc.). It does **not** reset `body` or redefine `:root` when integrated correctly.

### A. Host app uses Tailwind + shadcn (recommended)

**Do not** import `@dynamic-core/form-kit/styles.css` — that duplicates Tailwind utilities and can clash with your app.

Add to your global CSS (after `@import "tailwindcss"`):

```css
@import "tailwindcss";
@import "@dynamic-core/form-kit/tailwind.css";
@import "tw-animate-css";
```

`tailwind.css` scans form-kit sources (`@source`) and includes PhoneInput + map styles. Use PostCSS with `@tailwindcss/postcss` in the host app.

Wrap your app in **`FormKitProvider`** at the root (see §2). It loads third-party field CSS (phone, leaflet, nepali datepicker) automatically and wraps children in **`FormKitRoot`**.

### B. Standalone app (no Tailwind in the host)

```ts
import '@dynamic-core/form-kit/styles.css';
import '@dynamic-core/form-kit/theme.css'; // only if the host has no shadcn :root theme
```

Wrap routes in **`FormKitProvider`**.

### Exports

| File | Purpose |
|------|---------|
| `@dynamic-core/form-kit/tailwind.css` | Host integration — `@source` scan + PhoneInput + map |
| `@dynamic-core/form-kit/styles.css` | Prebuilt utilities for non-Tailwind apps only |
| `@dynamic-core/form-kit/theme.css` | Optional `:root` / `.dark` tokens for standalone apps |
| `@dynamic-core/form-kit/map.css` | Leaflet fixes (included via `tailwind.css`) |

If controls look unstyled, confirm `tailwind.css` is imported in globals and **`FormKitProvider`** wraps the route.

---

## 2. `FormKitProvider` (required)

All builder and runtime components expect context from **`FormKitProvider`**.

### Minimal provider (bring your own API)

```tsx
'use client';

import { FormKitProvider } from '@dynamic-core/form-kit';
// Standalone only:
// import '@dynamic-core/form-kit/styles.css';
// import '@dynamic-core/form-kit/theme.css';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <FormKitProvider
      value={{
        locale: 'en',
        t: (key) => key,
        getForm: async (formId) => {
          const res = await fetch(`/api/forms/${formId}`);
          if (!res.ok) throw new Error('Failed to load form');
          return res.json();
        },
        createSubmission: async ({ formId, data }) => {
          const res = await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formId, data }),
          });
          if (!res.ok) throw new Error('Submit failed');
          return res.json();
        },
        getSubmission: async (submissionId) => {
          const res = await fetch(`/api/submissions/${submissionId}`);
          if (!res.ok) throw new Error('Failed to load submission');
          return res.json();
        },
        updateSubmission: async (submissionId, { data }) => {
          const res = await fetch(`/api/submissions/${submissionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
          });
          if (!res.ok) throw new Error('Update failed');
          return res.json();
        },
        uploadMedia: async (formData) => {
          const res = await fetch('/api/media/upload', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error('Upload failed');
          const json = await res.json();
          return { url: json.url, filename: json.filename };
        },
        listFormTemplates: async () => [],
        saveFormTemplate: async () => {
          throw new Error('saveFormTemplate not implemented');
        },
        deleteFormTemplate: async () => {
          throw new Error('deleteFormTemplate not implemented');
        },
      }}>
      {children}
    </FormKitProvider>
  );
}
```

Implement only the methods your app needs. Unused builder methods can throw or no-op if you do not use `FormBuilder`.

### Provider with `createFormKitClient` (optional)

If your backend matches the default paths, use the built-in client:

| Method | Default path (relative to `baseUrl`) |
|--------|--------------------------------------|
| `getForm` | `GET /form/:id` |
| `getSubmission` | `GET /submission/:id` |
| `createSubmission` | `POST /submission` |
| `updateSubmission` | `PATCH /submission/:id` |
| `uploadMedia` | `POST /media/upload` |

```tsx
import {
  FormKitProvider,
  createFormKitClient,
} from '@dynamic-core/form-kit';

const client = createFormKitClient({
  baseUrl: 'https://api.example.com',
  credentials: 'include',
  getHeaders: async () => ({
    Authorization: `Bearer ${yourToken}`,
  }),
  endpoints: {
    form: '/form',
    submission: '/submission',
    formTemplate: '/form-template',
    mediaUpload: '/media/upload',
  },
});

<FormKitProvider
  value={{
    client,
    locale: 'en',
    t: (key) => yourI18n(key),
    listFormTemplates: async () => { /* your template list */ },
    saveFormTemplate: async (payload) => { /* your save */ },
    deleteFormTemplate: async (id) => { /* your delete */ },
  }}
>
  {children}
</FormKitProvider>
```

When `client` is set, `getForm`, `getSubmission`, `createSubmission`, `updateSubmission`, and `uploadMedia` on the provider **default to the client** unless you override them explicitly in `value`.

Access context anywhere below the provider:

```tsx
import { useFormKit } from '@dynamic-core/form-kit';

const { getForm, createSubmission, locale, t } = useFormKit();
```

---

## 3. Render a form (create submission)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { FormRenderer, useFormKit } from '@dynamic-core/form-kit';

export function CreateSubmissionPage({ formId }: { formId: string }) {
  const { getForm, createSubmission } = useFormKit();
  const [form, setForm] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getForm(formId)
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : 'Load failed'));
  }, [formId, getForm]);

  if (error) return <p>{error}</p>;
  if (!form) return <p>Loading…</p>;

  return (
    <FormRenderer
      form={form}
      defaultValues={{
        /* optional: field id or uniqueIdentifier → value */
      }}
      onSubmit={(values) => createSubmission({ formId, data: values })}
      onSubmitSuccess={() => {
        /* navigate or toast */
      }}
      onSubmitError={(err) => {
        console.error(err);
      }}
    />
  );
}
```

### `form` prop shape

`FormRenderer` accepts any JSON your API returns, as long as fields can be extracted. Supported shapes include:

- `{ schema: { fields: FormField[] } }`  
- `{ fields: FormField[] }`  
- `FormField[]` (top-level array)

Use `extractSchemaFields(form)` from the package if you need the array explicitly.

Submitted `values` are keyed by **field `id`** (nested structure for sections/arrays/tables is preserved).

### Multi-step forms (`step_section`)

When the schema has **two or more** consecutive `step_section` fields, `FormRenderer` automatically shows:

- Step progress (completed / current / upcoming)
- Per-step validation before **Next**
- Full-form Zod validation on final **Submit**
- Root-level fields outside the step group render on the **last** step

```tsx
<FormRenderer
  form={form}
  stepLabels={{
    previous: 'Back',
    next: 'Continue',
    reset: 'Clear',
  }}
  showReset
  onSubmit={handleSubmit}
/>
```

Set `enableMultiStep={false}` to render all steps on one page (legacy flat layout).  
Helpers: `groupStepSections`, `isMultiStepWizard`, `MultiStepProgress`, `MultiStepFormNav`.

---

## 4. View a submission (read-only)

```tsx
import { SubmissionViewer } from '@dynamic-core/form-kit';

<SubmissionViewer
  form={form}
  submission={submission}
/>;
```

`submission` is typically `{ data: { [fieldId]: value, ... } } }` or your API wrapper; the component normalizes via `extractSubmissionValues`.

---

## 5. Edit a submission

```tsx
import { SubmissionEditor, useFormKit } from '@dynamic-core/form-kit';

function EditSubmissionPage({
  form,
  submission,
  submissionId,
}: {
  form: unknown;
  submission: unknown;
  submissionId: string;
}) {
  const { updateSubmission } = useFormKit();

  return (
    <SubmissionEditor
      form={form}
      submission={submission}
      onSubmit={(values) => updateSubmission(submissionId, { data: values })}
      onSubmitSuccess={() => { /* done */ }}
    />
  );
}
```

---

## 6. Form builder (admin UI)

```tsx
'use client';

import { useState } from 'react';
import { FormBuilder, type FormField } from '@dynamic-core/form-kit';

export function FormDesignerPage() {
  const [fields, setFields] = useState<FormField[]>([]);

  return (
    <FormBuilder
      fields={fields}
      setFields={setFields}
    />
  );
}
```

- Must be under **`FormKitProvider`**.  
- Uses **`saveFormTemplate`**, **`uploadMedia`**, **`listFormTemplates`**, **`deleteFormTemplate`** from context when you wire template persistence.  
- Persist `fields` to your backend as the form schema.

---

## 7. Next.js (App Router)

1. Install the package.  
2. Import styles in **`app/layout.tsx`** (or a client layout wrapper).  
3. Create a client **`Providers`** component with `FormKitProvider`.  
4. Use runtime components in **client** pages (`'use client'`).

```tsx
// app/providers.tsx
'use client';

import { FormKitProvider, createFormKitClient } from '@dynamic-core/form-kit';

const client = createFormKitClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FormKitProvider value={{ client, locale: 'en', t: (k) => k }}>
      {children}
    </FormKitProvider>
  );
}
```

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@dynamic-core/form-kit'],
};

module.exports = nextConfig;
```

If you use **Turbopack** in a monorepo, set `turbopack.root` to your workspace root only if Next fails to resolve the package—this is a Next/monorepo concern, not a form-kit requirement.

---

## 8. Vite / Create React App

```tsx
// main.tsx
// Standalone only:
import '@dynamic-core/form-kit/styles.css';
import '@dynamic-core/form-kit/theme.css';
import { FormKitProvider } from '@dynamic-core/form-kit';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <FormKitProvider value={{ locale: 'en', t: (k) => k, /* ...api */ }}>
    <App />
  </FormKitProvider>,
);
```

No special bundler config is usually required; the package ships compiled JS in `dist/`.

---

## Package exports (overview)

| Export | Use case |
|--------|----------|
| `FormKitProvider`, `useFormKit` | Required context |
| `createFormKitClient` | Optional REST helper |
| `FormRenderer` | New submission |
| `SubmissionViewer` | Read-only |
| `SubmissionEditor` | Edit submission |
| `FormBuilder`, `FieldPalette`, `FormCanvas`, `FieldEditor` | Admin builder |
| `FormFieldRenderer`, `*Field` | Low-level (advanced) |
| `Display*Field` | Read-only field display |
| `validateFormWithZod` | Standalone validation |
| `extractSchemaFields`, `extractSubmissionValues`, `cleanSubmissionData` | Data helpers |
| `FormField`, `FormTemplate` | TypeScript types |

Entry: `@dynamic-core/form-kit`  
Styles: `@dynamic-core/form-kit/styles.css`

---

## Internationalization

- Set **`locale`** on `FormKitProvider` (`'en'`, `'ne'`, etc.).  
- Implement **`t(key: string)`** for UI strings (builder chrome, preview labels). Field labels can come from `field.translations` on each `FormField`.  
- Use `useLocalizedField` / `getLocalizedField` from the package when building custom UIs.

---

## Table field (schema options)

Configured in the builder under **Table configuration** and **Configure Table**.

| `tableExpandDirection` | Behavior |
|------------------------|----------|
| `'rows'` (default) | Fixed columns; user adds **rows** at the bottom |
| `'columns'` | Fixed row labels; user adds **columns** to the right |

| Property | Description |
|----------|-------------|
| `tableMode` | `'dynamic'` or `'matrix'` (fixed rows when matrix cell defaults exist) |
| `tableColumns` | Column definitions (type, label, formula, …) |
| `tableRows` | Row labels (matrix / column-expand) |
| `minItems` / `maxItems` | Min/max rows or columns (default min `0`) |
| `tableShowSerialNumber` | Row mode: optional SN column (not stored in submission data) |
| `tableSerialNumberLabel` | SN header (default `"SN"`) |
| `showTableFooter` | Totals for number/calculated fields |

---

## Field types

`text`, `email`, `phone`, `number`, `textarea`, `select`, `multi_select`, `checkbox`, `radio`, `date`, `rating`, `range`, `matrix`, `table`, `array`, `map`, `media`, `calculated`, `rich_text`, `rich_text_input`, `step_section`, `ui_section`, and more.

Full schema: **`FormField`** in published types (`dist/index.d.ts`).

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Unstyled inputs/buttons | `@import "@dynamic-core/form-kit/tailwind.css"` in globals? `FormKitProvider` at app root? |
| “FormKit: client is not configured” | `FormKitProvider` missing or `getForm` / `createSubmission` not implemented |
| Changes after npm link / local path | Rebuild package (`npm run build` in form-kit) and reinstall in the app; runtime uses **`dist/`** |
| Next.js compile errors | `transpilePackages: ['@dynamic-core/form-kit']` |
| Duplicate React hooks error | Single React version; only one copy of `react` / `react-dom` |
| Empty form | `form` prop shape; run `extractSchemaFields(form)` to verify fields array |

---

## Local demo (no API)

Clone this repository and run the Vite demo:

```bash
cd form-kit
npm install
npm --prefix demo install
npm run demo
```

Open [http://localhost:5174](http://localhost:5174).

---

## License

ISC
