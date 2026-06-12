import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormField } from '../types/form';
import {
  buildDynamicFieldsFetchSignature,
  fetchDynamicOptionsForField,
  getDynamicFieldFetchKey,
  getDynamicParentFieldId,
  isDynamicField,
  type DynamicOption,
} from '../lib/dynamicFieldUtils';

export function useDynamicFormOptions(
  visibleFields: FormField[],
  values: Record<string, unknown>,
): {
  dynamicOptions: Record<string, DynamicOption[]>;
  loadingFields: Record<string, boolean>;
  errorFields: Record<string, string>;
  retryDynamicField: (field: FormField) => Promise<void>;
} {
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, DynamicOption[]>
  >({});
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>(
    {},
  );
  const [errorFields, setErrorFields] = useState<Record<string, string>>({});

  const lastFetchKeysRef = useRef<Record<string, string>>({});
  const fetchGenerationRef = useRef<Record<string, number>>({});

  const dynamicVisible = useMemo(
    () => visibleFields.filter(isDynamicField),
    [visibleFields],
  );
  const dynamicVisibleRef = useRef(dynamicVisible);
  dynamicVisibleRef.current = dynamicVisible;

  const fetchSignature = useMemo(
    () => buildDynamicFieldsFetchSignature(dynamicVisible, values),
    [dynamicVisible, values],
  );

  useEffect(() => {
    const fieldsToFetch = dynamicVisibleRef.current;
    if (fieldsToFetch.length === 0) return;

    const run = async () => {
      await Promise.all(
        fieldsToFetch.map(async (field) => {
          const ds = field.dataSource;
          if (!ds) return;

          const currentValues = valuesRef.current;
          const parentId = getDynamicParentFieldId(ds);
          const parentValue = parentId ? currentValues[parentId] : undefined;
          const fetchKey = getDynamicFieldFetchKey(field, currentValues);

          if (parentId && !parentValue) {
            setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
            setLoadingFields((prev) => ({ ...prev, [field.id]: false }));
            lastFetchKeysRef.current[field.id] = fetchKey;
            return;
          }

          if (lastFetchKeysRef.current[field.id] === fetchKey) return;
          lastFetchKeysRef.current[field.id] = fetchKey;

          const generation = (fetchGenerationRef.current[field.id] ?? 0) + 1;
          fetchGenerationRef.current[field.id] = generation;

          setLoadingFields((prev) => ({ ...prev, [field.id]: true }));
          setErrorFields((prev) => ({ ...prev, [field.id]: '' }));

          try {
            const opts = await fetchDynamicOptionsForField(field, parentValue);
            if (fetchGenerationRef.current[field.id] === generation) {
              setDynamicOptions((prev) => ({ ...prev, [field.id]: opts }));
            }
          } catch (e) {
            const msg =
              e instanceof Error ? e.message : 'Failed to load options';
            if (fetchGenerationRef.current[field.id] === generation) {
              setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
              setErrorFields((prev) => ({ ...prev, [field.id]: msg }));
            }
          } finally {
            if (fetchGenerationRef.current[field.id] === generation) {
              setLoadingFields((prev) => ({ ...prev, [field.id]: false }));
            }
          }
        }),
      );
    };

    run();
  }, [fetchSignature]);

  const retryDynamicField = useCallback(async (field: FormField) => {
    const ds = field.dataSource;
    if (!ds) return;

    const currentValues = valuesRef.current;
    const parentId = getDynamicParentFieldId(ds);
    const parentValue = parentId ? currentValues[parentId] : undefined;
    const fetchKey = getDynamicFieldFetchKey(field, currentValues);

    delete lastFetchKeysRef.current[field.id];
    const generation = (fetchGenerationRef.current[field.id] ?? 0) + 1;
    fetchGenerationRef.current[field.id] = generation;

    setLoadingFields((prev) => ({ ...prev, [field.id]: true }));
    setErrorFields((prev) => ({ ...prev, [field.id]: '' }));

    try {
      const opts = await fetchDynamicOptionsForField(field, parentValue);
      if (fetchGenerationRef.current[field.id] === generation) {
        setDynamicOptions((prev) => ({ ...prev, [field.id]: opts }));
        lastFetchKeysRef.current[field.id] = fetchKey;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load options';
      if (fetchGenerationRef.current[field.id] === generation) {
        setDynamicOptions((prev) => ({ ...prev, [field.id]: [] }));
        setErrorFields((prev) => ({ ...prev, [field.id]: msg }));
      }
    } finally {
      if (fetchGenerationRef.current[field.id] === generation) {
        setLoadingFields((prev) => ({ ...prev, [field.id]: false }));
      }
    }
  }, []);

  return {
    dynamicOptions,
    loadingFields,
    errorFields,
    retryDynamicField,
  };
}
