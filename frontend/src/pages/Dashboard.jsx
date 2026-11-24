import React, { useEffect, useMemo } from 'react';
import {
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
} from 'lucide-react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

import { useApp } from '../context/AppContext';
import StatCard from '../components/common/StatCard';
import Badge, { stockTone } from '../components/common/Badge';
import { stockStatus } from '../utils/calculations';
import {
  lastNDays,
  formatDate,
  isSameDay,
} from '../utils/dateUtils';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const {
    products,
    rolls,
    transactions,
    loadProducts,
    loadRolls,
    loadTransactions,
  } = useApp();

  // ============================================================
  // REFRESH DATA WHEN ENTERING DASHBOARD
  // ============================================================

  useEffect(() => {
    async function refreshDashboard() {
      try {
        await Promise.all([
          loadProducts(),
          loadRolls(),
          loadTransactions(),
        ]);
      } catch (error) {
        console.error(
          'Failed to refresh dashboard:',
          error
        );
      }
    }

    refreshDashboard();
  }, [
    loadProducts,
    loadRolls,
    loadTransactions,
  ]);

  // ============================================================
  // TOTAL STOCK
  // ============================================================

  const stock = useMemo(() => {
    let meters = 0;
    let rollCount = 0;

    rolls.forEach((roll) => {
      const remaining = Number(
        roll.remainingLength ??
        roll.length ??
        0
      );

      if (remaining > 0) {
        meters += remaining;
        rollCount += 1;
      }
    });

    return {
      meters,
      rolls: rollCount,
    };
  }, [rolls]);

  // ============================================================
  // TODAY'S INWARD
  //
  // Use actual inventory roll records as the source of truth.
  // Count received rolls even if they have since been dispatched.
  // ============================================================

  const todayIn = useMemo(() => {
    return rolls
      .filter((roll) => {
        const inwardDate =
          roll.inwardDate ??
          roll.createdAt ??
          null;

        if (!inwardDate) {
          return false;
        }

        return isSameDay(
          inwardDate
        );
      })
      .reduce(
        (total, roll) => ({
          rolls: total.rolls + 1,
          meters: total.meters + Number(roll.originalLength ?? roll.length ?? 0),
        }),
        { rolls: 0, meters: 0 }
      );
  }, [rolls]);

  // ============================================================
  // TODAY'S OUTWARD
  //
  // Only confirmed outward movements appear in the transaction ledger.
  // Each transaction contains its roll count and nested roll items.
  // ============================================================

  const todayOut = useMemo(() => {
    return transactions
      .filter((t) => {
        const type = String(t.transaction_type || '').toUpperCase();
        if (type !== 'OUTWARD') return false;

        const createdAt = t.created_at ?? t.createdAt ?? null;
        return createdAt && isSameDay(createdAt);
      })
      .reduce(
        (total, t) => ({
          rolls: total.rolls + Number(t.total_rolls ?? t.items?.length ?? 0),
          meters: total.meters + Number(t.total_quantity ?? 0),
        }),
        { rolls: 0, meters: 0 }
      );
  }, [transactions]);

  const last30DaysOut = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;

    return transactions.reduce((total, transaction) => {
      const timestamp = new Date(transaction.created_at ?? transaction.createdAt).getTime();
      if (
        String(transaction.transaction_type || '').toUpperCase() !== 'OUTWARD' ||
        !Number.isFinite(timestamp) || timestamp < cutoff || timestamp > now
      ) return total;

      return {
        meters: total.meters + Number(transaction.total_quantity || 0),
        rolls: total.rolls + Number(transaction.total_rolls ?? transaction.items?.length ?? 0),
      };
    }, { meters: 0, rolls: 0 });
  }, [transactions]);

  // ============================================================
  // REORDER ALERTS
  // ============================================================

  const reorderAlerts = useMemo(() => {
    return products
      .map((product) => {
        const meters = rolls
          .filter(
            (roll) =>
              Number(roll.productId) ===
              Number(product.id)
          )
          .reduce(
            (total, roll) =>
              total +
              Number(
                roll.remainingLength ??
                roll.length ??
                0
              ),
            0
          );

        return {
          product,
          meters,
        };
      })
      .filter(
        ({ product, meters }) =>
          stockStatus(
            meters,
            Number(product.reorderLevel || 0)
          ) !== 'ok'
      )
      .sort(
        (a, b) =>
          a.meters - b.meters
      );
  }, [products, rolls]);

  // ============================================================
  // 14-DAY MOVEMENT TREND
  // ============================================================

  const trend = useMemo(() => {
    const days = lastNDays(14);

    return days.map((day) => {
      const inward = transactions
        .filter(
          (t) =>
            t.transaction_type === 'INWARD' &&
            isSameDay(
              t.created_at,
              day
            )
        )
        .reduce(
          (total, t) =>
            total +
            Number(t.total_quantity || 0),
          0
        );

      const outward = transactions
        .filter(
          (t) =>
            t.transaction_type === 'OUTWARD' &&
            isSameDay(
              t.created_at,
              day
            )
        )
        .reduce(
          (total, t) =>
            total +
            Number(t.total_quantity || 0),
          0
        );

      return {
        date: formatDate(day, {
          day: '2-digit',
          month: 'short',
          year: undefined,
        }),
        Inward: inward,
        Outward: outward,
      };
    });
  }, [transactions]);

  // ============================================================
  // STOCK BY PRODUCT
  // ============================================================

  const stockByProduct = useMemo(() => {
    return products
      .map((product) => {
        const meters = rolls
          .filter(
            (roll) =>
              Number(roll.productId) ===
              Number(product.id)
          )
          .reduce(
            (total, roll) =>
              total +
              Number(
                roll.remainingLength ??
                roll.length ??
                0
              ),
            0
          );

        return {
          name: product.sku,
          meters,
        };
      })
      .filter(
        (item) => item.meters > 0
      )
      .sort(
        (a, b) =>
          b.meters - a.meters
      )
      .slice(0, 10);
  }, [products, rolls]);

  // ============================================================
  // TOP SELLERS — LAST 30 DAYS
  // ============================================================

  const topSellers = useMemo(() => {
    const cutoff =
      Date.now() -
      30 *
        24 *
        60 *
        60 *
        1000;

    const productTotals = {};

    transactions
      .filter(
        (transaction) =>
          transaction.transaction_type ===
            'OUTWARD' &&
          new Date(
            transaction.created_at
          ).getTime() >= cutoff
      )
      .forEach((transaction) => {
        (transaction.items || []).forEach((item) => {
          const productId = item.product_id;
          const meters = Number(item.quantity);

          if (!productId || !Number.isFinite(meters) || meters <= 0) return;

          productTotals[productId] =
            (productTotals[productId] || 0) + meters;
        });
      });

    return Object.entries(
      productTotals
    )
      .map(
        ([productId, meters]) => ({
          product:
            products.find(
              (p) =>
                Number(p.id) ===
                Number(productId)
            ),
          meters,
        })
      )
      .filter(
        (item) => item.product
      )
      .sort(
        (a, b) =>
          b.meters - a.meters
      )
      .slice(0, 5);
  }, [transactions, products]);

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="space-y-6">
      <Link to="/tasks" className="btn-secondary">Open My Tasks →</Link>

      {/* HEADER */}

      <div>
        <h1 className="font-display text-2xl">
          Dashboard
        </h1>

        <p className="text-sm text-ink-700/60 mt-1">
          Live overview of stock, movement, and reorder health.
        </p>
      </div>

      {/* ======================================================
          STAT CARDS
      ====================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">

        <StatCard
          label="Rolls on hand"
          value={stock.rolls.toLocaleString('en-IN')}
          icon={Layers}
        />

        <StatCard
          label="Meters on hand"
          value={`${stock.meters.toLocaleString('en-IN')} m`}
          icon={Layers}
          tone="loom"
        />

        <StatCard
          label="Today's inward (metres)"
          value={`${todayIn.meters.toLocaleString('en-IN')} m`}
          icon={ArrowDownToLine}
          tone="good"
        />

        <StatCard
          label="Today's inward rolls"
          value={todayIn.rolls.toLocaleString('en-IN')}
          icon={ArrowDownToLine}
          tone="good"
        />

        <StatCard
          label="Today's outward (metres)"
          value={`${todayOut.meters.toLocaleString('en-IN')} m`}
          icon={ArrowUpFromLine}
          tone="warn"
        />

        <StatCard
          label="Today's outward rolls"
          value={todayOut.rolls.toLocaleString('en-IN')}
          icon={ArrowUpFromLine}
          tone="warn"
        />

        <StatCard
          label="Outward · last 30 days"
          value={`${last30DaysOut.meters.toLocaleString('en-IN', { maximumFractionDigits: 2 })} m`}
          sub={`${last30DaysOut.rolls.toLocaleString('en-IN')} rolls dispatched`}
          icon={ArrowUpFromLine}
          tone="loom"
        />

      </div>

      {/* ======================================================
          MOVEMENT + REORDER
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* MOVEMENT */}

        <div className="card p-4 lg:col-span-2">

          <h2 className="font-display text-base mb-3">
            14-day movement trend
          </h2>

          <ResponsiveContainer
            width="100%"
            height={260}
          >

            <LineChart data={trend}>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E9E4D8"
              />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke="#8A8578"
              />

              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#8A8578"
              />

              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                }}
              />

              <Line
                type="monotone"
                dataKey="Inward"
                stroke="#3E7D5A"
                strokeWidth={2}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="Outward"
                stroke="#B34D3C"
                strokeWidth={2}
                dot={false}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

        {/* REORDER */}

        <div className="card p-4">

          <div className="flex items-center gap-2 mb-3">

            <AlertTriangle
              size={16}
              className="text-signal-warn"
            />

            <h2 className="font-display text-base">
              Reorder alerts
            </h2>

          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">

            {reorderAlerts.length === 0 && (
              <p className="text-sm text-ink-700/50">
                All products above reorder level.
              </p>
            )}

            {reorderAlerts.map(
              ({ product, meters }) => (

                <div
                  key={product.id}
                  className="flex items-center justify-between text-sm"
                >

                  <div>

                    <p className="font-medium">
                      {product.sku}
                    </p>

                    <p className="text-xs text-ink-700/50">

                      {meters} m / reorder{' '}

                      {product.reorderLevel} m

                    </p>

                  </div>

                  <Badge
                    tone={stockTone(
                      stockStatus(
                        meters,
                        product.reorderLevel
                      )
                    )}
                  >
                    {stockStatus(
                      meters,
                      product.reorderLevel
                    )}
                  </Badge>

                </div>

              )
            )}

          </div>

          <Link
            to="/suppliers"
            className="text-xs text-loom-600 hover:underline mt-3 inline-block"
          >
            Go to purchase recommendations →
          </Link>

        </div>

      </div>

      {/* ======================================================
          STOCK + TOP SELLERS
      ====================================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* STOCK BY PRODUCT */}

        <div className="card p-4 lg:col-span-2">

          <h2 className="font-display text-base mb-3">
            Stock by product (top 10)
          </h2>

          <ResponsiveContainer
            width="100%"
            height={260}
          >

            <BarChart data={stockByProduct}>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E9E4D8"
              />

              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                stroke="#8A8578"
              />

              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#8A8578"
              />

              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                }}
              />

              <Bar
                dataKey="meters"
                fill="#B9812F"
                radius={[
                  3,
                  3,
                  0,
                  0,
                ]}
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

        {/* TOP SELLERS */}

        <div className="card p-4">

          <h2 className="font-display text-base mb-3">
            Top sellers (30 days)
          </h2>

          <div className="space-y-3">

            {topSellers.length === 0 && (
              <p className="text-sm text-ink-700/50">
                No outward movement yet.
              </p>
            )}

            {topSellers.map(
              ({ product, meters }, index) => (

                <div
                  key={product.id}
                  className="flex items-center justify-between text-sm"
                >

                  <div className="flex items-center gap-2">

                    <span className="w-5 h-5 rounded-full bg-loom-100 text-loom-700 text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </span>

                    <span>
                      {product.sku}
                    </span>

                  </div>

                  <span className="text-ink-700/60">

                    {meters.toLocaleString(
                      'en-IN'
                    )}{' '}
                    m

                  </span>

                </div>

              )
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
