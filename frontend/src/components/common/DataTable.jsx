import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * columns: [{ key, header, render?: (row) => node, sortable?: bool, sortValue?: (row) => number|string }]
 */
export default function DataTable({ columns, rows, emptyMessage = 'No records found.', rowKey = 'id', onRowClick }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });

  const sorted = useMemo(() => {
    if (!sort.key) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const getVal = col.sortValue || ((r) => r[col.key]);
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sort, columns]);

  function toggleSort(key) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="table-head whitespace-nowrap">
                {col.sortable ? (
                  <button className="inline-flex items-center gap-1 hover:text-ink-900" onClick={() => toggleSort(col.key)}>
                    {col.header}
                    {sort.key === col.key ? (
                      sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-30" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="table-cell text-center text-ink-700/50 py-8">
                {emptyMessage}
              </td>
            </tr>
          )}
          {sorted.map((row) => (
            <tr
              key={row[rowKey]}
              className={onRowClick ? 'cursor-pointer hover:bg-loom-50/40' : ''}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="table-cell whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
