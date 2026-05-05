import React, { useMemo, useState } from "react";
import {
  FormKitProvider,
  FormRenderer,
  SubmissionEditor,
  SubmissionViewer,
} from "../../src";

const FIELD_ID_NAME = "8723f4ed-be40-491b-8fe9-41ac70e2674e";
const FIELD_ID_NEPALI = "4b9c6189-43f4-4145-ae7b-74481db42a1b";

const demoForm = {
  id: "local-demo-form",
  schema: [
    {
      id: FIELD_ID_NAME,
      type: "text",
      label: "Text Field",
      isHidden: false,
      required: true,
      placeholder: "Enter text...",
      uniqueIdentifier: "NAME",
      translations: {
        label: { en: "", ne: "" },
        content: { en: "", ne: "" },
        options: { en: [], ne: [] },
        matrixRows: { en: [], ne: [] },
        instruction: { en: "", ne: "" },
        placeholder: { en: "", ne: "" },
        matrixColumns: { en: [], ne: [] },
        stepDescription: { en: "", ne: "" },
      },
    },
    {
      id: FIELD_ID_NEPALI,
      type: "nepali_unicode",
      label: "Nepali input here",
      isHidden: false,
      required: false,
      placeholder: "type in nepali",
      uniqueIdentifier: "NEPALI_NAME",
      translations: {
        label: { en: "", ne: "" },
        content: { en: "", ne: "" },
        options: { en: [], ne: [] },
        matrixRows: { en: [], ne: [] },
        instruction: { en: "", ne: "" },
        placeholder: { en: "", ne: "" },
        matrixColumns: { en: [], ne: [] },
        stepDescription: { en: "", ne: "" },
      },
    },
  ],
};

type SubmissionShape = {
  id: string;
  data: Record<string, string>;
};

export function App(): React.ReactElement {
  const [createValues, setCreateValues] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown> | null>(
    null,
  );

  const demoSubmission = useMemo<SubmissionShape>(
    () => ({
      id: "local-demo-submission",
      data: {
        [FIELD_ID_NAME]: "Existing name",
        [FIELD_ID_NEPALI]: "नमस्ते",
      },
    }),
    [],
  );

  return (
    <FormKitProvider value={{ locale: "en", t: (key) => key }}>
      <main className="mx-auto max-w-4xl space-y-10 p-6">
        <h1 className="text-2xl font-semibold">Dynamic Form Kit Local Demo</h1>

        <section className="space-y-3 rounded-md border p-4">
          <h2 className="text-xl font-medium">FormRenderer (Create)</h2>
          <p className="text-sm text-muted-foreground">
            Uses <code>uniqueIdentifier</code> keys in defaultValues.
          </p>
          <FormRenderer
            form={demoForm}
            defaultValues={{
              NAME: "Hello",
              NEPALI_NAME: "नमस्ते autofilled",
            }}
            onSubmit={async (values) => {
              setCreateValues(values);
              return values;
            }}
          />
          {createValues && (
            <pre className="overflow-auto rounded bg-muted p-3 text-xs">
              {JSON.stringify(createValues, null, 2)}
            </pre>
          )}
        </section>

        <section className="space-y-3 rounded-md border p-4">
          <h2 className="text-xl font-medium">SubmissionViewer (Read-only)</h2>
          <SubmissionViewer form={demoForm} submission={demoSubmission} />
        </section>

        <section className="space-y-3 rounded-md border p-4">
          <h2 className="text-xl font-medium">SubmissionEditor (Edit)</h2>
          <SubmissionEditor
            form={demoForm}
            submission={demoSubmission}
            onSubmit={async (values) => {
              setEditValues(values);
              return values;
            }}
          />
          {editValues && (
            <pre className="overflow-auto rounded bg-muted p-3 text-xs">
              {JSON.stringify(editValues, null, 2)}
            </pre>
          )}
        </section>
      </main>
    </FormKitProvider>
  );
}
