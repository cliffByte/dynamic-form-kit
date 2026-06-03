import { describe, expect, it } from 'vitest';
import {
  mergeFieldUpdate,
  reconcileSchemaPreserveCascades,
  updateFieldById,
} from './fieldOperations';
import type { DynamicDataSource, FormField } from '../types/form';

describe('mergeFieldUpdate', () => {
  it('deep-merges dataSource patches without dropping dependsOn', () => {
    const field: FormField = {
      id: 'child',
      type: 'select',
      label: 'Local level',
      required: false,
      isDynamic: true,
      dataSource: {
        url: 'https://api.example.com/municipalities',
        path: 'municipalities',
        valueField: 'id',
        labelField: 'name',
        dependsOn: 'district-id',
      },
    };

    const merged = mergeFieldUpdate(field, {
      // mergeFieldUpdate treats dataSource as a patch; cast here to satisfy FormField typing
      dataSource: ({ path: 'updated.path' } as unknown) as DynamicDataSource,
    });

    expect(merged.dataSource?.dependsOn).toBe('district-id');
    expect(merged.dataSource?.path).toBe('updated.path');
    expect(merged.dataSource?.url).toBe('https://api.example.com/municipalities');
  });
});

describe('updateFieldById dataSource merge', () => {
  it('preserves dependsOn when patching nested field inside ui_section', () => {
    const fields: FormField[] = [
      {
        id: 'section',
        type: 'ui_section',
        label: 'Section',
        required: false,
        fields: [
          {
            id: 'district-id',
            type: 'select',
            label: 'District',
            required: false,
            isDynamic: true,
            dataSource: {
              url: 'https://api.example.com/districts',
              path: 'districts',
              valueField: 'id',
              labelField: 'name',
            },
          },
          {
            id: 'child',
            type: 'select',
            label: 'Local level',
            required: false,
            isDynamic: true,
            dataSource: {
              url: 'https://api.example.com/municipalities',
              path: 'municipalities',
              valueField: 'id',
              labelField: 'name',
            },
          },
        ],
      },
    ];

    const updated = updateFieldById(fields, 'child', {
      // updateFieldById deep-merges dataSource patches; cast here to satisfy FormField typing
      dataSource: ({ dependsOn: 'district-id' } as unknown) as DynamicDataSource,
    });

    const child = updated[0].fields?.find((f) => f.id === 'child');
    expect(child?.dataSource?.dependsOn).toBe('district-id');
    expect(child?.dataSource?.url).toBe('https://api.example.com/municipalities');
  });
});

describe('reconcileSchemaPreserveCascades', () => {
  it('preserves dependsOn when incoming child dataSource omits it', () => {
    const current: FormField[] = [
      {
        id: 'province-id',
        type: 'select',
        label: 'Province',
        required: false,
        isDynamic: true,
        dataSource: {
          url: 'https://api.example.com/provinces',
          path: 'provinces',
          valueField: 'id',
          labelField: 'name',
        },
      },
      {
        id: 'child',
        type: 'select',
        label: 'District',
        required: false,
        isDynamic: true,
        dataSource: {
          url: 'https://api.example.com/districts',
          path: 'districts',
          valueField: 'id',
          labelField: 'name',
          dependsOn: 'province-id',
          parentValueParam: 'provinceId',
        },
      },
    ];

    const incoming: FormField[] = [
      current[0],
      {
        ...current[1],
        dataSource: {
          url: 'https://api.example.com/districts',
          path: 'districts',
          valueField: 'id',
          labelField: 'name',
        },
      },
    ];

    const reconciled = reconcileSchemaPreserveCascades(current, incoming);
    const child = reconciled.find((f) => f.id === 'child');
    expect(child?.dataSource?.dependsOn).toBe('province-id');
  });

  it('preserves dependsOn when incoming has parentValuePath but dropped dependsOn', () => {
    const current: FormField[] = [
      {
        id: 'child',
        type: 'select',
        label: 'District',
        required: false,
        isDynamic: true,
        dataSource: {
          url: 'https://backend.example.com/public/address/districts',
          path: 'districts',
          valueField: 'id',
          labelField: 'name',
          dependsOn: 'province-id',
          parentValuePath: 'id',
        },
      },
    ];

    const incoming: FormField[] = [
      {
        ...current[0],
        dataSource: {
          url: 'https://backend.example.com/public/address/districts',
          path: 'districts',
          valueField: 'id',
          labelField: 'name',
          dependsOn: undefined,
          parentValuePath: 'id',
        },
      },
    ];

    const reconciled = reconcileSchemaPreserveCascades(current, incoming);
    expect(reconciled[0].dataSource?.dependsOn).toBe('province-id');
    expect(reconciled[0].dataSource?.parentValuePath).toBe('id');
  });

  it('preserves full dataSource when incoming child loses dataSource entirely', () => {
    const current: FormField[] = [
      {
        id: 'child',
        type: 'select',
        label: 'District',
        required: false,
        isDynamic: true,
        dataSource: {
          url: 'https://api.example.com/districts',
          path: 'districts',
          valueField: 'id',
          labelField: 'name',
          dependsOn: 'province-id',
        },
      },
    ];

    const incoming: FormField[] = [
      {
        id: 'child',
        type: 'select',
        label: 'District',
        required: false,
        isDynamic: true,
      },
    ];

    const reconciled = reconcileSchemaPreserveCascades(current, incoming);
    expect(reconciled[0].dataSource?.dependsOn).toBe('province-id');
    expect(reconciled[0].dataSource?.url).toBe('https://api.example.com/districts');
  });
});

describe('cascade sync scenario (store ahead of external)', () => {
  it('merge + reconcile keeps dependsOn after partial external-shaped update', () => {
    const storeChild: FormField = {
      id: 'child',
      type: 'select',
      label: 'District',
      required: false,
      isDynamic: true,
      dataSource: {
        url: 'https://api.example.com/districts',
        path: 'districts',
        valueField: 'id',
        labelField: 'name',
        dependsOn: 'province-id',
        parentValueParam: 'provinceId',
      },
    };

    const externalChild: FormField = {
      ...storeChild,
      dataSource: {
        url: 'https://api.example.com/districts',
        path: 'districts',
        valueField: 'id',
        labelField: 'name',
      },
    };

    const reconciled = reconcileSchemaPreserveCascades(
      [storeChild],
      [externalChild],
    );
    expect(reconciled[0].dataSource?.dependsOn).toBe('province-id');

    const patched = mergeFieldUpdate(reconciled[0], {
      dataSource: { path: 'districts' } as unknown as DynamicDataSource,
    });
    expect(patched.dataSource?.dependsOn).toBe('province-id');
  });

  it('mergeFieldUpdate keeps dependsOn when patch drops it but keeps parentValuePath', () => {
    const field: FormField = {
      id: 'child',
      type: 'select',
      label: 'District',
      required: false,
      isDynamic: true,
      dataSource: {
        url: 'https://backend.example.com/public/address/districts',
        path: 'districts',
        valueField: 'id',
        labelField: 'name',
        dependsOn: 'province-id',
        parentValuePath: 'id',
      },
    };

    const merged = mergeFieldUpdate(field, {
      dataSource: {
        dependsOn: undefined,
        parentValuePath: 'id',
      } as unknown as DynamicDataSource,
    });

    expect(merged.dataSource?.dependsOn).toBe('province-id');
    expect(merged.dataSource?.parentValuePath).toBe('id');
  });
});
