import { describe, expect, it } from 'vitest';
import type { FormField } from '../types/form';
import {
  applyFieldVisibility,
  collectVisibleFields,
  groupStepSections,
  hasRenderableNestedFormFields,
  validateVisibleFields,
} from './formStepStructure';

function makeTextField(
  id: string,
  overrides: Partial<FormField> = {},
): FormField {
  return {
    id,
    type: 'text',
    label: id,
    required: false,
    ...overrides,
  };
}

describe('applyFieldVisibility', () => {
  it('does nothing when hide is not true', () => {
    const fields = [makeTextField('field_a', { hideable: true })];
    expect(applyFieldVisibility(fields, false)).toBe(fields);
    expect(applyFieldVisibility(fields, undefined)).toBe(fields);
    expect(applyFieldVisibility(fields)[0].isHidden).toBeFalsy();
  });

  it('hides hideable fields when hide is true', () => {
    const fields = [
      makeTextField('field_a', { hideable: true }),
      makeTextField('field_b'),
    ];
    const result = applyFieldVisibility(fields, true);
    expect(result[0].isHidden).toBe(true);
    expect(result[1].isHidden).toBeFalsy();
  });

  it('does not hide hideable fields when hide is false', () => {
    const fields = [makeTextField('field_a', { hideable: true })];
    const visible = collectVisibleFields(fields, {});
    expect(visible.map((f) => f.id)).toEqual(['field_a']);
  });

  it('always hides isHidden fields regardless of hide prop', () => {
    const fields = [makeTextField('field_a', { isHidden: true, hideable: true })];
    const withoutHide = collectVisibleFields(fields, {});
    const withHide = collectVisibleFields(applyFieldVisibility(fields, true), {});
    expect(withoutHide).toHaveLength(0);
    expect(withHide).toHaveLength(0);
  });

  it('hides hideable nested fields when hide is true', () => {
    const fields: FormField[] = [
      {
        id: 'section',
        type: 'ui_section',
        label: 'Section',
        required: false,
        fields: [makeTextField('nested_field', { hideable: true })],
      },
    ];
    const result = applyFieldVisibility(fields, true);
    expect(result[0].isHidden).toBeFalsy();
    expect(result[0].fields?.[0].isHidden).toBe(true);
  });

  it('hides hideable step sections when hide is true', () => {
    const fields: FormField[] = [
      {
        id: 'step1',
        type: 'step_section',
        label: 'Step 1',
        required: false,
        hideable: true,
        fields: [makeTextField('s1_field')],
      },
    ];
    const result = applyFieldVisibility(fields, true);
    expect(result[0].isHidden).toBe(true);
  });

  it('merges static isHidden with runtime hide', () => {
    const fields = [makeTextField('field_a', { isHidden: true })];
    const result = applyFieldVisibility(fields, true);
    expect(result[0].isHidden).toBe(true);
  });
});

describe('hidden sections and validation', () => {
  const requiredChild = makeTextField('required_child', { required: true });

  it('collectVisibleFields excludes children of hidden ui_section', () => {
    const fields: FormField[] = [
      {
        id: 'hidden_section',
        type: 'ui_section',
        label: 'Hidden',
        required: false,
        isHidden: true,
        fields: [requiredChild],
      },
    ];
    const visible = collectVisibleFields(fields, {});
    expect(visible.map((f) => f.id)).toEqual([]);
  });

  it('validateVisibleFields passes when required children are under hidden section', () => {
    const fields: FormField[] = [
      {
        id: 'hidden_section',
        type: 'ui_section',
        label: 'Hidden',
        required: false,
        isHidden: true,
        fields: [requiredChild],
      },
    ];
    const result = validateVisibleFields(fields, {});
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('groupStepSections omits runtime-hidden hideable steps', () => {
    const fields: FormField[] = [
      {
        id: 'step1',
        type: 'step_section',
        label: 'Step 1',
        required: false,
        hideable: true,
        fields: [makeTextField('s1_field')],
      },
      {
        id: 'step2',
        type: 'step_section',
        label: 'Step 2',
        required: false,
        fields: [makeTextField('s2_field')],
      },
    ];
    const effective = applyFieldVisibility(fields, true);
    const structure = groupStepSections(effective);
    expect(structure.stepGroups).toHaveLength(1);
    expect(structure.stepGroups[0].steps).toHaveLength(1);
    expect(structure.stepGroups[0].steps[0].id).toBe('step2');
  });

  it('validateVisibleFields passes for hideable section with required children when hide is true', () => {
    const fields: FormField[] = [
      {
        id: 'hideable_section',
        type: 'ui_section',
        label: 'Hideable',
        required: false,
        hideable: true,
        fields: [requiredChild],
      },
    ];
    const effective = applyFieldVisibility(fields, true);
    const result = validateVisibleFields(effective, {});
    expect(result.isValid).toBe(true);
  });
});

describe('hasRenderableNestedFormFields', () => {
  it('returns false when every nested field is hidden', () => {
    const fields: FormField[] = [
      makeTextField('hidden_child', { isHidden: true, default_value: 'x' }),
    ];
    expect(hasRenderableNestedFormFields(fields, {})).toBe(false);
  });

  it('returns true when at least one nested field is visible', () => {
    const fields: FormField[] = [
      makeTextField('hidden_child', { isHidden: true }),
      makeTextField('visible_child'),
    ];
    expect(hasRenderableNestedFormFields(fields, {})).toBe(true);
  });
});
