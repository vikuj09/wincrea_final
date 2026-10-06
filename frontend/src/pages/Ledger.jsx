import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import { useApp } from '../context/AppContext';
import DataTable from '../components/common/DataTable';
import SearchInput from '../components/common/SearchInput';
import Badge from '../components/common/Badge';

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
  } = useApp();

  const [query, setQuery] = useState('');

  const [typeFilter, setTypeFilter] =
    useState('All');

  // ============================================================
  // NORMALIZE TRANSACTIONS + ADJUSTMENTS
  // ============================================================

  const ledgerEntries = useMemo(() => {
    const normalTransactions =
      Array.isArray(transactions)
        ? transactions.map((t) => ({
            id: `transaction-${t.id}-${t.item_id ?? 'x'}`,

            transaction_number:
              t.transaction_number || '—',

            created_at:
              t.created_at,

            transaction_type:
              t.transaction_type,

            sku:
              t.sku || '',

            roll_number:
              t.roll_number || '',

            quantity:
              Number(t.quantity) || 0,

            party:
              t.transaction_type === 'INWARD'
                ? t.supplier_name || '—'
                : t.customer_name || '—',

            user_name:
              t.user_name || '—',

            notes:
              t.notes || '—',

            // Extra fields
            adjustment_type: null,

            adjustment_reason: null,

            previous_length: null,

            new_length: null,
          }))
        : [];

    const adjustmentEntries =
      Array.isArray(adjustments)
        ? adjustments.map((a) => {
            const type =
              a.adjustmentType ||
              a.adjustment_type;

            const rawQuantity =
              Number(a.quantity) || 0;

            let signedQuantity =
              rawQuantity;

            if (type === 'DECREASE') {
              signedQuantity =
                -rawQuantity;
            }

            if (type === 'SET') {
              signedQuantity =
                Number(a.newLength) -
                Number(a.previousLength);
            }

            return {
              id: `adjustment-${a.id}`,

              transaction_number:
                `ADJ-${String(a.id).padStart(
                  5,
                  '0'
                )}`,

              created_at:
                a.createdAt ||
                a.created_at,

              transaction_type:
                'ADJUSTMENT',

              sku:
                a.sku || '',

              roll_number:
                a.rollNumber ||
                a.roll_number ||
                '',

              quantity:
                signedQuantity,

              party:
                '—',

              user_name:
                a.userName ||
                a.user_name ||
                '—',

              notes:
                a.notes || '—',

              adjustment_type:
                type,

              adjustment_reason:
                a.reason || '',

              previous_length:
                Number(
                  a.previousLength ??
                    a.previous_length ??
                    0
                ),

              new_length:
                Number(
                  a.newLength ??
                    a.new_length ??
                    0
                ),
            };
          })
        : [];

    return [
      ...normalTransactions,
      ...adjustmentEntries,
    ];
  }, [transactions, adjustments]);

  // ============================================================
  // FILTER
  // ============================================================

  const filtered = useMemo(() => {
    const term =
      query.trim().toLowerCase();

    return [...ledgerEntries]

      .sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      )

      .filter((entry) => {
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
  ]);

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

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="font-display text-2xl">
            Ledger
          </h1>

          <p className="text-sm text-ink-700/60 mt-1">
            Full immutable log of every stock
            movement and inventory adjustment.
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={handleExport}
        >
          <Download size={15} />

          Export CSV
        </button>
      </div>

      {/* FILTERS */}

      <div className="flex flex-wrap gap-3 items-center">

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search transaction, roll, SKU, party…"
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

        <span className="text-xs text-ink-700/50 ml-auto">
          {filtered.length} entries
        </span>
      </div>

      {/* TABLE */}

      <div className="card">

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey="id"
        />

      </div>
    </div>
  );
}