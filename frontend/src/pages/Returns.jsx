import React, {
  useMemo,
  useState,
} from 'react';

import { RotateCcw } from 'lucide-react';

import { useApp } from '../context/AppContext';

import DataTable from '../components/common/DataTable';

import Badge, {
  statusTone,
} from '../components/common/Badge';

import { formatDate } from '../utils/dateUtils';


export default function Returns() {

  const {
    rolls,
    products,
    returnRoll,
  } = useApp();

  const [note, setNote] =
    useState('');

  const [returningRoll, setReturningRoll] =
    useState(null);

  const [quantity, setQuantity] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(null);

  const [success, setSuccess] =
    useState(null);


  // ============================================================
  // PRODUCT MAP
  // ============================================================

  const productMap =
    useMemo(
      () =>
        Object.fromEntries(
          products.map(
            (p) => [
              p.id,
              p,
            ]
          )
        ),
      [products]
    );


  // ============================================================
  // DISPATCHED ROLLS
  // ============================================================

  const dispatched =
    useMemo(
      () =>
        rolls.filter(
          (r) =>
            r.status === 'Dispatched' ||
            r.status === 'EMPTY'
        ),
      [rolls]
    );


  // ============================================================
  // OPEN RETURN
  // ============================================================

  function openReturn(roll) {

    setReturningRoll(roll);

    const original =
      Number(
        roll.length ??
        roll.originalLength ??
        roll.original_length ??
        0
      );

    const remaining =
      Number(
        roll.remainingLength ??
        roll.remaining_length ??
        0
      );

    /*
      Amount already dispatched.

      Example:

      Original = 42
      Remaining = 0

      Returnable = 42
    */

    const returnable =
      Math.max(
        0,
        original - remaining
      );

    setQuantity(
      returnable > 0
        ? String(returnable)
        : ''
    );

    setNote('');

    setError(null);

    setSuccess(null);
  }


  // ============================================================
  // CLOSE
  // ============================================================

  function closeReturn() {

    if (loading) return;

    setReturningRoll(null);

    setQuantity('');

    setNote('');

    setError(null);
  }


  // ============================================================
  // SUBMIT
  // ============================================================

  async function submitReturn() {

    if (!returningRoll) {
      return;
    }

    const returnQuantity =
      Number(quantity);

    if (
      !Number.isFinite(
        returnQuantity
      ) ||
      returnQuantity <= 0
    ) {

      setError(
        'Enter a valid return quantity.'
      );

      return;
    }


    const original =
      Number(
        returningRoll.length ??
        returningRoll.originalLength ??
        returningRoll.original_length ??
        0
      );

    const remaining =
      Number(
        returningRoll.remainingLength ??
        returningRoll.remaining_length ??
        0
      );

    const maximumReturn =
      Math.max(
        0,
        original - remaining
      );


    if (
      returnQuantity >
      maximumReturn
    ) {

      setError(
        `Maximum return quantity is ${maximumReturn} m.`
      );

      return;
    }


    setLoading(true);

    setError(null);


    try {

      const result =
        await returnRoll({

          userId: 1,

          rollId:
            returningRoll.id,

          quantity:
            returnQuantity,

          notes:
            note || null,

        });


      console.log(
        'RETURN SUCCESS:',
        result
      );


      setReturningRoll(null);

      setQuantity('');

      setNote('');

      setSuccess(
        `${returnQuantity} m returned successfully.`
      );


      setTimeout(
        () => {
          setSuccess(null);
        },
        3500
      );


    } catch (err) {

      console.error(
        'Return failed:',
        err
      );

      setError(
        err.message ||
        'Failed to process return.'
      );


    } finally {

      setLoading(false);

    }
  }


  // ============================================================
  // TABLE
  // ============================================================

  const columns = [

    {
      key: 'rollId',

      header: 'Roll ID',

      render: (r) =>
        r.rollId ||
        r.id,
    },


    {
      key: 'sku',

      header: 'SKU',

      render: (r) =>
        productMap[
          r.productId
        ]?.sku ||
        '—',
    },


    {
      key: 'original',

      header: 'Original',

      render: (r) => {

        const length =
          Number(
            r.length ??
            r.originalLength ??
            r.original_length ??
            0
          );

        return `${length} m`;
      },
    },


    {
      key: 'remaining',

      header: 'Remaining',

      render: (r) => {

        const remaining =
          Number(
            r.remainingLength ??
            r.remaining_length ??
            0
          );

        return `${remaining} m`;
      },
    },


    {
      key: 'customer',

      header: 'Dispatched To',

      render: (r) =>
        r.customerName ||
        '—',
    },


    {
      key: 'dispatchedAt',

      header: 'Dispatched On',

      render: (r) =>
        formatDate(
          r.dispatchedAt
        ),
    },


    {
      key: 'status',

      header: 'Status',

      render: (r) => {

        const displayStatus =
          r.status === 'EMPTY'
            ? 'Dispatched'
            : r.status;

        return (
          <Badge
            tone={statusTone(
              displayStatus
            )}
          >
            {displayStatus}
          </Badge>
        );
      },
    },


    {
      key: 'actions',

      header: 'Action',

      render: (r) => (

        <button
          className="btn-secondary !py-1 !px-3 text-xs"

          onClick={(e) => {

            e.stopPropagation();

            openReturn(r);

          }}
        >

          <RotateCcw
            size={13}
          />

          Return

        </button>

      ),
    },

  ];


  // ============================================================
  // UI
  // ============================================================

  return (

    <div className="space-y-5">


      {/* HEADER */}

      <div className="flex items-center gap-2">

        <RotateCcw
          size={20}
          className="text-loom-600"
        />

        <div>

          <h1 className="font-display text-2xl">
            Returns
          </h1>

          <p className="text-sm text-ink-700/60 mt-1">
            Return dispatched material back into stock.
          </p>

        </div>

      </div>


      {/* SUCCESS */}

      {success && (

        <div className="card p-3 text-sm text-signal-good font-medium">

          {success}

        </div>

      )}


      {/* TABLE */}

      <div className="card">

        <DataTable
          columns={columns}
          rows={dispatched}
          emptyMessage="No dispatched rolls to return."
        />

      </div>


      {/* ======================================================
          RETURN MODAL
      ====================================================== */}

      {returningRoll && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">

          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">


            <h2 className="font-display text-xl mb-1">
              Return Roll
            </h2>


            <p className="text-sm text-ink-700/60 mb-5">

              {returningRoll.rollId ||
                returningRoll.id}

              {' · '}

              {
                productMap[
                  returningRoll.productId
                ]?.sku ||
                '—'
              }

            </p>


            {/* CUSTOMER */}

            <div className="mb-4">

              <label className="label">
                Customer
              </label>

              <div className="input bg-ink-50">

                {returningRoll.customerName ||
                  'Customer not found'}

              </div>

            </div>


            {/* QUANTITY */}

            <div className="mb-4">

              <label className="label">
                Return Quantity (m)
              </label>

              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value
                  )
                }
              />

              <p className="text-xs text-ink-700/50 mt-1">

                Maximum return:{' '}

                {Math.max(
                  0,

                  Number(
                    returningRoll.length ??
                    returningRoll.originalLength ??
                    returningRoll.original_length ??
                    0
                  ) -

                  Number(
                    returningRoll.remainingLength ??
                    returningRoll.remaining_length ??
                    0
                  )
                )}

                {' '}m

              </p>

            </div>


            {/* NOTE */}

            <div className="mb-4">

              <label className="label">
                Return Note
              </label>

              <input
                className="input"
                value={note}
                onChange={(e) =>
                  setNote(
                    e.target.value
                  )
                }
                placeholder="e.g. Customer returned unused material"
              />

            </div>


            {/* ERROR */}

            {error && (

              <div className="text-sm text-signal-bad mb-4">

                {error}

              </div>

            )}


            {/* BUTTONS */}

            <div className="flex justify-end gap-2">

              <button
                className="btn-secondary"
                onClick={closeReturn}
                disabled={loading}
              >
                Cancel
              </button>


              <button
                className="btn-primary"
                onClick={submitReturn}
                disabled={
                  loading ||
                  !quantity
                }
              >

                {loading
                  ? 'Processing...'
                  : 'Confirm Return'}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );
}