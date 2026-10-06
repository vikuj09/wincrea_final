import React, { useMemo, useState, useEffect } from 'react';
import {
  PackageMinus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

import { useApp } from '../context/AppContext';
import SearchInput from '../components/common/SearchInput';

export default function Outward() {
  const {
    products = [],
    rolls = [],
    customers = [],
    currentUser,
    createProformaInvoice,
    loadRolls,
    loadProducts,
    loadTransactions,
    loadProformaInvoices,
  } = useApp();

  const [productId, setProductId] = useState('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [note, setNote] = useState('');

  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // ------------------------------------------------------------
  // Default customer
  // ------------------------------------------------------------

  useEffect(() => {
    if (
      !customerId &&
      customers.length > 0
    ) {
      setCustomerId(
        String(customers[0].id)
      );
    }
  }, [customers, customerId]);

  // ------------------------------------------------------------
  // Product map
  // ------------------------------------------------------------

  const productMap = useMemo(
    () =>
      Object.fromEntries(
        products.map((product) => [
          Number(product.id),
          product,
        ])
      ),
    [products]
  );

  // ------------------------------------------------------------
  // Available rolls
  // ------------------------------------------------------------

  const availableRolls = useMemo(() => {
    const term =
      query.trim().toLowerCase();

    return rolls.filter((roll) => {
      // Only genuinely available rolls
      if (
        roll.status !== 'AVAILABLE' &&
        roll.status !== 'Available'
      ) {
        return false;
      }

      const remaining = Number(
        roll.remainingLength ??
          roll.length ??
          0
      );

      if (remaining <= 0) {
        return false;
      }

      // Product filter
      if (
        productId !== 'All' &&
        Number(roll.productId) !==
          Number(productId)
      ) {
        return false;
      }

      // Search
      if (!term) {
        return true;
      }

      const rollIdentifier =
        String(
          roll.rollId ||
            roll.id ||
            ''
        ).toLowerCase();

      const batch =
        String(
          roll.batch || ''
        ).toLowerCase();

      const product =
        productMap[
          Number(roll.productId)
        ];

      const sku =
        String(
          product?.sku || ''
        ).toLowerCase();

      const productName =
        String(
          product?.name ||
            roll.productName ||
            ''
        ).toLowerCase();

      const color =
        String(
          product?.color ||
            roll.color ||
            ''
        ).toLowerCase();

      const category =
        String(
          product?.category || ''
        ).toLowerCase();

      return (
        rollIdentifier.includes(term) ||
        batch.includes(term) ||
        sku.includes(term) ||
        productName.includes(term) ||
        color.includes(term) ||
        category.includes(term)
      );
    });
  }, [
    rolls,
    productId,
    query,
    productMap,
  ]);

  // ------------------------------------------------------------
  // Selected rolls
  // ------------------------------------------------------------

  const selectedRolls = useMemo(
    () =>
      rolls.filter((roll) =>
        selected.includes(
          roll.id
        )
      ),
    [rolls, selected]
  );

  // ------------------------------------------------------------
  // Total meters
  // Whole current roll is always dispatched
  // ------------------------------------------------------------

  const totalMeters = useMemo(
    () =>
      selectedRolls.reduce(
        (total, roll) =>
          total +
          Number(
            roll.remainingLength ??
              roll.length ??
              0
          ),
        0
      ),
    [selectedRolls]
  );

  // ------------------------------------------------------------
  // Toggle roll
  // ------------------------------------------------------------

  function toggleRoll(rollId) {
    setSelected((prev) => {
      if (prev.includes(rollId)) {
        return prev.filter(
          (id) => id !== rollId
        );
      }

      return [
        ...prev,
        rollId,
      ];
    });
  }

  // ------------------------------------------------------------
  // Select all filtered rolls
  // ------------------------------------------------------------

  function selectAll() {
    const ids =
      availableRolls.map(
        (roll) => roll.id
      );

    setSelected((prev) => {
      const merged = new Set([
        ...prev,
        ...ids,
      ]);

      return Array.from(merged);
    });
  }

  // ------------------------------------------------------------
  // Clear selection
  // ------------------------------------------------------------

  function clearSelection() {
    setSelected([]);
  }

  // ------------------------------------------------------------
  // Dispatch
  //
  // IMPORTANT:
  // This creates a DRAFT PI only.
  // It does NOT deduct stock.
  // ------------------------------------------------------------

  async function submit() {
    setError(null);
    setConfirmation(null);

    if (selectedRolls.length === 0) {
      setError(
        'Please select at least one roll.'
      );
      return;
    }

    if (!customerId) {
      setError(
        'Please select a customer.'
      );
      return;
    }

    // ----------------------------------------------------------
    // Re-check every selected roll locally
    // ----------------------------------------------------------

    for (const roll of selectedRolls) {
      const remaining = Number(
        roll.remainingLength ??
          roll.length ??
          0
      );

      if (
        !Number.isFinite(
          remaining
        ) ||
        remaining <= 0
      ) {
        setError(
          `Roll ${
            roll.rollId || roll.id
          } has no remaining stock.`
        );
        return;
      }

      if (
        roll.status !== 'AVAILABLE' &&
        roll.status !== 'Available'
      ) {
        setError(
          `Roll ${
            roll.rollId || roll.id
          } is no longer available. Refresh the page and try again.`
        );
        return;
      }
    }

    try {
      setSaving(true);

      const items =
        selectedRolls.map(
          (roll) => {
            const product =
              productMap[
                Number(roll.productId)
              ];

            const quantity =
              Number(
                roll.remainingLength ??
                  roll.length ??
                  0
              );

            const rate =
              Number(
                product?.ratePerMeter
              ) || 0;

            return {
              rollId:
                Number(roll.id),

              productId:
                Number(
                  roll.productId
                ),

              quantity,

              ratePerMeter:
                rate,
            };
          }
        );

      // --------------------------------------------------------
      // Create DRAFT PI
      // No stock deduction here.
      // --------------------------------------------------------

      const result =
        await createProformaInvoice({
          customerId:
            Number(customerId),

          invoiceDate:
            new Date()
              .toISOString()
              .slice(0, 10),

          remarks:
            note.trim() || null,

          createdBy:
            currentUser?.id
              ? Number(
                  currentUser.id
                )
              : null,

          items,
        });

      // --------------------------------------------------------
      // Refresh database-backed data
      // --------------------------------------------------------

      await Promise.all([
        loadRolls?.(),
        loadProducts?.(),
        loadTransactions?.(),
        loadProformaInvoices?.(),
      ]);

      const piNumber =
        result?.piNumber ||
        result?.pi_number ||
        'Draft PI';

      setConfirmation(
        `${selectedRolls.length} roll(s) prepared — ${totalMeters.toLocaleString(
          'en-IN'
        )} m. ${piNumber} created as DRAFT. Stock has not been deducted.`
      );

      setSelected([]);
      setNote('');

    } catch (err) {
      console.error(
        'OUTWARD DRAFT ERROR:',
        err
      );

      setError(
        err?.message ||
          'Failed to create draft outward order.'
      );
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------------------------
  // Customer name
  // ------------------------------------------------------------

  const selectedCustomer =
    customers.find(
      (customer) =>
        Number(customer.id) ===
        Number(customerId)
    );

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>
          <h1 className="font-display text-2xl">
            Outward
          </h1>

          <p className="text-sm text-ink-700/60 mt-1">
            Prepare an outward order by selecting complete rolls.
            Final confirmation is done from Suppliers & PI.
          </p>
        </div>

        <div className="rounded-xl border border-loom-200 bg-loom-50 px-4 py-3 text-sm">
          <div className="font-medium text-loom-700">
            Draft workflow
          </div>

          <div className="text-ink-700/60 mt-0.5">
            Dispatch here → Confirm in Suppliers & PI
          </div>
        </div>

      </div>

      {/* ======================================================
          MAIN GRID
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ====================================================
            ROLL SELECTION
        ==================================================== */}

        <div className="lg:col-span-2 space-y-3">

          {/* Filters */}

          <div className="flex flex-wrap items-center gap-3">

            <select
              className="input w-auto"
              value={productId}
              onChange={(event) =>
                setProductId(
                  event.target.value
                )
              }
            >
              <option value="All">
                All products
              </option>

              {products.map(
                (product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.sku}
                  </option>
                )
              )}
            </select>

            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search roll ID, batch, SKU, category…"
              className="max-w-xs"
            />

            <button
              type="button"
              className="btn-secondary"
              onClick={selectAll}
              disabled={
                availableRolls.length === 0
              }
            >
              Select all
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={clearSelection}
              disabled={
                selected.length === 0
              }
            >
              Clear
            </button>

          </div>

          {/* Roll list */}

          <div className="card overflow-hidden">

            <div className="px-4 py-3 border-b border-ink-900/5 flex items-center justify-between">

              <div>
                <h2 className="font-display text-base">
                  Available Rolls
                </h2>

                <p className="text-xs text-ink-700/50 mt-0.5">
                  Selecting a roll always dispatches its full current remaining length.
                </p>
              </div>

              <div className="text-xs text-ink-700/50">
                {availableRolls.length}{' '}
                available
              </div>

            </div>

            <div className="divide-y divide-ink-900/5 max-h-[34rem] overflow-y-auto">

              {availableRolls.length === 0 && (
                <div className="p-6 text-center">
                  <PackageMinus
                    size={24}
                    className="mx-auto text-ink-700/20 mb-2"
                  />

                  <p className="text-sm text-ink-700/50">
                    No available rolls match your filter.
                  </p>
                </div>
              )}

              {availableRolls.map(
                (roll) => {
                  const product =
                    productMap[
                      Number(
                        roll.productId
                      )
                    ];

                  const remaining =
                    Number(
                      roll.remainingLength ??
                        roll.length ??
                        0
                    );

                  const category =
                    String(
                      product?.category ||
                      'ESSENTIAL'
                    ).toUpperCase();

                  const isPremium =
                    category ===
                    'PREMIUM';

                  const isSelected =
                    selected.includes(
                      roll.id
                    );

                  return (
                    <button
                      key={roll.id}
                      type="button"
                      onClick={() =>
                        toggleRoll(
                          roll.id
                        )
                      }
                      className={`
                        w-full
                        text-left
                        px-4
                        py-3
                        transition
                        hover:bg-loom-50/50
                        ${
                          isSelected
                            ? 'bg-loom-50'
                            : ''
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">

                        {/* Checkbox */}

                        <div
                          className={`
                            h-5
                            w-5
                            rounded
                            border
                            flex
                            items-center
                            justify-center
                            shrink-0
                            ${
                              isSelected
                                ? 'border-loom-600 bg-loom-600 text-white'
                                : 'border-ink-900/20 bg-white'
                            }
                          `}
                        >
                          {isSelected && (
                            <CheckCircle2
                              size={14}
                            />
                          )}
                        </div>

                        {/* Main */}

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">

                            <span className="font-display text-base font-semibold tracking-[-0.01em] text-ink-900">
                              {product?.name ||
                                roll.productName ||
                                'Product'}
                            </span>

                            <span className="text-[11px] uppercase tracking-[0.04em] text-ink-700/40">
                              {product?.sku ||
                                '—'}
                            </span>

                            {/* CATEGORY */}

                            {isPremium ? (
                              <span
                                className="
                                  inline-flex
                                  items-center
                                  gap-1
                                  px-2.5
                                  py-1
                                  rounded-full
                                  text-[10px]
                                  font-semibold
                                  tracking-[0.08em]
                                  bg-gradient-to-r
                                  from-violet-100
                                  via-fuchsia-100
                                  to-violet-100
                                  text-violet-800
                                  border
                                  border-violet-200
                                  shadow-sm
                                "
                              >
                                <span className="text-[8px] text-violet-600">
                                  ◆
                                </span>
                                PREMIUM
                              </span>
                            ) : (
                              <span
                                className="
                                  inline-flex
                                  items-center
                                  gap-1
                                  px-2.5
                                  py-1
                                  rounded-full
                                  text-[10px]
                                  font-semibold
                                  tracking-[0.08em]
                                  bg-slate-100
                                  text-slate-700
                                  border
                                  border-slate-200
                                "
                              >
                                <span
                                  className="
                                    w-1.5
                                    h-1.5
                                    rounded-full
                                    bg-slate-500
                                  "
                                />
                                ESSENTIAL
                              </span>
                            )}

                            {product?.color && (
                              <span className="text-xs text-ink-700/50">
                                {product.color}
                              </span>
                            )}

                            {roll.batch && (
                              <span className="text-xs text-ink-700/50">
                                Batch:{' '}
                                {roll.batch}
                              </span>
                            )}

                          </div>

                          <div className="text-xs text-ink-700/50 mt-1">
                            Roll ID:{' '}
                            <span className="font-medium text-ink-700/70">
                              {roll.rollId ||
                                roll.id}
                            </span>

                            {product?.width != null
                              ? ` · ${product.width} cm`
                              : ''}
                          </div>

                        </div>

                        {/* Length */}

                        <div className="text-right shrink-0">

                          <div className="font-display text-base">
                            {remaining.toLocaleString(
                              'en-IN'
                            )}{' '}
                            m
                          </div>

                          <div className="text-[11px] text-ink-700/45">
                            full roll
                          </div>

                        </div>

                      </div>
                    </button>
                  );
                }
              )}

            </div>
          </div>

        </div>

        {/* ====================================================
            DISPATCH SUMMARY
        ==================================================== */}

        <div className="space-y-3">

          <div className="card p-5 space-y-5">

            <div>
              <h2 className="font-display text-base">
                Dispatch Summary
              </h2>

              <p className="text-xs text-ink-700/50 mt-1">
                This creates a draft PI only. Stock stays unchanged until confirmation.
              </p>
            </div>

            {/* Summary */}

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-canvas border border-ink-900/5 p-3">
                <div className="text-xs text-ink-700/50">
                  Rolls
                </div>

                <div className="font-display text-xl mt-1">
                  {selectedRolls.length}
                </div>
              </div>

              <div className="rounded-xl bg-canvas border border-ink-900/5 p-3">
                <div className="text-xs text-ink-700/50">
                  Total meters
                </div>

                <div className="font-display text-xl mt-1">
                  {totalMeters.toLocaleString(
                    'en-IN'
                  )}
                </div>
              </div>

            </div>

            {/* Customer */}

            <div>
              <label className="label">
                Customer
              </label>

              <select
                className="input"
                value={customerId}
                onChange={(event) =>
                  setCustomerId(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select customer
                </option>

                {customers.map(
                  (customer) => (
                    <option
                      key={
                        customer.id
                      }
                      value={
                        customer.id
                      }
                    >
                      {customer.name}
                    </option>
                  )
                )}
              </select>

              {selectedCustomer && (
                <p className="text-xs text-ink-700/50 mt-1">
                  This customer will be shown on the PI.
                </p>
              )}
            </div>

            {/* Note */}

            <div>
              <label className="label">
                Note
              </label>

              <input
                className="input"
                value={note}
                onChange={(event) =>
                  setNote(
                    event.target.value
                  )
                }
                placeholder="e.g. Against SO #2091"
              />
            </div>

            {/* Selected roll preview */}

            {selectedRolls.length > 0 && (
              <div className="border border-ink-900/5 rounded-xl overflow-hidden">

                <div className="px-3 py-2 bg-canvas border-b border-ink-900/5 text-xs font-medium">
                  Selected rolls
                </div>

                <div className="max-h-44 overflow-y-auto divide-y divide-ink-900/5">

                  {selectedRolls.map(
                    (roll) => {

                      const product =
                        productMap[
                          Number(
                            roll.productId
                          )
                        ];

                      const category =
                        String(
                          product?.category ||
                          'ESSENTIAL'
                        ).toUpperCase();

                      const isPremium =
                        category ===
                        'PREMIUM';

                      return (
                        <div
                          key={roll.id}
                          className="px-3 py-2 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">

                            <div className="flex items-center gap-2 flex-wrap">

                              <div className="font-display text-sm font-semibold tracking-[-0.01em] text-ink-900 truncate">
                                {product?.name ||
                                  roll.productName ||
                                  'Product'}
                              </div>

                              {isPremium ? (
                                <span
                                  className="
                                    inline-flex
                                    items-center
                                    gap-1
                                    px-2
                                    py-0.5
                                    rounded-full
                                    text-[9px]
                                    font-semibold
                                    tracking-[0.08em]
                                    bg-violet-100
                                    text-violet-800
                                    border
                                    border-violet-200
                                  "
                                >
                                  ◆ PREMIUM
                                </span>
                              ) : (
                                <span
                                  className="
                                    inline-flex
                                    items-center
                                    gap-1
                                    px-2
                                    py-0.5
                                    rounded-full
                                    text-[9px]
                                    font-semibold
                                    tracking-[0.08em]
                                    bg-slate-100
                                    text-slate-700
                                    border
                                    border-slate-200
                                  "
                                >
                                  ESSENTIAL
                                </span>
                              )}

                            </div>

                            <div className="text-xs text-ink-700/50 mt-1">
                              {product?.sku ||
                                '—'}
                              {' · '}
                              Roll ID{' '}
                              <span className="text-ink-700/65">
                                {roll.rollId ||
                                  roll.id}
                              </span>
                            </div>

                          </div>

                          <div className="text-sm font-medium shrink-0">
                            {Number(
                              roll.remainingLength ??
                                roll.length ??
                                0
                            ).toLocaleString(
                              'en-IN'
                            )}{' '}
                            m
                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              </div>
            )}

            {/* Warning */}

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 flex gap-2">

              <AlertCircle
                size={17}
                className="text-amber-600 shrink-0 mt-0.5"
              />

              <div className="text-xs text-amber-800">
                <div className="font-medium">
                  Stock is not deducted here.
                </div>

                <div className="mt-0.5 opacity-80">
                  After dispatching, go to
                  <strong>
                    {' '}
                    Suppliers & PI
                  </strong>{' '}
                  and confirm the draft PI.
                </div>
              </div>

            </div>

            {/* Error */}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 flex gap-2">

                <AlertCircle
                  size={17}
                  className="text-red-600 shrink-0"
                />

                <p className="text-sm text-red-700">
                  {error}
                </p>

              </div>
            )}

            {/* Success */}

            {confirmation && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 flex gap-2">

                <CheckCircle2
                  size={17}
                  className="text-green-600 shrink-0"
                />

                <p className="text-sm text-green-700">
                  {confirmation}
                </p>

              </div>
            )}

            {/* Submit */}

            <button
              type="button"
              className="btn-primary w-full justify-center"
              onClick={submit}
              disabled={
                saving ||
                selectedRolls.length ===
                  0 ||
                !customerId
              }
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                  Creating Draft PI...
                </>
              ) : (
                <>
                  <PackageMinus size={15} />
                  Dispatch
                </>
              )}
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}