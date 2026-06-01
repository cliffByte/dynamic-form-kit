import { describe, expect, it } from 'vitest';
import {
  buildDynamicDataSourceRequest,
  parseDataSourceBody,
} from './dynamicDataSourceRequest';

describe('buildDynamicDataSourceRequest', () => {
  it('sends POST body from config', () => {
    const { url, init } = buildDynamicDataSourceRequest({
      url: 'https://api.example.com/search',
      method: 'POST',
      path: 'data',
      valueField: 'id',
      labelField: 'name',
      body: { page: 1, active: true },
    });

    expect(url).toBe('https://api.example.com/search');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ page: 1, active: true }));
  });

  it('merges parent into POST body', () => {
    const { init } = buildDynamicDataSourceRequest(
      {
        url: 'https://api.example.com/items',
        method: 'POST',
        path: 'items',
        valueField: 'id',
        labelField: 'name',
        body: { limit: 10 },
        dependsOn: 'parent',
        parentValueParam: 'categoryId',
      },
      'cat-9',
    );

    expect(init.body).toBe(
      JSON.stringify({ limit: 10, categoryId: 'cat-9' }),
    );
  });

  it('replaces GET URL placeholder', () => {
    const { url, init } = buildDynamicDataSourceRequest(
      {
        url: 'https://api.example.com/regions/{regionId}/cities',
        method: 'GET',
        path: 'data',
        valueField: 'id',
        labelField: 'name',
        parentValuePath: 'regionId',
        dependsOn: 'region',
      },
      'r1',
    );

    expect(url).toBe('https://api.example.com/regions/r1/cities');
    expect(init.body).toBeUndefined();
  });
});

describe('parseDataSourceBody', () => {
  it('accepts object JSON and rejects arrays', () => {
    expect(parseDataSourceBody('{"a":1}')).toEqual({ ok: true, body: { a: 1 } });
    expect(parseDataSourceBody('[]').ok).toBe(false);
  });
});
