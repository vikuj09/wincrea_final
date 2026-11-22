import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Layers,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const API_URL =
  (import.meta.env.VITE_API_URL || '/api');

const CATEGORIES = ['ESSENTIAL', 'PREMIUM', 'PEGASUS'];

export default function SharedRollInventory() {

  const [
    rolls,
    setRolls,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [skuQuery, setSkuQuery] = useState('');

  const categories = useMemo(() => CATEGORIES.map((name) => {
    const categoryRolls = rolls.filter(
      (roll) => String(roll.category || '').trim().toUpperCase() === name
    );

    return {
      name,
      rolls: categoryRolls,
      meters: categoryRolls.reduce((total, roll) => {
        const remaining = Number(roll.remaining_length || 0);
        return total + (Number.isFinite(remaining) ? remaining : 0);
      }, 0),
    };
  }), [rolls]);

  const selected = categories.find((category) => category.name === selectedCategory);
  const filteredRolls = useMemo(() => {
    const query = skuQuery.trim().toLowerCase();
    return (selected?.rolls || []).filter(
      (roll) => !query || String(roll.sku || '').toLowerCase().includes(query)
    );
  }, [selected, skuQuery]);

  const filteredMeters = filteredRolls.reduce((total, roll) => {
    const remaining = Number(roll.remaining_length || 0);
    return total + (Number.isFinite(remaining) ? remaining : 0);
  }, 0);

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
            `${API_URL}/share/public/${token}`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            'Failed to load shared Roll Inventory.'
          );
        }

        if (
          data.resourceType !==
          'ROLLS'
        ) {
          throw new Error(
            'This link is not a Roll Inventory share link.'
          );
        }

        setRolls(
          Array.isArray(data.data)
            ? data.data
            : []
        );

      } catch (err) {

        console.error(
          'Shared rolls error:',
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


  return (
    <PageShell>

      <div className="space-y-6">

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
            <Layers size={20} />
          </div>

          <div>

            <h1 className="font-display text-2xl">
              WINCREA Roll Inventory
            </h1>

            <p className="text-sm text-ink-700/55 mt-1">
              Shared read-only roll inventory
            </p>

          </div>

        </header>


        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Roll categories">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              aria-pressed={selectedCategory === category.name}
              onClick={() => {
                setSelectedCategory(category.name);
                setSkuQuery('');
              }}
              className={`card p-5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-loom-600 ${
                selectedCategory === category.name
                  ? 'ring-2 ring-loom-600 bg-loom-50'
                  : 'hover:bg-loom-50'
              }`}
            >
              <span className="block font-display text-lg text-loom-700">{category.name}</span>
              <span className="block text-sm text-ink-700/60 mt-2">
                {category.rolls.length.toLocaleString('en-IN')} rolls
                {' · '}
                {category.meters.toLocaleString('en-IN', { maximumFractionDigits: 2 })} m remaining
              </span>
            </button>
          ))}
        </div>

        {!selected ? (
          <p className="text-sm text-center text-ink-700/60 py-8">
            Select a category to view its rolls.
          </p>
        ) : (
        <section className="card overflow-hidden" aria-label={`${selected.name} rolls`}>

          <div className="px-4 py-4 border-b border-ink-900/10" aria-live="polite">
            <h2 className="font-display text-lg">{selected.name}</h2>
            <p className="text-sm text-ink-700/60 mt-1">
              Total rolls: {selected.rolls.length.toLocaleString('en-IN')}
              {' · '}
              Total remaining metres: {selected.meters.toLocaleString('en-IN', { maximumFractionDigits: 2 })} m
            </p>
          </div>

          <div className="px-4 py-3 border-b border-ink-900/10">
            <label htmlFor="shared-roll-sku" className="block text-sm font-medium mb-2">
              Search by SKU
            </label>
            <div className="flex items-center gap-2">
              <input
                id="shared-roll-sku"
                type="search"
                className="input w-full sm:max-w-sm"
                placeholder="Enter all or part of a SKU…"
                value={skuQuery}
                onChange={(event) => setSkuQuery(event.target.value)}
              />
              {skuQuery && (
                <button type="button" className="btn-ghost" onClick={() => setSkuQuery('')}>
                  Clear
                </button>
              )}
            </div>
            {skuQuery.trim() && (
              <p className="text-sm text-ink-700/60 mt-2" role="status">
                Matching rolls: {filteredRolls.length.toLocaleString('en-IN')}
                {' · '}
                {filteredMeters.toLocaleString('en-IN', { maximumFractionDigits: 2 })} m remaining
              </p>
            )}
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead>

                <tr className="border-b border-ink-900/10 text-left">

                  <th className="px-4 py-3">
                    Roll ID
                  </th>

                  <th className="px-4 py-3">
                    Product
                  </th>

                  <th className="px-4 py-3">
                    SKU
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
                    Remaining
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredRolls.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-ink-700/55">
                      {skuQuery.trim()
                        ? `No rolls match SKU “${skuQuery.trim()}” in ${selected.name}.`
                        : `No rolls in ${selected.name} yet.`}
                    </td>
                  </tr>
                )}

                {filteredRolls.map(
                  (roll) => (

                    <tr
                      key={roll.id}
                      className="border-b border-ink-900/5 last:border-0"
                    >

                      <td className="px-4 py-3 font-medium">
                        {roll.roll_id}
                      </td>

                      <td className="px-4 py-3">
                        {roll.product_name || '—'}
                      </td>

                      <td className="px-4 py-3">
                        {roll.sku || '—'}
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
                          {roll.category || '—'}
                        </span>

                      </td>

                      <td className="px-4 py-3">
                        {roll.color || '—'}
                      </td>

                      <td className="px-4 py-3">
                        {Number(
                          roll.width_cm || 0
                        )}{' '}
                        CM
                      </td>

                      <td className="px-4 py-3 text-right">
                        {Number(
                          roll.remaining_length || 0
                        ).toLocaleString(
                          'en-IN'
                        )}{' '}
                        m
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs">
                          {roll.status || '—'}
                        </span>
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </section>
        )}

      </div>

    </PageShell>
  );
}


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
