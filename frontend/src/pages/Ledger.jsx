import SavedFilters from '../components/common/SavedFilters';
import { buildLedgerEntries, ledgerDate } from '../utils/ledger';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';

import { useApp } from '../context/AppContext';
import DataTable from '../components/common/DataTable';
import SearchInput from '../components/common/SearchInput';
import Badge from '../components/common/Badge';
import StatCard from '../components/common/StatCard';

import { formatDateTime } from '../utils/dateUtils';
import { exportToCsv } from '../utils/csvExport';

const TYPE_FILTERS = [
  'All',
  'INWARD',
  'OUTWARD',
  'RETURN',
  'ADJUSTMENT',
];

function typeTone(type) {
  switch (type) {
    case 'INWARD':
      return 'good';

    case 'OUTWARD':
      return 'bad';

    case 'RETURN':
      return 'info';

    case 'ADJUSTMENT':
      return 'warn';

    default:
      return 'neutral';
  }
}

export default function Ledger() {
  const {
    transactions,
    adjustments,
    loadTransactions,
    loadAdjustments,
  } = useApp();

  const [query, setQuery] = useState('');

  const [typeFilter, setTypeFilter] =
    useState('All');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      await Promise.all([loadTransactions(), loadAdjustments()]);
    } catch (error) {
      setLoadError(error.message || 'Failed to refresh ledger.');
    } finally {
      setLoading(false);
    }
  }, [loadTransactions, loadAdjustments]);

  useEffect(() => { refresh(); }, [refresh]);

  const ledgerEntries = useMemo(
    () => buildLedgerEntries(transactions, adjustments),
    [transactions, adjustments]
  );

  // ============================================================
  // FILTER
  // ============================================================

  const filtered = useMemo(() => {
    const term =
      query.trim().toLowerCase();

    if (invalidRange) return [];

    return [...ledgerEntries]

      .sort(
        (a, b) =>
          (Date.parse(b.created_at) || 0) -
          (Date.parse(a.created_at) || 0)
      )

      .filter((entry) => {
        const date = ledgerDate(entry.created_at);
        if ((fromDate || toDate) && !date) return false;
        if (fromDate && date < fromDate) return false;
        if (toDate && date > toDate) return false;
        // Type filter
        if (
          typeFilter !== 'All' &&
          entry.transaction_type !==
            typeFilter
        ) {
          return false;
        }

        // Search
        if (!term) {
          return true;
        }

        const transactionNumber =
          String(
            entry.transaction_number || ''
          ).toLowerCase();

        const rollNumber =
          String(
            entry.roll_number || ''
          ).toLowerCase();

        const sku =
          String(
            entry.sku || ''
          ).toLowerCase();

        const productName =
          String(
            entry.product_name || ''
          ).toLowerCase();

        const party =
          String(
            entry.party || ''
          ).toLowerCase();

        const user =
          String(
            entry.user_name || ''
          ).toLowerCase();

        const notes =
          String(
            entry.notes || ''
          ).toLowerCase();

        const reason =
          String(
            entry.adjustment_reason ||
              ''
          ).toLowerCase();

        return (
          transactionNumber.includes(
            term
          ) ||
          rollNumber.includes(term) ||
          sku.includes(term) ||
          productName.includes(term) ||
          party.includes(term) ||
          user.includes(term) ||
          notes.includes(term) ||
          reason.includes(term)
        );
      });
  }, [
    ledgerEntries,
    query,
    typeFilter,
    fromDate,
    toDate,
    invalidRange,
  ]);

  const totals = useMemo(() => filtered.reduce((sum, entry) => ({
    inward: sum.inward + (entry.transaction_type === 'INWARD' ? entry.quantity : 0),
    outward: sum.outward + (entry.transaction_type === 'OUTWARD' ? entry.quantity : 0),
    returned: sum.returned + (entry.transaction_type === 'RETURN' ? entry.quantity : 0),
    net: sum.net + entry.stock_change,
  }), { inward: 0, outward: 0, returned: 0, net: 0 }), [filtered]);

  const metres = value => `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })} m`;

  // ============================================================
  // TABLE COLUMNS
  // ============================================================

  const columns = [
    {
      key: 'transaction_number',

      header: 'Transaction',

      sortable: true,

      render: (entry) =>
        entry.transaction_number ||
        '—',
    },

    {
      key: 'created_at',

      header: 'Timestamp',
      sortValue: entry => Date.parse(entry.created_at) || 0,

      sortable: true,

      render: (entry) =>
        formatDateTime(
          entry.created_at
        ),
    },

    {
      key: 'transaction_type',

      header: 'Type',

      render: (entry) => (
        <Badge
          tone={typeTone(
            entry.transaction_type
          )}
        >
          {entry.transaction_type}
        </Badge>
      ),
    },

    {
      key: 'sku',

      header: 'SKU',

      sortable: true,

      render: (entry) =>
        entry.sku || '—',
    },

    { key: 'product_name', header: 'Product', sortable: true, render: entry => entry.product_name || '—' },

    {
      key: 'roll_number',

      header: 'Roll ID',

      render: (entry) =>
        entry.roll_number || '—',
    },

    {
      key: 'quantity',

      header: 'Meters',

      sortable: true,

      render: (entry) => {
        const quantity =
          Number(entry.quantity);

        if (
          !Number.isFinite(quantity)
        ) {
          return '—';
        }

        if (
          entry.transaction_type ===
          'ADJUSTMENT'
        ) {
          return (
            <span
              className={
                quantity > 0
                  ? 'font-medium'
                  : quantity < 0
                  ? 'font-medium'
                  : ''
              }
            >
              {quantity > 0
                ? '+'
                : ''}
              {quantity.toFixed(2)} m
            </span>
          );
        }

        return `${quantity} m`;
      },
    },

    {
      key: 'stock_change', header: 'Stock change', sortable: true,
      render: entry => `${entry.stock_change > 0 ? '+' : ''}${metres(entry.stock_change)}`,
    },
    {
      key: 'previous_length', header: 'Before → After',
      render: entry => entry.transaction_type === 'ADJUSTMENT'
        ? `${metres(entry.previous_length)} → ${metres(entry.new_length)}` : '—',
    },

    {
      key: 'party',

      header: 'Party',

      render: (entry) => {
        if (
          entry.transaction_type ===
          'ADJUSTMENT'
        ) {
          return '—';
        }

        return entry.party || '—';
      },
    },

    {
      key: 'reason',

      header: 'Reason',

      render: (entry) => {
        if (
          entry.transaction_type !==
          'ADJUSTMENT'
        ) {
          return '—';
        }

        return String(
          entry.adjustment_reason ||
            ''
        )
          .replaceAll('_', ' ')
          .toLowerCase()
          .replace(
            /\b\w/g,
            (char) =>
              char.toUpperCase()
          );
      },
    },

    {
      key: 'user_name',

      header: 'User',

      render: (entry) =>
        entry.user_name || '—',
    },

    {
      key: 'notes',

      header: 'Note',

      render: (entry) =>
        entry.notes || '—',
    },
  ];

  // ============================================================
  // CSV EXPORT
  // ============================================================

  function handleExport() {
    exportToCsv(
      'ledger.csv',
      filtered,
      [
        {
          key: 'transaction_number',
          header: 'Transaction',
        },

        {
          key: 'created_at',
          header: 'Timestamp',
        },

        {
          key: 'transaction_type',
          header: 'Type',
        },

        {
          key: 'sku',
          header: 'SKU',
        },

        { key: 'product_name', header: 'Product' },
        { key: 'stock_change', header: 'Stock change (m)' },
        { key: 'previous_length', header: 'Previous length (m)' },
        { key: 'new_length', header: 'New length (m)' },
        {
          key: 'roll_number',
          header: 'Roll ID',
        },

        {
          key: 'quantity',
          header: 'Meters',
        },

        {
          key: 'party',
          header: 'Party',
        },

        {
          key: 'adjustment_reason',
          header: 'Adjustment Reason',
        },

        {
          key: 'user_name',
          header: 'User',
        },

        {
          key: 'notes',
          header: 'Note',
        },
      ]
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="space-y-5">
      <SavedFilters page="Ledger" values={{ query, typeFilter, fromDate, toDate }} onApply={v => { setQuery(v.query || ''); setTypeFilter(v.typeFilter || 'All'); setFromDate(v.fromDate || ''); setToDate(v.toDate || ''); }} />

      {/* HEADER */}

      <div className="flex flex-wrap gap-3 items-center justify-between">

        <div>
          <h1 className="font-display text-2xl">
            Ledger
          </h1>

          <p className="text-sm text-ink-700/60 mt-1">
            Stock movements and inventory adjustments, with one entry per roll.
          </p>
        </div>

        <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          className="btn-secondary"
          disabled={loading || Boolean(loadError) || filtered.length === 0}
          onClick={handleExport}
        >
          <Download size={15} />

          Export CSV
        </button>
        </div>
      </div>

      {loadError && <p role="alert" className="text-sm text-red-600">{loadError} Displayed data may be incomplete. Try Refresh.</p>}

      {/* FILTERS */}

      <div className="flex flex-wrap gap-3 items-center">

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search transaction, roll, SKU, product, party…"
          className="max-w-sm"
        />

        <select
          className="input w-auto"
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(
              e.target.value
            )
          }
        >
          {TYPE_FILTERS.map(
            (type) => (
              <option
                key={type}
                value={type}
              >
                {type}
              </option>
            )
          )}
        </select>

        <label className="text-xs text-ink-700/60">
          From
          <input type="date" className="input mt-1" value={fromDate}
            onChange={event => setFromDate(event.target.value)} />
        </label>
        <label className="text-xs text-ink-700/60">
          To
          <input type="date" className="input mt-1" value={toDate}
            onChange={event => setToDate(event.target.value)} />
        </label>
        <button type="button" className="btn-ghost" onClick={() => {
          setQuery(''); setTypeFilter('All'); setFromDate(''); setToDate('');
        }}>Clear filters</button>

        <span className="text-xs text-ink-700/50 ml-auto">
          {filtered.length} entries
        </span>
      </div>

      {invalidRange && <p role="alert" className="text-sm text-red-600">From date cannot be after To date.</p>}

      <div>
        <p className="text-xs text-ink-700/60 mb-2">Totals for the filtered entries. Net movement includes adjustments; it is not the stock balance.</p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard label="Inward" value={metres(totals.inward)} tone="good" />
          <StatCard label="Outward" value={metres(totals.outward)} tone="bad" />
          <StatCard label="Returns" value={metres(totals.returned)} tone="loom" />
          <StatCard label="Net movement" value={metres(totals.net)} />
        </div>
      </div>

      {/* TABLE */}

      <div className="card">

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey="id"
          emptyMessage={loading ? 'Loading ledger…' : 'No ledger entries match these filters.'}
        />

      </div>
    </div>
  );
}