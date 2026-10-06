import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Header() {

  const {
    products,
    rolls,
    customers,
  } = useApp();

  const [q, setQ] =
    useState('');

  const [open, setOpen] =
    useState(false);

  const navigate =
    useNavigate();


  // ==========================================================
  // SEARCH RESULTS
  // ==========================================================

  const results =
    useMemo(() => {

      if (!q.trim()) {

        return {
          products: [],
          rolls: [],
          customers: [],
        };

      }


      const term =
        q
          .trim()
          .toLowerCase();


      return {

        products:
          products
            .filter((p) => {

              const sku =
                String(
                  p.sku || ''
                ).toLowerCase();

              const name =
                String(
                  p.name || ''
                ).toLowerCase();

              const color =
                String(
                  p.color || ''
                ).toLowerCase();

              return (
                sku.includes(term) ||
                name.includes(term) ||
                color.includes(term)
              );

            })
            .slice(0, 5),


        rolls:
          rolls
            .filter((r) => {

              const rollId =
                String(
                  r.rollId ??
                  r.roll_id ??
                  r.id ??
                  ''
                ).toLowerCase();

              const sku =
                String(
                  r.sku || ''
                ).toLowerCase();

              const productName =
                String(
                  r.productName ||
                  r.product_name ||
                  ''
                ).toLowerCase();

              return (
                rollId.includes(term) ||
                sku.includes(term) ||
                productName.includes(term)
              );

            })
            .slice(0, 5),


        customers:
          customers
            .filter((c) => {

              const name =
                String(
                  c.name || ''
                ).toLowerCase();

              const email =
                String(
                  c.email || ''
                ).toLowerCase();

              const phone =
                String(
                  c.phone || ''
                ).toLowerCase();

              return (
                name.includes(term) ||
                email.includes(term) ||
                phone.includes(term)
              );

            })
            .slice(0, 5),

      };

    }, [
      q,
      products,
      rolls,
      customers,
    ]);


  const hasResults =
    results.products.length > 0 ||
    results.rolls.length > 0 ||
    results.customers.length > 0;


  // ==========================================================
  // NAVIGATION
  // ==========================================================

  function go(path) {

    setOpen(false);

    setQ('');

    navigate(path);

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <header
      className="
        h-16
        shrink-0
        border-b
        border-ink-900/10
        bg-panel/80
        backdrop-blur
        flex
        items-center
        px-6
        gap-4
        sticky
        top-0
        z-40
      "
    >

      {/* ====================================================
          GLOBAL SEARCH
      ==================================================== */}

      <div className="relative flex-1 max-w-md">

        <Search
          size={18}
          strokeWidth={2}
          className="
            absolute
            left-3.5
            top-1/2
            -translate-y-1/2
            text-ink-700/40
            pointer-events-none
          "
        />


        <input
          type="text"
          value={q}
          onChange={(e) => {

            setQ(
              e.target.value
            );

            setOpen(true);

          }}
          onFocus={() =>
            setOpen(true)
          }
          onBlur={() =>
            setTimeout(
              () =>
                setOpen(false),
              150
            )
          }
          placeholder="Search SKU, roll ID, or customer…"
          className="input w-full"
          style={{
            paddingLeft: '48px',
          }}
        />


        {/* ==================================================
            SEARCH RESULTS
        ================================================== */}

        {open &&
          q.trim() && (

            <div
              className="
                absolute
                mt-1
                w-full
                bg-panel
                border
                border-ink-900/10
                rounded-md
                shadow-card
                z-50
                max-h-80
                overflow-y-auto
              "
            >

              {/* No results */}

              {!hasResults && (

                <p className="px-3 py-3 text-sm text-ink-700/50">
                  No matches.
                </p>

              )}


              {/* ==================================================
                  PRODUCTS
              ================================================== */}

              {results.products.length > 0 && (

                <div>

                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-700/40">
                    Products
                  </p>


                  {results.products.map(
                    (p) => (

                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) =>
                          e.preventDefault()
                        }
                        onClick={() =>
                          go('/products')
                        }
                        className="
                          w-full
                          text-left
                          px-3
                          py-2
                          text-sm
                          hover:bg-loom-50
                          flex
                          justify-between
                          gap-3
                        "
                      >

                        <span className="truncate">
                          {p.name}
                        </span>

                        <span className="text-ink-700/40 shrink-0">
                          {p.sku}
                        </span>

                      </button>

                    )
                  )}

                </div>

              )}


              {/* ==================================================
                  ROLLS
              ================================================== */}

              {results.rolls.length > 0 && (

                <div>

                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-700/40">
                    Rolls
                  </p>


                  {results.rolls.map(
                    (r) => (

                      <button
                        key={r.id}
                        type="button"
                        onMouseDown={(e) =>
                          e.preventDefault()
                        }
                        onClick={() =>
                          go('/rolls')
                        }
                        className="
                          w-full
                          text-left
                          px-3
                          py-2
                          text-sm
                          hover:bg-loom-50
                          flex
                          justify-between
                          gap-3
                        "
                      >

                        <span className="truncate">
                          {r.rollId || r.id}
                        </span>

                        <span className="text-ink-700/40 shrink-0">
                          {r.length} m · {r.status}
                        </span>

                      </button>

                    )
                  )}

                </div>

              )}


              {/* ==================================================
                  CUSTOMERS
              ================================================== */}

              {results.customers.length > 0 && (

                <div>

                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-700/40">
                    Customers
                  </p>


                  {results.customers.map(
                    (c) => (

                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) =>
                          e.preventDefault()
                        }
                        onClick={() =>
                          go('/customers')
                        }
                        className="
                          w-full
                          text-left
                          px-3
                          py-2
                          text-sm
                          hover:bg-loom-50
                          flex
                          justify-between
                          gap-3
                        "
                      >

                        <span className="truncate">
                          {c.name}
                        </span>

                        <span className="text-ink-700/40 shrink-0">
                          {c.phone || ''}
                        </span>

                      </button>

                    )
                  )}

                </div>

              )}

            </div>

          )}

      </div>


      {/* ======================================================
          DATE
      ====================================================== */}

      <div className="ml-auto text-sm text-ink-700/60 whitespace-nowrap">

        {new Date().toLocaleDateString(
          'en-IN',
          {
            weekday:
              'long',

            day:
              '2-digit',

            month:
              'long',

            year:
              'numeric',
          }
        )}

      </div>

    </header>

  );
}