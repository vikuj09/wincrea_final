import React, {
  useEffect,
  useState,
} from 'react';

import {
  Layers,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const API_URL =
  (import.meta.env.VITE_API_URL || '/api');

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


        <div className="card overflow-hidden">

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

                {rolls.map(
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

        </div>

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