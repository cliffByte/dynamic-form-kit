import { FormField, TableRowConfig } from '../types/form';

/** Fixed row labels for matrix mode or columns-expand mode. */
export function getEffectiveTableRowDefinitions(
  field: Pick<
    FormField,
    'tableRows' | 'tableColumns' | 'tableExpandDirection'
  >,
): TableRowConfig[] {
  const rows = field.tableRows ?? [];
  if (rows.length > 0) return rows;

  if (field.tableExpandDirection !== 'columns') return [];

  return (field.tableColumns ?? []).map((col) => ({
    id: col.id,
    label: col.label,
    name: col.label,
  }));
}

export function isTableExpandByColumns(
  field: Pick<
    FormField,
    'tableRows' | 'tableColumns' | 'tableExpandDirection'
  >,
): boolean {
  return (
    field.tableExpandDirection === 'columns' &&
    getEffectiveTableRowDefinitions(field).length > 0
  );
}

/** Build tableRows from column definitions when enabling columns-expand mode. */
export function tableRowsFromColumns(
  columns: NonNullable<FormField['tableColumns']>,
): TableRowConfig[] {
  return columns.map((col) => ({
    id: col.id,
    label: col.label,
    name: col.label,
  }));
}
