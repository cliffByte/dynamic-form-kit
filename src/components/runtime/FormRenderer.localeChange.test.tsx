// @vitest-environment jsdom
import React, { useState } from 'react';
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { FormKitProvider } from '../../context/FormKitContext';
import { FormRenderer } from './FormRenderer';
import { SubmissionEditor } from './SubmissionEditor';

beforeAll(() => {
  window.scrollTo = vi.fn() as any;
  Element.prototype.scrollIntoView = vi.fn();
  // Radix primitives (radio indicator, etc.) require ResizeObserver.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

afterEach(cleanup);

type HarnessProps = {
  formProps: Record<string, any>;
  editor?: boolean;
};

function renderWithLocale(
  formProps: Record<string, any>,
  { initialLocale = 'en', editor = false }: { initialLocale?: string; editor?: boolean } = {},
) {
  const control: { setLocale: (l: string) => void } = { setLocale: () => {} };

  function Harness({ formProps, editor }: HarnessProps) {
    const [locale, setLocale] = useState(initialLocale);
    control.setLocale = setLocale;
    const Component = editor ? SubmissionEditor : FormRenderer;
    return (
      <FormKitProvider value={{ locale }}>
        <Component onSubmit={() => {}} {...(formProps as any)} />
      </FormKitProvider>
    );
  }

  const utils = render(<Harness formProps={formProps} editor={editor} />);
  return {
    ...utils,
    setLocale: (l: string) => act(() => control.setLocale(l)),
    rerenderForm: (nextProps: Record<string, any>) =>
      utils.rerender(<Harness formProps={nextProps} editor={editor} />),
  };
}

const textField = {
  id: 'name',
  type: 'text',
  label: 'Name',
  translations: { label: { en: 'Name', ne: 'नाम' } },
};

describe('FormRenderer locale change', () => {
  it('keeps typed text values and re-localizes labels when locale changes', () => {
    const { setLocale } = renderWithLocale({ form: { fields: [textField] } });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Shishir Adhikari' } });
    expect(input.value).toBe('Shishir Adhikari');

    setLocale('ne');

    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      'Shishir Adhikari',
    );
    expect(screen.getByText('नाम')).toBeTruthy();

    setLocale('en');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      'Shishir Adhikari',
    );
    expect(screen.getByText('Name')).toBeTruthy();
  });

  it('stays on the current wizard step when locale changes', () => {
    const form = {
      fields: [
        {
          id: 'step-1',
          type: 'step_section',
          label: 'Step One',
          translations: { label: { en: 'Step One', ne: 'चरण एक' } },
          fields: [{ id: 'f1', type: 'text', label: 'Field One' }],
        },
        {
          id: 'step-2',
          type: 'step_section',
          label: 'Step Two',
          translations: { label: { en: 'Step Two', ne: 'चरण दुई' } },
          fields: [{ id: 'f2', type: 'text', label: 'Field Two' }],
        },
      ],
    };

    const { setLocale } = renderWithLocale({ form });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(
      screen.getByRole('heading', { name: /Step Two/ }),
    ).toBeTruthy();

    setLocale('ne');

    // Still on step 2, with the re-localized label.
    expect(
      screen.getByRole('heading', { name: /चरण दुई/ }),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /चरण एक/ })).toBeNull();

    setLocale('en');
    expect(
      screen.getByRole('heading', { name: /Step Two/ }),
    ).toBeTruthy();
  });

  it('remaps a simple-options select value across locales and submits the localized value', async () => {
    const onSubmit = vi.fn();
    const form = {
      fields: [
        {
          id: 'color',
          type: 'select',
          label: 'Color',
          options: ['Red', 'Blue'],
          translations: {
            options: { en: ['Red', 'Blue'], ne: ['रातो', 'नीलो'] },
          },
        },
      ],
    };

    const { setLocale } = renderWithLocale({
      form,
      defaultValues: { color: 'Red' },
      onSubmit,
    });

    setLocale('ne');
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ color: 'रातो' });

    setLocale('en');
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1][0]).toMatchObject({ color: 'Red' });
  });

  it('keeps a radio selection through an en -> ne -> en round trip', () => {
    const form = {
      fields: [
        {
          id: 'agree',
          type: 'radio',
          label: 'Agree?',
          options: ['Yes', 'No'],
          translations: {
            options: { en: ['Yes', 'No'], ne: ['हो', 'होइन'] },
          },
        },
      ],
    };

    const { setLocale } = renderWithLocale({ form });

    fireEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    expect(
      screen.getByRole('radio', { name: 'Yes' }).getAttribute('aria-checked'),
    ).toBe('true');

    setLocale('ne');
    expect(
      screen.getByRole('radio', { name: 'हो' }).getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen.getByRole('radio', { name: 'होइन' }).getAttribute('aria-checked'),
    ).toBe('false');

    setLocale('en');
    expect(
      screen.getByRole('radio', { name: 'Yes' }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('remaps checkbox array values across locales', () => {
    const form = {
      fields: [
        {
          id: 'fruits',
          type: 'checkbox',
          label: 'Fruits',
          options: ['Apple', 'Banana', 'Cherry'],
          translations: {
            options: {
              en: ['Apple', 'Banana', 'Cherry'],
              ne: ['स्याउ', 'केरा', 'चेरी'],
            },
          },
        },
      ],
    };

    const { setLocale } = renderWithLocale({ form });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Apple' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cherry' }));

    setLocale('ne');
    expect(
      screen.getByRole('checkbox', { name: 'स्याउ' }).getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen.getByRole('checkbox', { name: 'केरा' }).getAttribute('aria-checked'),
    ).toBe('false');
    expect(
      screen.getByRole('checkbox', { name: 'चेरी' }).getAttribute('aria-checked'),
    ).toBe('true');

    setLocale('en');
    expect(
      screen.getByRole('checkbox', { name: 'Apple' }).getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen.getByRole('checkbox', { name: 'Cherry' }).getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('still resets state when the form prop changes', () => {
    const { rerenderForm } = renderWithLocale({ form: { fields: [textField] } });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'typed value' } });
    expect(input.value).toBe('typed value');

    // Structurally identical but a NEW object: must reset like before.
    rerenderForm({ form: { fields: [{ ...textField }] } });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
  });

  it('still resets state when the submission prop changes', () => {
    const form = { fields: [textField] };
    const { rerenderForm } = renderWithLocale({
      form,
      submission: { data: { name: 'first' } },
    });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('first');
    fireEvent.change(input, { target: { value: 'edited' } });

    rerenderForm({ form, submission: { data: { name: 'second' } } });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      'second',
    );
  });
});

describe('SubmissionEditor locale change', () => {
  it('inherits the fix: edited values persist across locale changes', () => {
    const { setLocale } = renderWithLocale(
      { form: { fields: [textField] }, submission: { data: { name: 'saved' } } },
      { editor: true },
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'edited mid-form' } });

    setLocale('ne');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
      'edited mid-form',
    );
    expect(screen.getByText('नाम')).toBeTruthy();
  });
});
