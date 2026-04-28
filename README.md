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

## Render a form (create)

```tsx
import { FormRenderer } from '@dynamic-core/form-kit';

export function NewSubmissionPage() {
  return (
    <FormRenderer
      formId="FORM_ID"
      onSubmitSuccess={(result) => console.log('created', result)}
    />
  );
}
```

## View a submission (read-only)

```tsx
import { SubmissionViewer } from '@dynamic-core/form-kit';

export function SubmissionViewPage() {
  return <SubmissionViewer submissionId="SUBMISSION_ID" />;
}
```

## Edit a submission

```tsx
import { SubmissionEditor } from '@dynamic-core/form-kit';

export function SubmissionEditPage() {
  return (
    <SubmissionEditor
      submissionId="SUBMISSION_ID"
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

## Publish (when ready)

From `packages/form-kit`:

1. Bump version in `package.json`
2. `npm publish`

Consumers then install `@dynamic-core/form-kit` normally, and npm pulls this package's `dependencies` automatically.
