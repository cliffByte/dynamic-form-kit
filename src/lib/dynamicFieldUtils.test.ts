import { describe, expect, it } from 'vitest';
import type { FormField } from '../types/form';
import {
  buildDynamicFieldsFetchSignature,
  extractDataAtPath,
  getDynamicFieldFetchKey,
  getDynamicParentFieldId,
  mapResponseToDynamicOptions,
} from './dynamicFieldUtils';

describe('dynamicFieldUtils', () => {
  it('treats dependsOn "none" as no parent dependency', () => {
    expect(
      getDynamicParentFieldId({ url: '/api', path: 'data', valueField: 'id', labelField: 'name', dependsOn: 'none' }),
    ).toBeUndefined();
  });

  it('builds stable fetch keys for independent dynamic fields', () => {
    const field: FormField = {
      id: 'city',
      type: 'select',
      label: 'City',
      required: false,
      isDynamic: true,
      dataSource: {
        url: '/api/cities',
        path: 'data',
        valueField: 'id',
        labelField: 'name',
        dependsOn: 'none',
      },
    };

    expect(getDynamicFieldFetchKey(field, {})).toBe('city:__no_parent__');
    expect(buildDynamicFieldsFetchSignature([field], {})).toBe('city:__no_parent__');
  });

  it('includes parent value in fetch signature for cascading fields', () => {
    const field: FormField = {
      id: 'ward',
      type: 'select',
      label: 'Ward',
      required: false,
      isDynamic: true,
      dataSource: {
        url: '/api/wards',
        path: 'data',
        valueField: 'id',
        labelField: 'name',
        dependsOn: 'district',
      },
    };

    expect(getDynamicFieldFetchKey(field, { district: 'kathmandu' })).toBe(
      'ward:kathmandu',
    );
  });

  it('uses the raw response when path is empty (matches preview modal)', () => {
    const ds = {
      url: '/api/items',
      path: '',
      valueField: 'id',
      labelField: 'name',
    };
    const payload = [{ id: '1', name: 'One' }];
    expect(extractDataAtPath(payload, '')).toBe(payload);
    expect(mapResponseToDynamicOptions(payload, ds)).toEqual([
      { value: '1', label: 'One' },
    ]);
  });

  it('extracts nested arrays using dot path', () => {
    const ds = {
      url: '/api/items',
      path: 'data.list',
      valueField: 'id',
      labelField: 'name',
    };
    const payload = { data: { list: [{ id: 'a', name: 'Alpha' }] } };
    expect(mapResponseToDynamicOptions(payload, ds)).toEqual([
      { value: 'a', label: 'Alpha' },
    ]);
  });

  it('maps localized labels when labelFieldTranslations are configured', () => {
    const ds = {
      url: '/api/items',
      path: 'data',
      valueField: 'id',
      labelField: 'value.en',
      labelFieldTranslations: { ne: 'value.ne' },
    };
    const payload = {
      data: [
        { id: '1', value: { en: 'One', ne: 'एक' } },
        { id: '2', value: { en: 'Two', ne: 'दुई' } },
      ],
    };
    expect(mapResponseToDynamicOptions(payload, ds)).toEqual([
      { value: '1', label: { en: 'One', ne: 'एक' } },
      { value: '2', label: { en: 'Two', ne: 'दुई' } },
    ]);
  });
});
