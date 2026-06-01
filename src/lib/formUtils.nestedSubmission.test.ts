import { describe, expect, it } from 'vitest';
import type { FormField } from '../types/form';
import {
  NESTED_OPTION_SELECTION_KEY,
  buildNullNestedSubmissionData,
  cleanSubmissionData,
} from './formUtils';

function makeChoiceWithNestedFields(): FormField[] {
  return [
    {
      id: 'parent',
      type: 'select',
      label: 'Parent',
      required: false,
      optionConfigs: [
        {
          label: 'Option A',
          value: 'opt_a',
          nestedForm: {
            id: 'nf_a',
            name: 'Nested A',
            fields: [
              {
                id: 'child_a',
                type: 'text',
                label: 'Child A',
                required: false,
                default_value: 'default-a',
              },
            ],
          },
        },
        {
          label: 'Option B',
          value: 'opt_b',
          nestedForm: {
            id: 'nf_b',
            name: 'Nested B',
            fields: [
              {
                id: 'child_b',
                type: 'text',
                label: 'Child B',
                required: false,
                default_value: 'default-b',
              },
            ],
          },
        },
      ],
    },
  ];
}

describe('cleanSubmissionData nested options', () => {
  it('saves null for nested children when parent option is not selected', () => {
    const fields = makeChoiceWithNestedFields();
    const formData = {
      parent: 'opt_a',
      child_a: 'user answer',
      child_b: 'leaked default',
    };

    const cleaned = cleanSubmissionData(formData, fields);

    expect(cleaned.parent[NESTED_OPTION_SELECTION_KEY]).toBe('opt_a');
    expect(cleaned.parent.opt_a).toEqual({ child_a: 'user answer' });
    expect(cleaned.parent.opt_b).toEqual({ child_b: null });
    expect(cleaned.child_a).toBeUndefined();
    expect(cleaned.child_b).toBeUndefined();
  });

  it('does not apply schema defaults to unselected nested fields', () => {
    const fields = makeChoiceWithNestedFields();
    const formData = {
      parent: 'opt_a',
      child_a: 'filled',
    };

    const cleaned = cleanSubmissionData(formData, fields);
    expect(cleaned.parent.opt_b.child_b).toBeNull();
  });

  it('buildNullNestedSubmissionData nulls every nested field id', () => {
    const fields = makeChoiceWithNestedFields();
    const nestedFields = fields[0].optionConfigs![1].nestedForm!.fields;
    expect(buildNullNestedSubmissionData(nestedFields)).toEqual({
      child_b: null,
    });
  });
});
