import { useState, useEffect, useCallback } from 'react';
import { DynamicDataSource } from '../types/form';
import { buildDynamicDataSourceRequest } from '../lib/dynamicDataSourceRequest';

interface UseDynamicOptionsResult {
  options: Array<{ value: string; label: string }>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Helper function to extract value from nested object using dot-notation path (e.g. "municipality.en")
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function useDynamicOptions(
  dataSource: DynamicDataSource | undefined,
  parentValue?: any,
  enabled: boolean = true,
): UseDynamicOptionsResult {
  const [options, setOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    if (!dataSource || !enabled) {
      setOptions([]);
      return;
    }

    // If depends on parent and no parent value, don't fetch
    if (dataSource.dependsOn && !parentValue) {
      setOptions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { url, init: requestOptions } = buildDynamicDataSourceRequest(
        dataSource,
        parentValue,
      );

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extract data using path (e.g., "data.list" or "items")
      const extractedData = getNestedValue(data, dataSource.path);

      if (!Array.isArray(extractedData)) {
        throw new Error('Extracted data is not an array');
      }

      // Map to options format
      const mappedOptions = extractedData.map((item: any) => ({
        value: String(getNestedValue(item, dataSource.valueField) ?? ''),
        label: String(getNestedValue(item, dataSource.labelField) ?? ''),
      }));

      setOptions(mappedOptions);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch options';
      setError(errorMessage);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [dataSource, parentValue, enabled]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const refetch = useCallback(() => {
    fetchOptions();
  }, [fetchOptions]);

  return { options, loading, error, refetch };
}
