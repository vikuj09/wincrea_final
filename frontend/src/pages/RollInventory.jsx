import React, { useMemo, useState } from 'react';
import { Download, Share2 } from 'lucide-react';

import { useApp } from '../context/AppContext';

import DataTable from '../components/common/DataTable';
import SearchInput from '../components/common/SearchInput';
import Badge, {
  statusTone,
} from '../components/common/Badge';

import { formatDate } from '../utils/dateUtils';
import { exportToCsv } from '../utils/csvExport';

const STATUS_FILTERS = [
  'All',
  'AVAILABLE',
  'EMPTY',
];

export default function RollInventory() {

  const {
    rolls,
    products,
    createShareLink,
  } = useApp();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState('All');

  const [productFilter, setProductFilter] =
    useState('All');

  const [sharing, setSharing] =
    useState(false);

  // ============================================================
  // SHARE ROLL INVENTORY
  // ============================================================

  async function handleShare() {

    try {

      setSharing(true);

      const result =
        await createShareLink(
          'ROLLS'
        );

      const token =
        result?.token;

      if (!token) {
        throw new Error(
          'Share link token was not returned.'
        );
      }

      const url =
        `${window.location.origin}/shared/rolls/${token}`;

      try {

        await navigator.clipboard.writeText(
          url
        );

        alert(
          'Roll Inventory share link copied to clipboard.'
        );

      } catch (_) {

        window.prompt(
          'Copy this Roll Inventory share link:',
          url
        );

      }

    } catch (error) {

      console.error(
        'Share Roll Inventory failed:',
        error
      );

      alert(
        error?.message ||
        'Failed to create share link.'
      );

    } finally {

      setSharing(false);

    }
  }


  // ============================================================
  // PRODUCT MAP
  // ============================================================

  const productMap = useMemo(
    () =>
      Object.fromEntries(
        products.map((p) => [
          p.id,
          p,
        ])
      ),
    [products]
  );

  // ============================================================
  // FILTER
  // ============================================================

  const filtered = useMemo(() => {

    const term =
      query.trim().toLowerCase();

    return rolls.filter((r) => {

      // Status filter
      if (
        statusFilter !== 'All' &&
        r.status !== statusFilter
      ) {
        return false;
      }

      // Product filter
      if (
        productFilter !== 'All' &&
        String(r.productId) !==
          String(productFilter)
      ) {
        return false;
      }

      // Search
      if (!term) {
        return true;
      }

      const product =
        productMap[r.productId];

      return (
        String(r.rollId || '')
          .toLowerCase()
          .includes(term) ||

        String(
          product?.sku || r.sku || ''
        )
          .toLowerCase()
          .includes(term) ||

        String(
          product?.name ||
          r.productName ||
          ''
        )
          .toLowerCase()
          .includes(term) ||

        String(
          product?.category ||
          ''
        )
          .toLowerCase()
          .includes(term) ||

        String(
          product?.color ||
          r.color ||
          ''
        )
          .toLowerCase()
          .includes(term)
      );

    });

  }, [
    rolls,
    query,
    statusFilter,
    productFilter,
    productMap,
  ]);

  // ============================================================
  // CATEGORY BADGE
  // ============================================================

  function CategoryBadge({ category }) {

    const normalized =
      String(
        category || 'ESSENTIAL'
      ).toUpperCase();

    const isPremium =
      normalized === 'PREMIUM';

    if (isPremium) {
      return (
        <span
          className="
            inline-flex items-center gap-1.5
            px-3 py-1.5
            rounded-full
            text-[11px] font-semibold
            tracking-[0.08em]
            bg-gradient-to-r
            from-violet-100
            via-fuchsia-100
            to-violet-100
            text-violet-800
            border border-violet-200
            shadow-sm
          "
        >
          <span
            className="
              text-[9px]
              text-violet-600
            "
          >
            ◆
          </span>

          PREMIUM
        </span>
      );
    }

    return (
      <span
        className="
          inline-flex items-center gap-1.5
          px-3 py-1.5
          rounded-full
          text-[11px] font-semibold
          tracking-[0.08em]
          bg-slate-100
          text-slate-700
          border border-slate-200
        "
      >
        <span
          className="
            w-1.5 h-1.5
            rounded-full
            bg-slate-500
          "
        />

        ESSENTIAL
      </span>
    );
  }

  // ============================================================
  // TABLE
  // ============================================================

  const columns = [

    {
      key: 'rollId',
      header: 'Roll ID',
      sortable: true,

      render: (r) =>
        r.rollId || '—',
    },

    {
      key: 'productName',
      header: 'Product',

      render: (r) =>
        productMap[r.productId]
          ?.name ||
        r.productName ||
        '—',
    },

    {
      key: 'sku',
      header: 'SKU',
      sortable: true,

      sortValue: (r) =>
        productMap[r.productId]?.sku ||
        r.sku ||
        '',

      render: (r) =>
        productMap[r.productId]?.sku ||
        r.sku ||
        '—',
    },

    // ----------------------------------------------------------
    // CATEGORY
    // ----------------------------------------------------------

    {
      key: 'category',
      header: 'Category',
      sortable: true,

      sortValue: (r) =>
        productMap[r.productId]
          ?.category ||
        'ESSENTIAL',

      render: (r) => (
        <CategoryBadge
          category={
            productMap[r.productId]
              ?.category ||
            'ESSENTIAL'
          }
        />
      ),
    },

    {
      key: 'color',
      header: 'Color',

      render: (r) =>
        productMap[r.productId]
          ?.color ||
        r.color ||
        '—',
    },

    {
      key: 'originalLength',
      header: 'Original (m)',
      sortable: true,

      sortValue: (r) =>
        Number(
          r.originalLength ??
          r.length ??
          r.original_length ??
          0
        ),

      render: (r) =>
        `${Number(
          r.originalLength ??
          r.length ??
          r.original_length ??
          0
        )} m`,
    },

    {
      key: 'remainingLength',
      header: 'Remaining (m)',
      sortable: true,

      sortValue: (r) =>
        Number(
          r.remainingLength || 0
        ),

      render: (r) =>
        `${Number(
          r.remainingLength || 0
        )} m`,
    },

    {
      key: 'status',
      header: 'Status',
      sortable: true,

      render: (r) => (
        <Badge
          tone={statusTone(
            r.status
          )}
        >
          {r.status}
        </Badge>
      ),
    },

    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,

      sortValue: (r) =>
        r.createdAt || '',

      render: (r) =>
        r.createdAt
          ? formatDate(
              r.createdAt
            )
          : '—',
    },

  ];

  // ============================================================
  // EXPORT
  // ============================================================

  function handleExport() {

    exportToCsv(
      'roll-inventory.csv',
      filtered,
      [
        {
          key: 'rollId',
          header: 'Roll ID',
        },

        {
          key: 'productName',
          header: 'Product',

          value: (r) =>
            productMap[
              r.productId
            ]?.name ||
            r.productName ||
            '',
        },

        {
          key: 'sku',
          header: 'SKU',

          value: (r) =>
            productMap[
              r.productId
            ]?.sku ||
            r.sku ||
            '',
        },

        {
          key: 'category',
          header: 'Category',

          value: (r) =>
            productMap[
              r.productId
            ]?.category ||
            'ESSENTIAL',
        },

        {
          key: 'color',
          header: 'Color',

          value: (r) =>
            productMap[
              r.productId
            ]?.color ||
            r.color ||
            '',
        },

        {
          key: 'originalLength',
          header: 'Original Length (m)',

          value: (r) =>
            r.originalLength ??
            r.length ??
            0,
        },

        {
          key: 'remainingLength',
          header: 'Remaining Length (m)',

          value: (r) =>
            r.remainingLength || 0,
        },

        {
          key: 'status',
          header: 'Status',
        },

        {
          key: 'createdAt',
          header: 'Created At',
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
            Roll Inventory
          </h1>

          <p className="text-sm text-ink-700/60 mt-1">
            Every individual roll,
            searchable by ID or product.
          </p>

        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            className="btn-secondary"
            onClick={handleShare}
            disabled={sharing}
          >
            <Share2 size={15} />
            {sharing
              ? 'Creating Link...'
              : 'Share'}
          </button>

          <button
            className="btn-secondary"
            onClick={handleExport}
          >
            <Download size={15} />
            Export CSV
          </button>

        </div>

      </div>

      {/* FILTERS */}

      <div className="flex flex-wrap gap-3 items-center">

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search roll ID, SKU, product, category…"
          className="max-w-sm"
        />

        {/* STATUS */}

        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
        >

          {STATUS_FILTERS.map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            )
          )}

        </select>

        {/* PRODUCT */}

        <select
          className="input w-auto"
          value={productFilter}
          onChange={(e) =>
            setProductFilter(
              e.target.value
            )
          }
        >

          <option value="All">
            All products
          </option>

          {products.map((p) => (
            <option
              key={p.id}
              value={p.id}
            >
              {p.sku}
            </option>
          ))}

        </select>

        <span className="text-xs text-ink-700/50 ml-auto">
          {filtered.length} rolls
        </span>

      </div>

      {/* TABLE */}

      <div className="card">

        <DataTable
          columns={columns}
          rows={filtered}
        />

      </div>

    </div>
  );
}