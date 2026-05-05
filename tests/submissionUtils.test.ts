import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapDefaultValuesToFieldIds } from '../src/lib/submissionUtils';

const ID_NAME = '8723f4ed-be40-491b-8fe9-41ac70e2674e';
const ID_NEPALI = '4b9c6189-43f4-4145-ae7b-74481db42a1b';

const fields = [
  {
    id: ID_NAME,
    type: 'text',
    label: 'Name',
    uniqueIdentifier: 'NAME',
    isHidden: false,
  },
  {
    id: 'section-1',
    type: 'ui_section',
    label: 'Section',
    isHidden: false,
    fields: [
      {
        id: ID_NEPALI,
        type: 'text',
        label: 'Nepali Name',
        uniqueIdentifier: 'NEPALI_NAME',
        isHidden: false,
      },
    ],
  },
] as any[];

test('defaults by id work', () => {
  const mapped = mapDefaultValuesToFieldIds(fields, {
    [ID_NAME]: 'Hello',
    [ID_NEPALI]: 'नमस्ते',
  });

  assert.equal(mapped[ID_NAME], 'Hello');
  assert.equal(mapped[ID_NEPALI], 'नमस्ते');
});

test('defaults by uniqueIdentifier work', () => {
  const mapped = mapDefaultValuesToFieldIds(fields, {
    NAME: 'Hello',
    NEPALI_NAME: 'नमस्ते',
  });

  assert.equal(mapped[ID_NAME], 'Hello');
  assert.equal(mapped[ID_NEPALI], 'नमस्ते');
});

test('id key overrides uniqueIdentifier value on conflict', () => {
  const mapped = mapDefaultValuesToFieldIds(fields, {
    NAME: 'FromUniqueIdentifier',
    [ID_NAME]: 'FromId',
  });

  assert.equal(mapped[ID_NAME], 'FromId');
});

test('unknown keys are preserved', () => {
  const mapped = mapDefaultValuesToFieldIds(fields, {
    UNKNOWN_FIELD_KEY: 'keep-me',
  });

  assert.equal(mapped.UNKNOWN_FIELD_KEY, 'keep-me');
});
