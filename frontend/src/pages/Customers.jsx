import React, {
  useMemo,
  useState,
} from 'react';

import {
  Plus,
  ChevronRight,
  Trash2,
  Users,
  MapPin,
  Phone,
  UserRound,
  ShoppingBag,
  AlertTriangle,
  X,
} from 'lucide-react';

import { useApp } from '../context/AppContext';

import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';

import { formatDate } from '../utils/dateUtils';

const EMPTY = {
  name: '',
  contact: '',
  phone: '',
  city: '',
  segment: '',
};

export default function Customers() {

  const {
    customers,
    ledger,
    products,
    addCustomer,
    removeCustomer,
  } = useApp();

  const [query, setQuery] =
    useState('');

  const [selected, setSelected] =
    useState(null);

  const [addOpen, setAddOpen] =
    useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY);

  const [deleting, setDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState('');

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
      query
        .trim()
        .toLowerCase();

    if (!term) {
      return customers;
    }

    return customers.filter(
      (c) =>
        String(
          c.name || ''
        )
          .toLowerCase()
          .includes(term) ||

        String(
          c.city || ''
        )
          .toLowerCase()
          .includes(term) ||

        String(
          c.phone || ''
        )
          .toLowerCase()
          .includes(term) ||

        String(
          c.contact || ''
        )
          .toLowerCase()
          .includes(term) ||

        String(
          c.segment || ''
        )
          .toLowerCase()
          .includes(term)
    );

  }, [
    customers,
    query,
  ]);

  // ============================================================
  // CUSTOMER HISTORY
  // ============================================================

  function historyFor(customerId) {

    return ledger
      .filter(
        (l) =>
          l.type === 'OUTWARD' &&
          l.refId === customerId
      )
      .sort(
        (a, b) =>
          new Date(
            b.timestamp
          ) -
          new Date(
            a.timestamp
          )
      );
  }

  // ============================================================
  // PRODUCT-WISE HISTORY
  // ============================================================

  function productWiseFor(customerId) {

    const rows =
      historyFor(
        customerId
      );

    const map = {};

    rows.forEach((l) => {

      map[l.productId] =
        (
          map[l.productId] ||
          0
        ) +
        Number(
          l.meters || 0
        );

    });

    return Object.entries(
      map
    )
      .map(
        ([
          productId,
          meters,
        ]) => ({
          product:
            productMap[
              productId
            ],

          meters,
        })
      )
      .sort(
        (a, b) =>
          b.meters -
          a.meters
      );
  }

  // ============================================================
  // SAVE CUSTOMER
  // ============================================================

  async function save() {

    if (
      !form.name.trim()
    ) {
      return;
    }

    try {

      await addCustomer({
        ...form,
        name:
          form.name.trim(),
        contact:
          form.contact.trim(),
        phone:
          form.phone.trim(),
        city:
          form.city.trim(),
        segment:
          form.segment.trim(),
      });

      setForm(
        EMPTY
      );

      setAddOpen(
        false
      );

    } catch (error) {

      alert(
        error?.message ||
        'Failed to create customer.'
      );

    }
  }

  // ============================================================
  // DELETE CUSTOMER
  // ============================================================

  function openDelete(
    customer,
    event
  ) {

    event?.stopPropagation();

    setSelected(null);

    setDeleteError('');

    setDeleteTarget(
      customer
    );
  }

  function closeDelete() {

    if (deleting) {
      return;
    }

    setDeleteTarget(
      null
    );

    setDeleteError('');
  }

  async function confirmDelete() {

    if (
      !deleteTarget
    ) {
      return;
    }

    try {

      setDeleting(
        true
      );

      await removeCustomer(
        deleteTarget.id
      );

      setDeleteTarget(
        null
      );

      setDeleteError('');

    } catch (error) {

      console.error(
        'Delete customer failed:',
        error
      );

      setDeleteError(
        error?.message ||
        'Failed to delete customer.'
      );

    } finally {

      setDeleting(
        false
      );
    }
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-ink-900/5
          bg-white
          shadow-[0_10px_35px_rgba(15,23,42,0.06)]
          px-6
          py-5
        "
      >

        <div
          className="
            absolute
            -right-10
            -top-16
            h-48
            w-48
            rounded-full
            bg-loom-100/40
            blur-3xl
            pointer-events-none
          "
        />

        <div className="relative flex items-center justify-between gap-4">

          <div className="flex items-start gap-3">

            <div
              className="
                h-11
                w-11
                rounded-xl
                bg-gradient-to-br
                from-loom-500
                to-loom-700
                text-white
                flex
                items-center
                justify-center
                shadow-lg
                shadow-loom-500/20
                shrink-0
              "
            >
              <Users
                size={19}
              />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <h1
                  className="
                    font-display
                    text-2xl
                    tracking-tight
                    text-ink-900
                  "
                >
                  Customers
                </h1>

                <span
                  className="
                    inline-flex
                    items-center
                    rounded-full
                    bg-slate-100
                    border
                    border-slate-200
                    px-2
                    py-0.5
                    text-[9px]
                    font-semibold
                    tracking-[0.12em]
                    text-slate-600
                  "
                >
                  CRM
                </span>

              </div>

              <p className="text-sm text-ink-700/55 mt-1">
                Manage customers and view their
                product-wise purchase history.
              </p>

            </div>

          </div>

          <button
            className="
              btn-primary
              shadow-md
              shadow-loom-500/10
            "
            onClick={() =>
              setAddOpen(true)
            }
          >
            <Plus
              size={15}
            />
            Add Customer
          </button>

        </div>

      </div>

      {/* ======================================================
          SEARCH
      ====================================================== */}

      <div className="flex items-center gap-3">

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, city, phone, contact or segment…"
          className="max-w-md"
        />

        <span
          className="
            text-xs
            text-ink-700/45
            ml-auto
          "
        >
          {filtered.length}{' '}
          customer
          {filtered.length === 1
            ? ''
            : 's'}
        </span>

      </div>

      {/* ======================================================
          CUSTOMER CARDS
      ====================================================== */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-3
          gap-4
        "
      >

        {filtered.map(
          (customer) => {

            return (
              <div
                key={
                  customer.id
                }
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  border-ink-900/5
                  bg-white
                  shadow-[0_7px_24px_rgba(15,23,42,0.045)]
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:border-loom-200
                  hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]
                "
              >

                {/* Accent */}

                <div
                  className="
                    absolute
                    inset-x-0
                    top-0
                    h-1
                    bg-gradient-to-r
                    from-loom-500
                    via-loom-400
                    to-transparent
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      customer
                    )
                  }
                  className="
                    w-full
                    text-left
                    p-5
                    pb-4
                  "
                >

                  <div className="flex items-start gap-3">

                    <div
                      className="
                        h-10
                        w-10
                        rounded-xl
                        bg-slate-100
                        border
                        border-slate-200
                        flex
                        items-center
                        justify-center
                        text-slate-500
                        shrink-0
                      "
                    >
                      <UserRound
                        size={17}
                      />
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center gap-2">

                        <p
                          className="
                            font-display
                            text-base
                            font-semibold
                            text-ink-900
                            truncate
                          "
                        >
                          {customer.name}
                        </p>

                      </div>

                      {customer.segment && (
                        <span
                          className="
                            inline-flex
                            mt-1.5
                            rounded-full
                            bg-loom-50
                            border
                            border-loom-100
                            px-2
                            py-0.5
                            text-[10px]
                            font-medium
                            text-loom-700
                          "
                        >
                          {customer.segment}
                        </span>
                      )}

                    </div>

                    <ChevronRight
                      size={17}
                      className="
                        text-ink-700/20
                        group-hover:text-loom-500
                        transition-colors
                        mt-1
                        shrink-0
                      "
                    />

                  </div>

                  {/* Details */}

                  <div
                    className="
                      mt-4
                      space-y-2
                    "
                  >

                    {customer.city && (
                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          text-xs
                          text-ink-700/55
                        "
                      >
                        <MapPin
                          size={13}
                          className="text-ink-700/35"
                        />
                        <span>
                          {customer.city}
                        </span>
                      </div>
                    )}

                    {customer.contact && (
                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          text-xs
                          text-ink-700/55
                        "
                      >
                        <UserRound
                          size={13}
                          className="text-ink-700/35"
                        />
                        <span>
                          {customer.contact}
                        </span>
                      </div>
                    )}

                    {customer.phone && (
                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          text-xs
                          text-ink-700/55
                        "
                      >
                        <Phone
                          size={13}
                          className="text-ink-700/35"
                        />
                        <span>
                          {customer.phone}
                        </span>
                      </div>
                    )}

                  </div>

                </button>

                {/* Bottom actions */}

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    border-t
                    border-ink-900/5
                    px-5
                    py-3
                    bg-slate-50/50
                  "
                >

                  <span
                    className="
                      text-[10px]
                      uppercase
                      tracking-[0.1em]
                      text-ink-700/35
                    "
                  >
                    Customer
                  </span>

                  <button
                    type="button"
                    onClick={(event) =>
                      openDelete(
                        customer,
                        event
                      )
                    }
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      px-2.5
                      py-1.5
                      text-xs
                      font-medium
                      text-red-500
                      hover:bg-red-50
                      hover:text-red-600
                      transition-colors
                    "
                    title="Delete customer"
                  >
                    <Trash2
                      size={13}
                    />
                    Delete
                  </button>

                </div>

              </div>
            );
          }
        )}

      </div>

      {/* Empty */}

      {filtered.length === 0 && (
        <div
          className="
            rounded-2xl
            border
            border-dashed
            border-ink-900/10
            bg-slate-50/50
            p-10
            text-center
          "
        >

          <Users
            size={28}
            className="
              mx-auto
              text-ink-700/20
              mb-3
            "
          />

          <p
            className="
              font-display
              text-base
              text-ink-700/60
            "
          >
            No customers match.
          </p>

          <p className="text-xs text-ink-700/40 mt-1">
            Try a different search term.
          </p>

        </div>
      )}

      {/* ======================================================
          CUSTOMER DETAIL MODAL
      ====================================================== */}

      <Modal
        open={!!selected}
        onClose={() =>
          setSelected(null)
        }
        title={
          selected?.name || ''
        }
        width="max-w-2xl"
      >

        {selected && (
          <div className="space-y-5">

            {/* Customer identity */}

            <div
              className="
                rounded-2xl
                border
                border-ink-900/5
                bg-gradient-to-br
                from-slate-50
                via-white
                to-loom-50/30
                p-4
              "
            >

              <div className="flex items-start gap-3">

                <div
                  className="
                    h-10
                    w-10
                    rounded-xl
                    bg-loom-50
                    border
                    border-loom-100
                    flex
                    items-center
                    justify-center
                    text-loom-600
                  "
                >
                  <UserRound
                    size={17}
                  />
                </div>

                <div>

                  <h3
                    className="
                      font-display
                      text-lg
                      font-semibold
                      text-ink-900
                    "
                  >
                    {selected.name}
                  </h3>

                  <p className="text-xs text-ink-700/50 mt-1">
                    {[
                      selected.city,
                      selected.segment,
                      selected.contact,
                      selected.phone,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' · '
                      )}
                  </p>

                </div>

              </div>

            </div>

            {/* Product-wise purchases */}

            <div>

              <div
                className="
                  flex
                  items-center
                  gap-2
                  mb-3
                "
              >

                <div
                  className="
                    h-7
                    w-7
                    rounded-lg
                    bg-slate-100
                    flex
                    items-center
                    justify-center
                    text-slate-500
                  "
                >
                  <ShoppingBag
                    size={14}
                  />
                </div>

                <h4 className="font-display text-base">
                  Product-wise purchases
                </h4>

              </div>

              <div className="space-y-2">

                {productWiseFor(
                  selected.id
                ).map(
                  ({
                    product,
                    meters,
                  }) => (
                    <div
                      key={
                        product?.id
                      }
                      className="
                        flex
                        items-center
                        justify-between
                        gap-4
                        rounded-xl
                        border
                        border-ink-900/5
                        bg-slate-50/40
                        px-3
                        py-2.5
                      "
                    >

                      <div className="min-w-0">

                        <div className="flex items-center gap-2">

                          <span className="text-xs font-semibold text-ink-900">
                            {product?.sku ||
                              '—'}
                          </span>

                          {product?.category && (
                            <span
                              className="
                                text-[9px]
                                font-semibold
                                uppercase
                                tracking-[0.08em]
                                text-ink-700/40
                              "
                            >
                              {product.category}
                            </span>
                          )}

                        </div>

                        <div className="text-xs text-ink-700/50 truncate">
                          {product?.name ||
                            'Product'}
                        </div>

                      </div>

                      <span className="font-display text-sm font-semibold shrink-0">
                        {Number(
                          meters
                        ).toLocaleString(
                          'en-IN'
                        )}{' '}
                        m
                      </span>

                    </div>
                  )
                )}

                {productWiseFor(
                  selected.id
                ).length === 0 && (
                  <p className="text-sm text-ink-700/50">
                    No dispatches on record yet.
                  </p>
                )}

              </div>

            </div>

            {/* Recent dispatches */}

            <div>

              <h4 className="font-display text-base mb-3">
                Recent dispatches
              </h4>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">

                {historyFor(
                  selected.id
                )
                  .slice(
                    0,
                    15
                  )
                  .map(
                    (l) => (
                      <div
                        key={l.id}
                        className="
                          flex
                          justify-between
                          gap-4
                          rounded-lg
                          px-3
                          py-2
                          hover:bg-slate-50
                        "
                      >

                        <span className="text-xs text-ink-700/60">

                          {productMap[
                            l.productId
                          ]?.sku ||
                            '—'}

                          {' · '}

                          {Number(
                            l.meters || 0
                          ).toLocaleString(
                            'en-IN'
                          )}{' '}
                          m

                        </span>

                        <span className="text-xs text-ink-700/45 shrink-0">
                          {formatDate(
                            l.timestamp
                          )}
                        </span>

                      </div>
                    )
                  )}

              </div>

            </div>

          </div>
        )}

      </Modal>

      {/* ======================================================
          ADD CUSTOMER MODAL
      ====================================================== */}

      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(
            false
          );

          setForm(
            EMPTY
          );
        }}
        title="Add Customer"
      >

        <div className="space-y-4">

          <Field label="Name">
            <input
              className="input"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name:
                    e.target.value,
                })
              }
              placeholder="Customer / Company name"
            />
          </Field>

          <Field label="Contact Person">
            <input
              className="input"
              value={form.contact}
              onChange={(e) =>
                setForm({
                  ...form,
                  contact:
                    e.target.value,
                })
              }
              placeholder="Contact person"
            />
          </Field>

          <Field label="Phone">
            <input
              className="input"
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone:
                    e.target.value,
                })
              }
              placeholder="+91..."
            />
          </Field>

          <Field label="City">
            <input
              className="input"
              value={form.city}
              onChange={(e) =>
                setForm({
                  ...form,
                  city:
                    e.target.value,
                })
              }
              placeholder="City"
            />
          </Field>

          <Field label="Segment">
            <input
              className="input"
              value={form.segment}
              onChange={(e) =>
                setForm({
                  ...form,
                  segment:
                    e.target.value,
                })
              }
              placeholder="Retail Showroom / Wholesale / Designer"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">

            <button
              className="btn-secondary"
              onClick={() => {
                setAddOpen(
                  false
                );

                setForm(
                  EMPTY
                );
              }}
            >
              Cancel
            </button>

            <button
              className="
                btn-primary
                min-w-[130px]
                justify-center
              "
              onClick={save}
              disabled={
                !form.name.trim()
              }
            >
              Save Customer
            </button>

          </div>

        </div>

      </Modal>

      {/* ======================================================
          DELETE CONFIRMATION
      ====================================================== */}

      <Modal
        open={!!deleteTarget}
        onClose={closeDelete}
        title="Delete Customer"
      >

        {deleteTarget && (
          <div className="space-y-5">

            <div
              className="
                rounded-2xl
                border
                border-red-200
                bg-gradient-to-br
                from-red-50
                to-white
                p-4
              "
            >

              <div className="flex items-start gap-3">

                <div
                  className="
                    h-10
                    w-10
                    rounded-xl
                    bg-red-100
                    text-red-600
                    flex
                    items-center
                    justify-center
                    shrink-0
                  "
                >
                  <AlertTriangle
                    size={18}
                  />
                </div>

                <div>

                  <h3 className="font-display text-base font-semibold text-ink-900">
                    Delete{' '}
                    {deleteTarget.name}?
                  </h3>

                  <p className="text-sm text-ink-700/55 mt-1">
                    This will permanently remove
                    the customer from the customer
                    master.
                  </p>

                </div>

              </div>

            </div>

            {deleteError && (
              <div
                className="
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  px-3
                  py-3
                  flex
                  items-start
                  gap-2
                "
              >

                <X
                  size={16}
                  className="
                    text-red-600
                    shrink-0
                    mt-0.5
                  "
                />

                <p className="text-sm text-red-700">
                  {deleteError}
                </p>

              </div>
            )}

            <div className="flex justify-end gap-2">

              <button
                className="btn-secondary"
                onClick={
                  closeDelete
                }
                disabled={
                  deleting
                }
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmDelete
                }
                disabled={
                  deleting
                }
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-red-600
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-white
                  shadow-sm
                  shadow-red-600/20
                  hover:bg-red-700
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  transition-colors
                "
              >

                <Trash2
                  size={15}
                />

                {deleting
                  ? 'Deleting...'
                  : 'Delete Customer'}

              </button>

            </div>

          </div>
        )}

      </Modal>

    </div>
  );
}


// ============================================================
// FIELD
// ============================================================

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