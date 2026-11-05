import React, {
  useEffect,
  useState,
} from 'react';

import {
  Package,
  RefreshCw,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';

const API_URL =
  'http://localhost:5055/api';

export default function SharedProductMaster() {

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    search,
    setSearch,
  ] = useState('');


  // ============================================================
  // LOAD LIVE PRODUCT MASTER DATA
  // ============================================================

  useEffect(() => {

    async function load() {

      try {

        setLoading(true);
        setError('');

        const token =
          window.location.pathname
            .split('/')
            .filter(Boolean)
            .pop();

        const response =
          await fetch(
            `${API_URL}/share/public/${token}`,
            {
              cache: 'no-store',
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            'Failed to load shared Product Master.'
          );
        }

        if (
          data.resourceType !==
          'PRODUCTS'
        ) {
          throw new Error(
            'This link is not a Product Master share link.'
          );
        }

        setProducts(
          Array.isArray(data.data)
            ? data.data
            : []
        );

      } catch (err) {

        console.error(
          'Shared products error:',
          err
        );

        setError(
          err.message ||
          'Failed to load shared data.'
        );

      } finally {

        setLoading(false);

      }
    }

    load();

  }, []);


  // ============================================================
  // SEARCH FILTER
  // ============================================================

  const filteredProducts =
    products.filter((product) => {

      const query =
        search.trim().toLowerCase();

      if (!query) return true;

      return (
        String(product.sku || '')
          .toLowerCase()
          .includes(query) ||

        String(product.name || '')
          .toLowerCase()
          .includes(query) ||

        String(product.category || '')
          .toLowerCase()
          .includes(query) ||

        String(product.color || '')
          .toLowerCase()
          .includes(query)
      );

    });


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {

    return (
      <PageShell>

        <div className="flex items-center justify-center py-20">

          <RefreshCw
            size={20}
            className="animate-spin text-loom-600"
          />

        </div>

      </PageShell>
    );
  }


  // ============================================================
  // ERROR
  // ============================================================

  if (error) {

    return (
      <PageShell>

        <div className="max-w-lg mx-auto py-20 text-center">

          <AlertCircle
            size={36}
            className="mx-auto text-red-500"
          />

          <h1 className="font-display text-xl mt-4">
            Unable to open this link
          </h1>

          <p className="text-sm text-ink-700/55 mt-2">
            {error}
          </p>

        </div>

      </PageShell>
    );
  }


  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <PageShell>

      <div className="space-y-6">

        {/* HEADER */}

        <header className="flex items-center gap-3">

          <div
            className="
              h-11
              w-11
              rounded-xl
              bg-loom-600/10
              text-loom-700
              flex
              items-center
              justify-center
            "
          >
            <Package size={20} />
          </div>

          <div>

            <h1 className="font-display text-2xl">
              WINCREA Product Master
            </h1>

            <p className="text-sm text-ink-700/55 mt-1">
              Shared read-only product inventory
            </p>

          </div>

        </header>


        {/* SEARCH AND PRODUCT COUNT */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

          <div className="relative w-full sm:max-w-md">

            <Search
              size={18}
              className="
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-ink-700/40
              "
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search SKU, product, category or color..."
              className="
                w-full
                pl-10
                pr-10
                py-3
                rounded-xl
                border
                border-ink-900/10
                bg-white
                text-sm
                outline-none
                focus:border-loom-600
                focus:ring-2
                focus:ring-loom-600/10
              "
            />

            {search && (

              <button
                type="button"
                onClick={() => setSearch('')}
                className="
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  text-ink-700/40
                  hover:text-ink-900
                "
                aria-label="Clear search"
              >
                <X size={17} />
              </button>

            )}

          </div>


          <p className="text-xs text-ink-700/55">

            Showing{' '}
            <span className="font-semibold text-ink-900">
              {filteredProducts.length}
            </span>

            {' '}of{' '}

            <span className="font-semibold text-ink-900">
              {products.length}
            </span>

            {' '}products

          </p>

        </div>


        {/* PRODUCT TABLE */}

        <div className="card overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="border-b border-ink-900/10 text-left">

                  <th className="px-4 py-3">
                    SKU
                  </th>

                  <th className="px-4 py-3">
                    Product
                  </th>

                  <th className="px-4 py-3">
                    Category
                  </th>

                  <th className="px-4 py-3">
                    Color
                  </th>

                  <th className="px-4 py-3">
                    Width
                  </th>

                  <th className="px-4 py-3 text-right">
                    Stock
                  </th>

                  <th className="px-4 py-3 text-right">
                    Rolls
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredProducts.length > 0 ? (

                  filteredProducts.map(
                    (product) => (

                      <tr
                        key={product.id}
                        className="
                          border-b
                          border-ink-900/5
                          last:border-0
                          hover:bg-loom-50/40
                        "
                      >

                        <td className="px-4 py-3 font-medium">
                          {product.sku}
                        </td>

                        <td className="px-4 py-3">
                          {product.name}
                        </td>

                        <td className="px-4 py-3">

                          <span
                            className="
                              inline-flex
                              rounded-full
                              bg-loom-50
                              border
                              border-loom-100
                              px-2
                              py-0.5
                              text-[10px]
                              font-semibold
                              text-loom-700
                            "
                          >
                            {product.category}
                          </span>

                        </td>

                        <td className="px-4 py-3">
                          {product.color || '—'}
                        </td>

                        <td className="px-4 py-3">
                          {Number(
                            product.width_cm || 0
                          )}{' '}
                          CM
                        </td>

                        <td className="px-4 py-3 text-right">
                          {Number(
                            product.stock || 0
                          ).toLocaleString(
                            'en-IN'
                          )}{' '}
                          m
                        </td>

                        <td className="px-4 py-3 text-right">
                          {Number(
                            product.rolls || 0
                          ).toLocaleString(
                            'en-IN'
                          )}
                        </td>

                      </tr>

                    )
                  )

                ) : (

                  <tr>

                    <td
                      colSpan="7"
                      className="
                        px-4
                        py-12
                        text-center
                        text-ink-700/50
                      "
                    >

                      <Search
                        size={28}
                        className="mx-auto mb-3 opacity-40"
                      />

                      <p className="font-medium">
                        No products found
                      </p>

                      <p className="text-xs mt-1">
                        Try searching with a different SKU, name or category.
                      </p>

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </PageShell>
  );
}


// ============================================================
// PAGE SHELL
// ============================================================

function PageShell({
  children,
}) {

  return (
    <div className="min-h-screen bg-canvas">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {children}

        <div className="text-center text-xs text-ink-700/35 mt-8">
          Shared from WINCREA
        </div>

      </div>

    </div>
  );
}