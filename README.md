# `@dynamic-core/form-kit` Quick Start

Use this in 30 seconds.

## Install

```bash
npm install @dynamic-core/form-kit
```

Peer deps required by the builder:
- `react`, `react-dom`, `react-dnd`, `react-dnd-html5-backend`, `zustand`

## Styles (no Tailwind needed in the consuming app)

Import the compiled stylesheet once in your app entry:

```ts
import '@dynamic-core/form-kit/styles.css';
```

## Configure (API + i18n)

```tsx
import {
  FormKitProvider,
  createFormKitClient,
} from '@dynamic-core/form-kit';

const client = createFormKitClient({
  baseUrl: 'https://example.com/api',
  // credentials: 'include', // default
  // getHeaders: async () => ({ Authorization: `Bearer ${token}` }),
  // endpoints: { form: '/form', submission: '/submission' },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <FormKitProvider
      value={{
        client,
        locale: 'en',
        t: (k) => k,
      }}>
      {children}
    </FormKitProvider>
  );
}
```

Runtime components no longer fetch by id. Fetch the form (and submission when needed) from your API, then pass the payloads in. You can still use `client.getForm` / `client.getSubmission` from `createFormKitClient`, or your own fetch layer.

## Render a form (create)

```tsx
import { FormRenderer } from '@dynamic-core/form-kit';

export async function NewSubmissionPage({ formId }: { formId: string }) {
  const form = await fetchFormFromYourApi(formId);

  return (
    <FormRenderer
      form={form}
      defaultValues={{ name: 'Hi' }}
      onSubmit={async (values) => {
        const res = await fetch('/api/submission', {
          method: 'POST',
          body: JSON.stringify({ formId, data: values }),
        });
        return res.json();
      }}
      onSubmitSuccess={(result) => console.log('created', result)}
    />
  );
}
```

`form` accepts any shape understood by `extractSchemaFields` (e.g. `{ schema: { fields: [...] } }` or a bare field array).

## View a submission (read-only)

```tsx
import { SubmissionViewer } from '@dynamic-core/form-kit';

export function SubmissionViewPage({
  form,
  submission,
}: {
  form: unknown;
  submission: unknown;
}) {
  return <SubmissionViewer form={form} submission={submission} />;
}
```

## Edit a submission

```tsx
import { SubmissionEditor } from '@dynamic-core/form-kit';

export function SubmissionEditPage({
  form,
  submission,
}: {
  form: unknown;
  submission: unknown;
}) {
  return (
    <SubmissionEditor
      form={form}
      submission={submission}
      onSubmit={async (values) => {
        const res = await fetch('/api/submission/…', {
          method: 'PATCH',
          body: JSON.stringify({ data: values }),
        });
        return res.json();
      }}
      onSubmitSuccess={(result) => console.log('updated', result)}
    />
  );
}
```

## Next.js note

If your Next.js build doesn’t transpile workspace packages, add:

```js
// next.config.js
module.exports = {
  transpilePackages: ['@dynamic-core/form-kit'],
};
```

## In this repo (local dev)

- App install happens in `frontend/`:
  - `cd frontend && npm install`
- Package-only checks (optional):
  - `cd packages/form-kit && npm install && npm run build && npm run typecheck:linked`

## Runtime local demo (hardcoded data)

From `dynamic-form-kit`:

```bash
npm install
npm --prefix demo install
npm run demo
```

Then open [http://localhost:5174](http://localhost:5174).

The demo renders all runtime components with local hardcoded payloads:
- `FormRenderer` (create mode with `defaultValues` by `uniqueIdentifier`)
- `SubmissionViewer` (read-only)
- `SubmissionEditor` (edit mode)

The demo is local-only:
- Demo files live in `demo/` and are not published (`files` only includes `src` and `dist`).
- Demo tooling dependencies are isolated in `demo/package.json`.

## Publish (when ready)

From `packages/form-kit`:

1. Bump version in `package.json`
2. `npm publish`

Consumers then install `@dynamic-core/form-kit` normally, and npm pulls this package's `dependencies` automatically.
