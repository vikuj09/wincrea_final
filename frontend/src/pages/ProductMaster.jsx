import React, { useMemo, useState } from 'react';

import { Share2 } from 'lucide-react';

import { useApp } from '../context/AppContext';

import DataTable from '../components/common/DataTable';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import Badge, { stockTone } from '../components/common/Badge';

import {
  stockStatus,
  formatCurrency,
} from '../utils/calculations';

const EMPTY_FORM = {
  sku: '',
  name: '',
  category: 'ESSENTIAL',
  width: '',
  color: '',
  ratePerMeter: '',
  reorderLevel: '',
};

export default function ProductMaster() {

  const {
    products,
    updateProduct,
    createShareLink,
  } = useApp();

  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [sharing, setSharing] =
    useState(false);

  // ------------------------------------------------------------
  // SEARCH
  // ------------------------------------------------------------

  const filtered = useMemo(() => {

    const term = query.trim().toLowerCase();

    if (!term) {
      return products;
    }

    return products.filter((p) =>
      (p.sku || '').toLowerCase().includes(term) ||
      (p.name || '').toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term) ||
      (p.color || '').toLowerCase().includes(term)
    );

  }, [products, query]);

  // ------------------------------------------------------------
  // SHARE PRODUCT MASTER
  // ------------------------------------------------------------

  async function handleShare() {

    try {

      setSharing(true);

      const result =
        await createShareLink(
          'PRODUCTS'
        );

      const token =
        result?.token;

      if (!token) {
        throw new Error(
          'Share link token was not returned.'
        );
      }

      const url =
        `${window.location.origin}/shared/products/${token}`;

      try {

        await navigator.clipboard.writeText(
          url
        );

        alert(
          'Product Master share link copied to clipboard.'
        );

      } catch (_) {

        window.prompt(
          'Copy this Product Master share link:',
          url
        );

      }

    } catch (error) {

      console.error(
        'Share Product Master failed:',
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


  // ------------------------------------------------------------
  // EDIT PRODUCT
  // ------------------------------------------------------------

  function openEdit(product) {

    setEditing(product.id);

    setForm({
      sku: product.sku || '',
      name: product.name || '',
      category: product.category || 'ESSENTIAL',
      width: product.width_cm ?? product.width ?? '',
      color: product.color || '',
      ratePerMeter:
        product.rate_per_meter ??
        product.ratePerMeter ??
        '',
      reorderLevel:
        product.reorder_level ??
        product.reorderLevel ??
        '',
    });

    setModalOpen(true);
  }

  // ------------------------------------------------------------
  // SAVE
  // ------------------------------------------------------------

  async function save() {

    try {

      if (editing === null) {
        return;
      }

      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category,
        width: Number(form.width),
        color: form.color.trim(),
        ratePerMeter: Number(form.ratePerMeter),
        reorderLevel: Number(form.reorderLevel),
      };

      await updateProduct(
        editing,
        payload
      );

      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);

    } catch (error) {

      alert(
        error.message
      );

    }

  }

  // ------------------------------------------------------------
  // CATEGORY BADGE
  // ------------------------------------------------------------

  function CategoryBadge({ category }) {

    const isPremium =
      String(category || 'ESSENTIAL').toUpperCase() ===
      'PREMIUM';

    if (isPremium) {
      return (
        <span
          className="
            inline-flex items-center gap-1.5
            px-3 py-1.5
            rounded-full
            text-[11px] font-semibold
            tracking-[0.08em]
            bg-gradient-to-r from-violet-100 via-fuchsia-100 to-violet-100
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

  // ------------------------------------------------------------
  // TABLE
  // ------------------------------------------------------------

  const columns = [

    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
    },

    {
      key: 'name',
      header: 'Name',
      sortable: true,
    },

    {
      key: 'category',
      header: 'Category',
      sortable: true,

      sortValue: (p) =>
        p.category || 'ESSENTIAL',

      render: (p) => (
        <CategoryBadge
          category={
            p.category || 'ESSENTIAL'
          }
        />
      ),
    },

    {
      key: 'color',
      header: 'Color',
      sortable: true,
    },

    {
      key: 'width',
      header: 'Width',
      render: (p) =>
        `${p.width_cm ?? p.width ?? 0} CM`,
    },

    {
      key: 'ratePerMeter',
      header: 'Rate/m',
      sortable: true,

      sortValue: (p) =>
        Number(
          p.rate_per_meter ??
          p.ratePerMeter ??
          0
        ),

      render: (p) =>
        formatCurrency(
          p.rate_per_meter ??
          p.ratePerMeter ??
          0
        ),
    },

    {
      key: 'stock',
      header: 'Stock (m)',
      sortable: true,

      sortValue: (p) =>
        Number(
          p.stock || 0
        ),

      render: (p) =>
        `${Number(
          p.stock || 0
        ).toLocaleString('en-IN')} m`,
    },

    {
      key: 'rollCount',
      header: 'Rolls',

      sortValue: (p) =>
        Number(
          p.rolls ??
          p.rollCount ??
          0
        ),

      render: (p) =>
        Number(
          p.rolls ??
          p.rollCount ??
          0
        ),
    },

    {
      key: 'reorderLevel',
      header: 'Reorder Lvl',
      sortable: true,

      sortValue: (p) =>
        Number(
          p.reorder_level ??
          p.reorderLevel ??
          0
        ),

      render: (p) =>
        Number(
          p.reorder_level ??
          p.reorderLevel ??
          0
        ),
    },

    {
      key: 'status',
      header: 'Status',

      render: (p) => {

        const stock =
          Number(
            p.stock || 0
          );

        const reorderLevel =
          Number(
            p.reorder_level ??
            p.reorderLevel ??
            0
          );

        const status =
          stockStatus(
            stock,
            reorderLevel
          );

        return (
          <Badge
            tone={stockTone(status)}
          >
            {status}
          </Badge>
        );

      },

    },

  ];

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (

    <div className="space-y-5">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="font-display text-2xl">
            Product Master
          </h1>

          <p className="text-sm text-ink-700/60 mt-1">
            Products are created from the Inward page.
            Existing SKUs can be edited here.
          </p>

        </div>

        <button
          type="button"
          className="
            btn-secondary
            inline-flex
            items-center
            gap-2
            shadow-sm
          "
          onClick={handleShare}
          disabled={sharing}
        >
          <Share2 size={15} />
          {sharing
            ? 'Creating Link...'
            : 'Share'}
        </button>

      </div>

      {/* SEARCH */}

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search SKU, name, category, or color…"
        className="max-w-sm"
      />

      {/* TABLE */}

      <div className="card">

        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={openEdit}
        />

      </div>

      {/* EDIT MODAL */}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setForm(EMPTY_FORM);
        }}
        title="Edit Product"
      >

        <div className="grid grid-cols-2 gap-4">

          <Field label="SKU / Series Code">

            <input
              className="input"
              value={form.sku}
              onChange={(e) =>
                setForm({
                  ...form,
                  sku: e.target.value,
                })
              }
              placeholder="e.g. LS1123"
            />

          </Field>


          <Field label="Name">

            <input
              className="input"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
            />

          </Field>


          {/* CATEGORY */}

          <Field label="Category">

            <select
              className="
                input
                font-medium
              "
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value,
                })
              }
            >

              <option value="ESSENTIAL">
                Essential
              </option>

              <option value="PREMIUM">
                Premium
              </option>

            </select>

          </Field>


          <Field label="Width (CM)">

            <input
              type="number"
              className="input"
              value={form.width}
              onChange={(e) =>
                setForm({
                  ...form,
                  width: e.target.value,
                })
              }
              placeholder="e.g. 320"
            />

          </Field>


          <Field label="Color">

            <input
              className="input"
              value={form.color}
              onChange={(e) =>
                setForm({
                  ...form,
                  color: e.target.value,
                })
              }
            />

          </Field>


          <Field label="Rate per Meter (₹)">

            <input
              type="number"
              className="input"
              value={form.ratePerMeter}
              onChange={(e) =>
                setForm({
                  ...form,
                  ratePerMeter: e.target.value,
                })
              }
            />

          </Field>


          <Field label="Reorder Level (m)">

            <input
              type="number"
              className="input"
              value={form.reorderLevel}
              onChange={(e) =>
                setForm({
                  ...form,
                  reorderLevel: e.target.value,
                })
              }
            />

          </Field>

        </div>


        <div className="flex justify-end gap-2 mt-5">

          <button
            className="btn-secondary"
            onClick={() => {
              setModalOpen(false);
              setEditing(null);
              setForm(EMPTY_FORM);
            }}
          >
            Cancel
          </button>

          <button
            className="btn-primary"
            onClick={save}
            disabled={
              !form.sku ||
              !form.name ||
              !form.category
            }
          >
            Save Changes
          </button>

        </div>

      </Modal>

    </div>

  );
}

function Field({
  label,
  children,
}) {

  return (

    <div>

      <label className="label">
        {label}
      </label>

      {children}

    </div>

  );

}