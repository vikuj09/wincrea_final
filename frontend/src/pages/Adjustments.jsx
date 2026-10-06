import React, { useMemo, useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Minus,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';

import { useApp } from '../context/AppContext';

import DataTable from '../components/common/DataTable';
import SearchInput from '../components/common/SearchInput';
import Badge, {
  statusTone,
} from '../components/common/Badge';
import Modal from '../components/common/Modal';

const ADJUSTMENT_TYPES = [
  {
    value: 'INCREASE',
    label: 'Increase Stock',
  },
  {
    value: 'DECREASE',
    label: 'Decrease Stock',
  },
  {
    value: 'SET',
    label: 'Set Exact Quantity',
  },
];

const REASONS = [
  {
    value: 'DAMAGED',
    label: 'Damaged',
  },
  {
    value: 'LOST',
    label: 'Lost',
  },
  {
    value: 'MEASUREMENT_CORRECTION',
    label: 'Measurement Correction',
  },
  {
    value: 'OTHER',
    label: 'Other',
  },
];

export default function Adjustments() {
  const {
    rolls,
    products,
    adjustments,
    createAdjustment,
    loadAdjustments,
  } = useApp();

  const [query, setQuery] = useState('');

  const [target, setTarget] = useState(null);

  const [adjustmentType, setAdjustmentType] =
    useState('DECREASE');

  const [quantity, setQuantity] = useState('');

  const [reason, setReason] =
    useState('DAMAGED');

  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);

  // =========================================================
  // PRODUCT MAP
  // =========================================================

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

  // =========================================================
  // CATEGORY BADGE
  // =========================================================

  function CategoryBadge({ category, compact = false }) {
    const normalized =
      String(
        category || 'ESSENTIAL'
      ).toUpperCase();

    const isPremium =
      normalized === 'PREMIUM';

    if (isPremium) {
      return (
        <span
          className={`
            inline-flex
            items-center
            gap-1.5
            ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1.5'}
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
            whitespace-nowrap
          `}
        >
          <Sparkles
            size={compact ? 9 : 10}
            strokeWidth={2.2}
          />

          PREMIUM
        </span>
      );
    }

    return (
      <span
        className={`
          inline-flex
          items-center
          gap-1.5
          ${compact ? 'px-2 py-0.5' : 'px-2.5 py-1.5'}
          rounded-full
          text-[10px]
          font-semibold
          tracking-[0.08em]
          bg-slate-100
          text-slate-700
          border
          border-slate-200
          whitespace-nowrap
        `}
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
    );
  }

  // =========================================================
  // ROLL LIST
  // =========================================================

  const filteredRolls = useMemo(() => {
    const term =
      query.trim().toLowerCase();

    const availableRolls =
      rolls.filter((roll) => {
        const remaining =
          Number(
            roll.remainingLength ??
              roll.remaining_length ??
              0
          );

        return remaining > 0;
      });

    if (!term) {
      return availableRolls;
    }

    return availableRolls.filter((roll) => {
      const product =
        productMap[
          Number(
            roll.productId
          )
        ];

      const rollNumber =
        String(
          roll.rollId ??
            roll.roll_id ??
            roll.id ??
            ''
        ).toLowerCase();

      const sku =
        String(
          product?.sku ??
            ''
        ).toLowerCase();

      const productName =
        String(
          product?.name ??
            ''
        ).toLowerCase();

      const category =
        String(
          product?.category ??
            ''
        ).toLowerCase();

      const color =
        String(
          product?.color ??
            roll.color ??
            ''
        ).toLowerCase();

      return (
        rollNumber.includes(term) ||
        sku.includes(term) ||
        productName.includes(term) ||
        category.includes(term) ||
        color.includes(term)
      );
    });
  }, [
    rolls,
    query,
    productMap,
  ]);

  // =========================================================
  // OPEN MODAL
  // =========================================================

  function openAdjust(row) {
    setTarget(row);
    setAdjustmentType('DECREASE');
    setQuantity('');
    setReason('DAMAGED');
    setNotes('');
  }

  function closeModal() {
    if (saving) return;

    setTarget(null);
    setQuantity('');
    setNotes('');
    setReason('DAMAGED');
    setAdjustmentType('DECREASE');
  }

  // =========================================================
  // CURRENT LENGTH
  // =========================================================

  const currentLength = target
    ? Number(
        target.remainingLength ??
          target.remaining_length ??
          0
      )
    : 0;

  const numericQuantity =
    Number(quantity);

  // =========================================================
  // TARGET PRODUCT
  // =========================================================

  const targetProduct = target
    ? productMap[
        Number(
          target.productId
        )
      ]
    : null;

  const targetCategory =
    targetProduct?.category ||
    'ESSENTIAL';

  // =========================================================
  // PREVIEW
  // =========================================================

  const previewLength = useMemo(() => {
    if (
      !target ||
      quantity === ''
    ) {
      return currentLength;
    }

    if (
      !Number.isFinite(
        numericQuantity
      ) ||
      numericQuantity < 0
    ) {
      return currentLength;
    }

    if (
      adjustmentType ===
      'INCREASE'
    ) {
      return (
        currentLength +
        numericQuantity
      );
    }

    if (
      adjustmentType ===
      'DECREASE'
    ) {
      return (
        currentLength -
        numericQuantity
      );
    }

    return numericQuantity;
  }, [
    target,
    quantity,
    numericQuantity,
    adjustmentType,
    currentLength,
  ]);

  // =========================================================
  // VALIDATION
  // =========================================================

  function getValidationError() {
    if (!target) {
      return 'Please select a roll.';
    }

    if (quantity === '') {
      return 'Please enter a quantity.';
    }

    if (
      !Number.isFinite(
        numericQuantity
      ) ||
      numericQuantity < 0
    ) {
      return 'Quantity must be a valid non-negative number.';
    }

    if (
      adjustmentType ===
        'DECREASE' &&
      numericQuantity >
        currentLength
    ) {
      return `You cannot decrease more than ${currentLength.toFixed(
        2
      )} m.`;
    }

    const originalLength =
      Number(
        target.originalLength ??
          target.original_length ??
          0
      );

    if (
      originalLength > 0 &&
      previewLength >
        originalLength
    ) {
      return `New length cannot exceed the original length of ${originalLength.toFixed(
        2
      )} m.`;
    }

    if (previewLength < 0) {
      return 'Remaining length cannot be negative.';
    }

    if (!reason) {
      return 'Please select a reason.';
    }

    return null;
  }

  // =========================================================
  // SAVE
  // =========================================================

  async function confirmAdjustment() {
    const error =
      getValidationError();

    if (error) {
      alert(error);
      return;
    }

    try {
      setSaving(true);

      await createAdjustment({
        rollId: Number(
          target.id
        ),

        adjustmentType,

        quantity:
          numericQuantity,

        reason,

        notes,

        userId: 1,
      });

      closeModal();
    } catch (error) {
      console.error(
        'Adjustment failed:',
        error
      );

      alert(
        error.message ||
          'Failed to apply adjustment.'
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // ADJUSTMENT HISTORY
  // =========================================================

  const historyRows =
    useMemo(() => {
      return adjustments.map(
        (adjustment) => ({
          ...adjustment,
        })
      );
    }, [adjustments]);

  // =========================================================
  // ROLL TABLE
  // =========================================================

  const rollColumns = [
    {
      key: 'rollNumber',
      header: 'Roll ID',

      sortable: true,

      render: (row) =>
        row.rollId ??
        row.roll_id ??
        row.id,
    },

    {
      key: 'sku',
      header: 'SKU',

      sortable: true,

      render: (row) =>
        productMap[
          Number(
            row.productId
          )
        ]?.sku ||
        '—',
    },

    {
      key: 'product',
      header: 'Product',

      sortable: true,

      render: (row) =>
        productMap[
          Number(
            row.productId
          )
        ]?.name ||
        '—',
    },

    {
      key: 'category',
      header: 'Category',

      sortable: true,

      sortValue: (row) =>
        productMap[
          Number(
            row.productId
          )
        ]?.category ||
        'ESSENTIAL',

      render: (row) => (
        <CategoryBadge
          category={
            productMap[
              Number(
                row.productId
              )
            ]?.category ||
            'ESSENTIAL'
          }
        />
      ),
    },

    {
      key: 'originalLength',
      header: 'Original',

      sortable: true,

      sortValue: (row) =>
        Number(
          row.originalLength ??
            row.original_length ??
            0
        ),

      render: (row) =>
        `${Number(
          row.originalLength ??
            row.original_length ??
            0
        ).toFixed(2)} m`,
    },

    {
      key: 'remainingLength',
      header: 'Remaining',

      sortable: true,

      sortValue: (row) =>
        Number(
          row.remainingLength ??
            row.remaining_length ??
            0
        ),

      render: (row) =>
        `${Number(
          row.remainingLength ??
            row.remaining_length ??
            0
        ).toFixed(2)} m`,
    },

    {
      key: 'status',
      header: 'Status',

      sortable: true,

      render: (row) => (
        <Badge
          tone={statusTone(
            row.status
          )}
        >
          {row.status}
        </Badge>
      ),
    },

    {
      key: 'actions',
      header: '',

      render: (row) => (
        <button
          className="
            btn-secondary
            !py-1.5
            !px-3
            text-xs
            font-medium
            hover:border-loom-300
            hover:bg-loom-50
          "
          onClick={(event) => {
            event.stopPropagation();
            openAdjust(row);
          }}
        >
          Adjust
        </button>
      ),
    },
  ];

  // =========================================================
  // HISTORY TABLE
  // =========================================================

  const historyColumns = [
    {
      key: 'createdAt',
      header: 'Date',

      sortable: true,

      render: (row) =>
        row.createdAt
          ? new Date(
              row.createdAt
            ).toLocaleString()
          : '—',
    },

    {
      key: 'rollNumber',
      header: 'Roll ID',

      sortable: true,

      render: (row) =>
        row.rollNumber ||
        row.roll_id ||
        '—',
    },

    {
      key: 'sku',
      header: 'SKU',

      sortable: true,

      render: (row) =>
        row.sku || '—',
    },

    {
      key: 'category',
      header: 'Category',

      sortable: true,

      render: (row) => {
        const roll =
          rolls.find(
            (item) =>
              String(
                item.id
              ) ===
              String(
                row.rollId ??
                  row.roll_id
              )
          );

        const category =
          productMap[
            Number(
              roll?.productId ??
                row.productId
            )
          ]?.category ||
          row.category ||
          'ESSENTIAL';

        return (
          <CategoryBadge
            category={category}
            compact
          />
        );
      },
    },

    {
      key: 'adjustmentType',
      header: 'Type',

      render: (row) => {
        const type =
          row.adjustmentType ||
          row.adjustment_type;

        if (
          type ===
          'INCREASE'
        ) {
          return (
            <Badge tone="good">
              Increase
            </Badge>
          );
        }

        if (
          type ===
          'DECREASE'
        ) {
          return (
            <Badge tone="bad">
              Decrease
            </Badge>
          );
        }

        return (
          <Badge tone="neutral">
            Set
          </Badge>
        );
      },
    },

    {
      key: 'quantity',
      header: 'Adjustment',

      sortable: true,

      render: (row) => {
        const type =
          row.adjustmentType ||
          row.adjustment_type;

        const value =
          Number(
            row.quantity || 0
          );

        if (
          type ===
          'INCREASE'
        ) {
          return `+${value.toFixed(2)} m`;
        }

        if (
          type ===
          'DECREASE'
        ) {
          return `-${value.toFixed(2)} m`;
        }

        return `${value.toFixed(2)} m`;
      },
    },

    {
      key: 'previousLength',
      header: 'Before',

      render: (row) =>
        `${Number(
          row.previousLength ??
            row.previous_length ??
            0
        ).toFixed(2)} m`,
    },

    {
      key: 'newLength',
      header: 'After',

      render: (row) =>
        `${Number(
          row.newLength ??
            row.new_length ??
            0
        ).toFixed(2)} m`,
    },

    {
      key: 'reason',
      header: 'Reason',

      render: (row) =>
        String(
          row.reason || ''
        )
          .replaceAll(
            '_',
            ' '
          )
          .toLowerCase()
          .replace(
            /\b\w/g,
            (char) =>
              char.toUpperCase()
          ),
    },

    {
      key: 'notes',
      header: 'Notes',

      render: (row) =>
        row.notes || '—',
    },
  ];

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">

      {/* =================================================== */}
      {/* HEADER */}
      {/* =================================================== */}

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
            right-0
            top-0
            w-48
            h-48
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
                h-10
                w-10
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
              "
            >
              <SlidersHorizontal
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
                  Adjustments
                </h1>

                <span
                  className="
                    inline-flex
                    items-center
                    gap-1
                    rounded-full
                    border
                    border-loom-200
                    bg-loom-50
                    px-2
                    py-0.5
                    text-[9px]
                    font-semibold
                    tracking-[0.12em]
                    text-loom-700
                  "
                >
                  <Sparkles size={9} />
                  INVENTORY CONTROL
                </span>

              </div>

              <p className="text-sm text-ink-700/55 mt-1">
                Correct roll quantities while
                maintaining a permanent audit trail.
              </p>

            </div>

          </div>

          <button
            className="
              btn-secondary
              flex
              items-center
              gap-2
              shadow-sm
              hover:shadow-md
              transition-shadow
            "
            onClick={loadAdjustments}
          >
            <RefreshCcw
              size={15}
            />

            Refresh History
          </button>

        </div>
      </div>

      {/* =================================================== */}
      {/* ROLL SEARCH */}
      {/* =================================================== */}

      <div
        className="
          card
          overflow-hidden
          shadow-[0_8px_28px_rgba(15,23,42,0.04)]
        "
      >

        <div
          className="
            px-5
            py-4
            border-b
            border-ink-900/5
            bg-gradient-to-r
            from-white
            to-slate-50/60
          "
        >

          <div className="flex items-center justify-between gap-4">

            <div>

              <h2 className="font-display text-lg text-ink-900">
                Inventory Adjustment
              </h2>

              <p className="text-sm text-ink-700/50 mt-1">
                Select an individual roll to correct
                its remaining quantity.
              </p>

            </div>

            <div
              className="
                rounded-xl
                border
                border-ink-900/5
                bg-white
                px-3
                py-2
                text-right
              "
            >
              <div className="text-[10px] uppercase tracking-[0.1em] text-ink-700/40">
                Adjustable rolls
              </div>

              <div className="font-display text-lg text-ink-900">
                {filteredRolls.length.toLocaleString(
                  'en-IN'
                )}
              </div>
            </div>

          </div>

        </div>

        <div className="p-5">

          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search roll ID, SKU, product, category or color…"
            className="max-w-md mb-5"
          />

          <DataTable
            columns={rollColumns}
            rows={filteredRolls}
          />

        </div>

      </div>

      {/* =================================================== */}
      {/* HISTORY */}
      {/* =================================================== */}

      <div
        className="
          card
          overflow-hidden
          shadow-[0_8px_28px_rgba(15,23,42,0.04)]
        "
      >

        <div
          className="
            px-5
            py-4
            border-b
            border-ink-900/5
            bg-gradient-to-r
            from-white
            to-slate-50/60
          "
        >

          <h2 className="font-display text-lg text-ink-900">
            Adjustment History
          </h2>

          <p className="text-sm text-ink-700/50 mt-1">
            Every inventory correction recorded in
            the system.
          </p>

        </div>

        <div className="p-5">

          <DataTable
            columns={historyColumns}
            rows={historyRows}
          />

        </div>

      </div>

      {/* =================================================== */}
      {/* ADJUSTMENT MODAL */}
      {/* =================================================== */}

      <Modal
        open={!!target}
        onClose={closeModal}
        title={`Adjust ${
          target?.rollId ??
          target?.roll_id ??
          target?.id ??
          ''
        }`}
      >

        {target && (
          <div className="space-y-5">

            {/* Roll identity */}

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

              <div className="flex items-start justify-between gap-4">

                <div className="min-w-0">

                  <div className="flex items-center gap-2 flex-wrap">

                    <h3 className="font-display text-lg font-semibold text-ink-900">
                      {targetProduct?.name ||
                        target.productName ||
                        'Product'}
                    </h3>

                    <CategoryBadge
                      category={
                        targetCategory
                      }
                      compact
                    />

                  </div>

                  <div className="text-xs text-ink-700/50 mt-1">

                    {targetProduct?.sku ||
                      target.sku ||
                      '—'}

                    {' · '}

                    Roll ID:{' '}

                    <span className="font-medium text-ink-700/70">
                      {target.rollId ??
                        target.roll_id ??
                        target.id}
                    </span>

                  </div>

                </div>

                <div className="text-right shrink-0">

                  <div className="text-[10px] uppercase tracking-[0.1em] text-ink-700/40">
                    Current
                  </div>

                  <div className="font-display text-xl text-ink-900">
                    {currentLength.toFixed(
                      2
                    )}{' '}
                    m
                  </div>

                </div>

              </div>

            </div>

            {/* Existing lengths */}

            <div className="grid grid-cols-2 gap-3">

              <div
                className="
                  rounded-xl
                  border
                  border-ink-900/5
                  bg-white
                  p-3
                  shadow-sm
                "
              >
                <div className="text-[10px] uppercase tracking-[0.1em] text-ink-700/40">
                  Current Stock
                </div>

                <div className="font-display text-lg mt-1 text-ink-900">
                  {currentLength.toFixed(
                    2
                  )}{' '}
                  m
                </div>
              </div>

              <div
                className="
                  rounded-xl
                  border
                  border-ink-900/5
                  bg-white
                  p-3
                  shadow-sm
                "
              >
                <div className="text-[10px] uppercase tracking-[0.1em] text-ink-700/40">
                  Original Length
                </div>

                <div className="font-display text-lg mt-1 text-ink-900">
                  {Number(
                    target.originalLength ??
                      target.original_length ??
                      0
                  ).toFixed(2)}{' '}
                  m
                </div>
              </div>

            </div>

            {/* Adjustment type */}

            <div>
              <label className="label">
                Adjustment Type
              </label>

              <div className="grid grid-cols-3 gap-2">

                {ADJUSTMENT_TYPES.map(
                  (type) => {
                    const active =
                      adjustmentType ===
                      type.value;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setAdjustmentType(
                            type.value
                          )
                        }
                        className={`
                          rounded-xl
                          border
                          px-3
                          py-2.5
                          text-sm
                          font-medium
                          transition-all
                          ${
                            active
                              ? 'border-loom-400 bg-loom-50 text-loom-800 shadow-sm'
                              : 'border-ink-900/10 bg-white text-ink-700 hover:border-loom-200 hover:bg-loom-50/40'
                          }
                        `}
                      >

                        {type.value ===
                          'INCREASE' && (
                          <Plus
                            size={15}
                            className="inline mr-1"
                          />
                        )}

                        {type.value ===
                          'DECREASE' && (
                          <Minus
                            size={15}
                            className="inline mr-1"
                          />
                        )}

                        {type.label}

                      </button>
                    );
                  }
                )}

              </div>
            </div>

            {/* Quantity */}

            <div>

              <label className="label">
                {adjustmentType ===
                'SET'
                  ? 'New Remaining Quantity'
                  : 'Adjustment Quantity'}
              </label>

              <div className="relative">

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="
                    input
                    pr-10
                    text-lg
                    font-medium
                  "
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      e.target.value
                    )
                  }
                  placeholder="0.00"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-700/45">
                  m
                </span>

              </div>

            </div>

            {/* Preview */}

            <div
              className="
                rounded-2xl
                border
                border-loom-200
                bg-gradient-to-br
                from-loom-50
                to-white
                p-4
              "
            >

              <div className="flex items-center justify-between">

                <div>

                  <div className="text-[10px] uppercase tracking-[0.1em] text-loom-700/60">
                    New Remaining Stock
                  </div>

                  <div
                    className={`
                      font-display
                      text-2xl
                      mt-1
                      ${
                        previewLength <
                        0
                          ? 'text-red-600'
                          : 'text-ink-900'
                      }
                    `}
                  >
                    {previewLength.toFixed(
                      2
                    )}{' '}
                    m
                  </div>

                </div>

                <div
                  className="
                    h-9
                    w-9
                    rounded-xl
                    bg-white
                    border
                    border-loom-200
                    flex
                    items-center
                    justify-center
                    text-loom-600
                  "
                >
                  <SlidersHorizontal
                    size={16}
                  />
                </div>

              </div>

            </div>

            {/* Reason */}

            <div>

              <label className="label">
                Reason
              </label>

              <select
                className="input"
                value={reason}
                onChange={(e) =>
                  setReason(
                    e.target.value
                  )
                }
              >
                {REASONS.map(
                  (item) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {item.label}
                    </option>
                  )
                )}
              </select>

            </div>

            {/* Notes */}

            <div>

              <label className="label">
                Notes
              </label>

              <textarea
                className="
                  input
                  min-h-[90px]
                  resize-y
                "
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                placeholder="Add details about this adjustment…"
              />

            </div>

            {/* Buttons */}

            <div className="flex justify-end gap-2 pt-2">

              <button
                className="btn-secondary"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="
                  btn-primary
                  min-w-[145px]
                  justify-center
                  shadow-md
                  shadow-loom-500/10
                "
                onClick={
                  confirmAdjustment
                }
                disabled={saving}
              >
                {saving
                  ? 'Applying...'
                  : 'Apply Adjustment'}
              </button>

            </div>

          </div>
        )}

      </Modal>

    </div>
  );
}