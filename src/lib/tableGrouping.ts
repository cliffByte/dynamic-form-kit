import { TableColumnGroup } from '../types/form';

interface HeaderColumn {
  id: string;
  label: string;
}

export interface TableHeaderCell {
  key: string;
  label: string;
  colSpan: number;
  rowSpan: number;
  isGroup: boolean;
}

export interface GroupedTableHeaders {
  hasGroups: boolean;
  maxDepth: number;
  groupRows: TableHeaderCell[][];
}

function buildGroupChainForColumn(
  columnId: string,
  groups: TableColumnGroup[],
  groupMap: Map<string, TableColumnGroup>,
): TableColumnGroup[] {
  const directGroup = groups.find((group) =>
    group.columnIds.includes(columnId),
  );
  if (!directGroup) return [];

  const chain: TableColumnGroup[] = [];
  let current: TableColumnGroup | undefined = directGroup;
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift(current);
    current = current.parentGroupId
      ? groupMap.get(current.parentGroupId)
      : undefined;
  }

  return chain;
}

export function buildGroupedTableHeaders(
  columns: HeaderColumn[],
  groups: TableColumnGroup[],
): GroupedTableHeaders {
  if (columns.length === 0 || groups.length === 0) {
    return {
      hasGroups: false,
      maxDepth: 0,
      groupRows: [],
    };
  }

  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const chains = columns.map((column) =>
    buildGroupChainForColumn(column.id, groups, groupMap),
  );
  const maxDepth = Math.max(...chains.map((chain) => chain.length), 0);

  if (maxDepth === 0) {
    return {
      hasGroups: false,
      maxDepth: 0,
      groupRows: [],
    };
  }

  const groupRows: TableHeaderCell[][] = [];

  for (let depth = 0; depth < maxDepth; depth++) {
    const row: TableHeaderCell[] = [];
    let columnIndex = 0;

    while (columnIndex < columns.length) {
      const currentGroup = chains[columnIndex][depth];

      if (!currentGroup) {
        let span = 1;
        while (
          columnIndex + span < columns.length &&
          !chains[columnIndex + span][depth]
        ) {
          span++;
        }

        row.push({
          key: `empty-${depth}-${columnIndex}`,
          label: '',
          colSpan: span,
          rowSpan: maxDepth - depth,
          isGroup: false,
        });
        columnIndex += span;
        continue;
      }

      let span = 1;
      while (
        columnIndex + span < columns.length &&
        chains[columnIndex + span][depth]?.id === currentGroup.id
      ) {
        span++;
      }

      const hasDeeperNestedGroupInSpan = Array.from(
        { length: span },
        (_, offset) => chains[columnIndex + offset].length > depth + 1,
      ).some(Boolean);

      row.push({
        key: `${currentGroup.id}-${depth}-${columnIndex}`,
        label: currentGroup.label,
        colSpan: span,
        rowSpan: hasDeeperNestedGroupInSpan ? 1 : maxDepth - depth,
        isGroup: true,
      });

      columnIndex += span;
    }

    groupRows.push(row);
  }

  return {
    hasGroups: true,
    maxDepth,
    groupRows,
  };
}
