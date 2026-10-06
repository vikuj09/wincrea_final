import React, { useMemo, useState } from 'react';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

import { useApp } from '../context/AppContext';

import Badge from '../components/common/Badge';

import {
  abcClassification,
  deadStock,
  forecastDemand,
  stockMeters,
  stockRollCount,
  daysOfCoverLeft,
  formatMeters,
  formatCurrency,
} from '../utils/calculations';

import { formatDate } from '../utils/dateUtils';


// ============================================================
// HELPERS
// ============================================================

function gradeTone(grade) {
  if (grade === 'A') return 'good';
  if (grade === 'B') return 'warn';
  return 'neutral';
}


function getTransactionType(transaction) {
  return (
    transaction.transaction_type ||
    transaction.type ||
    ''
  ).toUpperCase();
}


function getTransactionMeters(transaction) {
  return (
    Number(
      transaction.quantity ??
      transaction.meters ??
      0
    ) || 0
  );
}


function getTransactionProductId(transaction) {
  return Number(
    transaction.product_id ??
    transaction.productId ??
    0
  );
}


function getTransactionDate(transaction) {
  return (
    transaction.created_at ||
    transaction.timestamp ||
    null
  );
}


function formatNumber(value) {
  return Number(
    value || 0
  ).toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 1,
    }
  );
}


// ============================================================
// COMPONENT
// ============================================================

export default function Analytics() {

  const {
    products,
    rolls,
    transactions,
    adjustments,
    purchaseOrders,
  } = useApp();


  // ==========================================================
  // FILTERS
  // ==========================================================

  const [
    dateRange,
    setDateRange,
  ] = useState(90);


  const [
    deadThreshold,
    setDeadThreshold,
  ] = useState(60);


  const [
    forecastProduct,
    setForecastProduct,
  ] = useState(
    products[0]?.id || ''
  );


  // ==========================================================
  // ANALYTICS LEDGER
  //
  // Normal transactions are kept for demand analysis.
  // Adjustments are added separately as signed stock movement.
  // ==========================================================

  const analyticsLedger =
    useMemo(
      () => {

        const transactionEntries =
          Array.isArray(
            transactions
          )
            ? transactions
                .map(
                  (transaction) => ({

                    type:
                      getTransactionType(
                        transaction
                      ),

                    productId:
                      getTransactionProductId(
                        transaction
                      ),

                    meters:
                      getTransactionMeters(
                        transaction
                      ),

                    timestamp:
                      getTransactionDate(
                        transaction
                      ),

                    source:
                      'TRANSACTION',

                  })
                )
                .filter(
                  (entry) =>
                    entry.productId &&
                    entry.timestamp &&
                    entry.meters > 0
                )
            : [];


        const adjustmentEntries =
          Array.isArray(
            adjustments
          )
            ? adjustments
                .map(
                  (adjustment) => {

                    const type =
                      (
                        adjustment.adjustmentType ||
                        adjustment.adjustment_type ||
                        ''
                      ).toUpperCase();


                    const previous =
                      Number(
                        adjustment.previousLength ??
                        adjustment.previous_length ??
                        0
                      );


                    const newLength =
                      Number(
                        adjustment.newLength ??
                        adjustment.new_length ??
                        0
                      );


                    const quantity =
                      Number(
                        adjustment.quantity ??
                        0
                      );


                    let signedMeters =
                      0;


                    if (
                      type ===
                      'INCREASE'
                    ) {

                      signedMeters =
                        quantity;

                    } else if (
                      type ===
                      'DECREASE'
                    ) {

                      signedMeters =
                        -quantity;

                    } else if (
                      type ===
                      'SET'
                    ) {

                      signedMeters =
                        newLength -
                        previous;

                    }


                    return {

                      type:
                        'ADJUSTMENT',

                      productId:
                        Number(
                          adjustment.productId ??
                          adjustment.product_id ??
                          0
                        ),

                      meters:
                        signedMeters,

                      timestamp:
                        adjustment.createdAt ??
                        adjustment.created_at ??
                        null,

                      source:
                        'ADJUSTMENT',

                      adjustmentType:
                        type,

                      reason:
                        adjustment.reason ||
                        '',

                    };

                  }
                )
                .filter(
                  (entry) =>
                    entry.productId &&
                    entry.timestamp &&
                    entry.meters !== 0
                )
            : [];


        return [
          ...transactionEntries,
          ...adjustmentEntries,
        ];

      },
      [
        transactions,
        adjustments,
      ]
    );


  // ==========================================================
  // FILTERED MOVEMENT
  // ==========================================================

  const filteredLedger =
    useMemo(
      () => {

        const cutoff =
          Date.now() -
          dateRange *
            86400000;


        return analyticsLedger.filter(
          (entry) =>
            new Date(
              entry.timestamp
            ).getTime() >=
              cutoff
        );

      },
      [
        analyticsLedger,
        dateRange,
      ]
    );


  // ==========================================================
  // PRODUCT MAP
  // ==========================================================

  const productMap = useMemo(
    () =>
      Object.fromEntries(
        products.map(
          (product) => [
            product.id,
            product,
          ]
        )
      ),
    [
      products,
    ]
  );


  // ==========================================================
  // INVENTORY DATA
  // ==========================================================

  const inventoryData =
    useMemo(
      () => {

        return products
          .map(
            (product) => {

              const meters =
                stockMeters(
                  rolls,
                  product.id
                );


              const rollCount =
                stockRollCount(
                  rolls,
                  product.id
                );


              const rate =
                Number(
                  product.ratePerMeter
                ) || 0;


              const value =
                meters *
                rate;


              const reorderLevel =
                Number(
                  product.reorderLevel
                ) || 0;


              let status =
                'Healthy';


              if (
                meters <= 0
              ) {

                status =
                  'Out of Stock';

              } else if (
                meters <=
                reorderLevel
              ) {

                status =
                  'Low';

              } else if (
                meters <=
                reorderLevel * 1.5
              ) {

                status =
                  'Watch';

              }


              return {

                product,

                meters,

                rollCount,

                value,

                reorderLevel,

                status,

              };

            }
          )
          .sort(
            (a, b) =>
              b.meters -
              a.meters
          );

      },
      [
        products,
        rolls,
      ]
    );


  // ==========================================================
  // INVENTORY SUMMARY
  // ==========================================================

  const inventorySummary =
    useMemo(
      () => {

        const available =
          rolls.filter(
            (roll) =>
              (
                roll.status ===
                  'AVAILABLE' ||
                roll.status ===
                  'Available' ||
                roll.status ===
                  'Reserved'
              ) &&
              Number(
                roll.remainingLength ??
                roll.length ??
                0
              ) > 0
          );


        const empty =
          rolls.filter(
            (roll) =>
              roll.status ===
                'EMPTY' ||
              Number(
                roll.remainingLength ??
                roll.length ??
                0
              ) <= 0
          );


        const meters =
          available.reduce(
            (sum, roll) =>
              sum +
              Number(
                roll.remainingLength ??
                roll.length ??
                0
              ),
            0
          );


        const value =
          available.reduce(
            (sum, roll) => {

              const product =
                productMap[
                  roll.productId
                ];


              const rate =
                Number(
                  product?.ratePerMeter
                ) || 0;


              const rollMeters =
                Number(
                  roll.remainingLength ??
                  roll.length ??
                  0
                );


              return (
                sum +
                rollMeters *
                rate
              );

            },
            0
          );


        const lowStock =
          inventoryData.filter(
            (row) =>
              row.status ===
                'Low' ||
              row.status ===
                'Out of Stock'
          ).length;


        const outOfStock =
          inventoryData.filter(
            (row) =>
              row.status ===
              'Out of Stock'
          ).length;


        return {

          products:
            products.length,

          availableRolls:
            available.length,

          emptyRolls:
            empty.length,

          meters,

          value,

          lowStock,

          outOfStock,

        };

      },
      [
        products,
        rolls,
        productMap,
        inventoryData,
      ]
    );


  // ==========================================================
  // MOVEMENT SUMMARY
  //
  // Adjustments are included in net stock movement,
  // but NOT treated as customer demand.
  // ==========================================================

  const movementSummary =
    useMemo(
      () => {

        const inward =
          filteredLedger
            .filter(
              (entry) =>
                entry.type ===
                'INWARD'
            )
            .reduce(
              (sum, entry) =>
                sum +
                entry.meters,
              0
            );


        const outward =
          filteredLedger
            .filter(
              (entry) =>
                entry.type ===
                'OUTWARD'
            )
            .reduce(
              (sum, entry) =>
                sum +
                entry.meters,
              0
            );


        const returns =
          filteredLedger
            .filter(
              (entry) =>
                entry.type ===
                'RETURN'
            )
            .reduce(
              (sum, entry) =>
                sum +
                entry.meters,
              0
            );


        const adjustmentsNet =
          filteredLedger
            .filter(
              (entry) =>
                entry.type ===
                'ADJUSTMENT'
            )
            .reduce(
              (sum, entry) =>
                sum +
                entry.meters,
              0
            );


        return {

          inward,

          outward,

          returns,

          adjustmentsNet,

          net:
            inward +
            returns -
            outward +
            adjustmentsNet,

        };

      },
      [
        filteredLedger,
      ]
    );


  // ==========================================================
  // MOVEMENT TREND
  // ==========================================================

  const movementTrend =
    useMemo(
      () => {

        const buckets =
          {};


        filteredLedger.forEach(
          (entry) => {

            const date =
              new Date(
                entry.timestamp
              );


            const key =
              date.toISOString()
                .slice(
                  0,
                  10
                );


            if (
              !buckets[key]
            ) {

              buckets[key] = {

                date:
                  key,

                inward:
                  0,

                outward:
                  0,

                returns:
                  0,

                adjustments:
                  0,

              };

            }


            if (
              entry.type ===
              'INWARD'
            ) {

              buckets[key]
                .inward +=
                  entry.meters;

            }


            if (
              entry.type ===
              'OUTWARD'
            ) {

              buckets[key]
                .outward +=
                  entry.meters;

            }


            if (
              entry.type ===
              'RETURN'
            ) {

              buckets[key]
                .returns +=
                  entry.meters;

            }


            if (
              entry.type ===
              'ADJUSTMENT'
            ) {

              buckets[key]
                .adjustments +=
                  entry.meters;

            }

          }
        );


        return Object.values(
          buckets
        )
          .sort(
            (a, b) =>
              new Date(a.date) -
              new Date(b.date)
          )
          .map(
            (row) => ({

              ...row,

              label:
                new Date(
                  row.date
                ).toLocaleDateString(
                  'en-IN',
                  {
                    day: '2-digit',
                    month: 'short',
                  }
                ),

            })
          );

      },
      [
        filteredLedger,
      ]
    );


  // ==========================================================
  // PRODUCT MOVEMENT
  //
  // IMPORTANT:
  // Outward remains demand.
  // Adjustments affect stock movement but do not
  // artificially increase demand velocity.
  // ==========================================================

  const productMovement =
    useMemo(
      () => {

        return products

          .map(
            (product) => {

              const outward =
                filteredLedger

                  .filter(
                    (entry) =>
                      entry.type ===
                        'OUTWARD' &&
                      entry.productId ===
                        Number(
                          product.id
                        )
                  )

                  .reduce(
                    (sum, entry) =>
                      sum +
                      entry.meters,
                    0
                  );


              const inward =
                filteredLedger

                  .filter(
                    (entry) =>
                      entry.type ===
                        'INWARD' &&
                      entry.productId ===
                        Number(
                          product.id
                        )
                  )

                  .reduce(
                    (sum, entry) =>
                      sum +
                      entry.meters,
                    0
                  );


              const returns =
                filteredLedger

                  .filter(
                    (entry) =>
                      entry.type ===
                        'RETURN' &&
                      entry.productId ===
                        Number(
                          product.id
                        )
                  )

                  .reduce(
                    (sum, entry) =>
                      sum +
                      entry.meters,
                    0
                  );


              const adjustmentNet =
                filteredLedger

                  .filter(
                    (entry) =>
                      entry.type ===
                        'ADJUSTMENT' &&
                      entry.productId ===
                        Number(
                          product.id
                        )
                  )

                  .reduce(
                    (sum, entry) =>
                      sum +
                      entry.meters,
                    0
                  );


              const velocity =
                outward /
                Math.max(
                  1,
                  dateRange
                );


              return {

                product,

                inward,

                outward,

                returns,

                adjustmentNet,

                velocity,

              };

            }
          )

          .sort(
            (a, b) =>
              b.outward -
              a.outward
          );

      },
      [
        products,
        filteredLedger,
        dateRange,
      ]
    );


  // ==========================================================
  // STOCK COVERAGE
  // ==========================================================

  const coverageData =
    useMemo(
      () => {

        return products

          .map(
            (product) => {

              const stock =
                stockMeters(
                  rolls,
                  product.id
                );


              const movement =
                productMovement.find(
                  (row) =>
                    Number(
                      row.product.id
                    ) ===
                    Number(
                      product.id
                    )
                );


              const dailyVelocity =
                movement
                  ? movement.velocity
                  : 0;


              const coverDays =
                daysOfCoverLeft(
                  stock,
                  dailyVelocity
                );


              return {

                product,

                stock,

                dailyVelocity,

                coverDays,

              };

            }
          )

          .sort(
            (a, b) =>
              a.coverDays -
              b.coverDays
          );

      },
      [
        products,
        rolls,
        productMovement,
      ]
    );


  // ==========================================================
  // ABC
  // ==========================================================

  const abc =
    useMemo(
      () =>
        abcClassification(
          products,
          filteredLedger,
          dateRange
        ),
      [
        products,
        filteredLedger,
        dateRange,
      ]
    );


  // ==========================================================
  // DEAD STOCK
  // ==========================================================

  const dead =
    useMemo(
      () =>
        deadStock(
          products,
          rolls,
          analyticsLedger,
          deadThreshold
        ),
      [
        products,
        rolls,
        analyticsLedger,
        deadThreshold,
      ]
    );


  // ==========================================================
  // FAST / SLOW MOVERS
  // ==========================================================

  const fastMovers =
    productMovement
      .slice(
        0,
        10
      );


  const slowMovers =
    [...productMovement]
      .sort(
        (a, b) =>
          a.outward -
          b.outward
      )
      .slice(
        0,
        10
      );


  // ==========================================================
  // FORECAST
  // ==========================================================

  const forecast =
    useMemo(
      () => {

        if (
          !forecastProduct
        ) {

          return {

            dailyVelocity:
              0,

            d30:
              0,

            d60:
              0,

            d90:
              0,

          };

        }


        // Only actual outward transactions
        // should be used to forecast demand.
        const demandLedger =
          analyticsLedger.filter(
            (entry) =>
              entry.type ===
              'OUTWARD'
          );


        return forecastDemand(
          demandLedger,
          Number(
            forecastProduct
          )
        );

      },
      [
        analyticsLedger,
        forecastProduct,
      ]
    );


  const forecastMeters =
    useMemo(
      () => {

        if (
          !forecastProduct
        ) {
          return 0;
        }


        return stockMeters(
          rolls,
          Number(
            forecastProduct
          )
        );

      },
      [
        rolls,
        forecastProduct,
      ]
    );


  const forecastCoverDays =
    useMemo(
      () =>
        daysOfCoverLeft(
          forecastMeters,
          forecast.dailyVelocity
        ),
      [
        forecastMeters,
        forecast.dailyVelocity,
      ]
    );


  // ==========================================================
  // CUSTOMER ANALYTICS
  // ==========================================================

  const customerAnalytics =
    useMemo(
      () => {

        const map =
          {};


        transactions

          .filter(
            (transaction) =>
              getTransactionType(
                transaction
              ) === 'OUTWARD'
          )

          .forEach(
            (transaction) => {

              const id =
                transaction.customer_id ||
                transaction.customer_name ||
                'Unknown';


              const name =
                transaction.customer_name ||
                `Customer ${transaction.customer_id || ''}`;


              if (
                !map[id]
              ) {

                map[id] = {

                  id,

                  name,

                  meters:
                    0,

                  transactions:
                    0,

                };

              }


              map[id].meters +=
                getTransactionMeters(
                  transaction
                );


              map[id].transactions +=
                1;

            }
          );


        return Object.values(
          map
        ).sort(
          (a, b) =>
            b.meters -
            a.meters
        );

      },
      [
        transactions,
      ]
    );


  // ==========================================================
  // SUPPLIER ANALYTICS
  // ==========================================================

  const supplierAnalytics =
    useMemo(
      () => {

        const map =
          {};


        transactions

          .filter(
            (transaction) =>
              getTransactionType(
                transaction
              ) === 'INWARD'
          )

          .forEach(
            (transaction) => {

              const id =
                transaction.supplier_id ||
                transaction.supplier_name ||
                'Unknown';


              const name =
                transaction.supplier_name ||
                `Supplier ${transaction.supplier_id || ''}`;


              if (
                !map[id]
              ) {

                map[id] = {

                  id,

                  name,

                  meters:
                    0,

                  transactions:
                    0,

                };

              }


              map[id].meters +=
                getTransactionMeters(
                  transaction
                );


              map[id].transactions +=
                1;

            }
          );


        return Object.values(
          map
        ).sort(
          (a, b) =>
            b.meters -
            a.meters
        );

      },
      [
        transactions,
      ]
    );


  // ==========================================================
  // PO ANALYTICS
  // ==========================================================

  const poAnalytics =
    useMemo(
      () => {

        const ordered =
          purchaseOrders.reduce(
            (sum, po) =>
              sum +
              Number(
                po.orderedMeters ||
                po.totalOrderedMeters ||
                0
              ),
            0
          );


        const received =
          purchaseOrders.reduce(
            (sum, po) =>
              sum +
              Number(
                po.receivedMeters ||
                po.totalReceivedMeters ||
                0
              ),
            0
          );


        const pending =
          Math.max(
            0,
            ordered -
              received
          );


        const open =
          purchaseOrders.filter(
            (po) =>
              po.status ===
                'ORDERED' ||
              po.status ===
                'PARTIALLY_RECEIVED' ||
              po.status ===
                'Ordered' ||
              po.status ===
                'Partially Received'
          );


        return {

          ordered,

          received,

          pending,

          openCount:
            open.length,

          partialCount:
            purchaseOrders.filter(
              (po) =>
                po.status ===
                  'PARTIALLY_RECEIVED' ||
                po.status ===
                  'Partially Received'
            ).length,

          receivedCount:
            purchaseOrders.filter(
              (po) =>
                po.status ===
                  'RECEIVED' ||
                po.status ===
                  'Received'
            ).length,

        };

      },
      [
        purchaseOrders,
      ]
    );


  // ==========================================================
  // ADJUSTMENT SUMMARY
  // ==========================================================

  const adjustmentSummary =
    useMemo(
      () => {

        const increase =
          filteredLedger
            .filter(
              (entry) =>
                entry.type ===
                  'ADJUSTMENT' &&
                entry.meters > 0
            )
            .reduce(
              (sum, entry) =>
                sum +
                entry.meters,
              0
            );


        const decrease =
          filteredLedger
            .filter(
              (entry) =>
                entry.type ===
                  'ADJUSTMENT' &&
                entry.meters < 0
            )
            .reduce(
              (sum, entry) =>
                sum +
                Math.abs(
                  entry.meters
                ),
              0
            );


        return {

          increase,

          decrease,

          net:
            increase -
            decrease,

        };

      },
      [
        filteredLedger,
      ]
    );


  // ==========================================================
  // ACTIONABLE RECOMMENDATIONS
  // ==========================================================

  const recommendations =
    useMemo(
      () => {

        const result =
          [];


        // ------------------------------------------------------
        // Low stock
        // ------------------------------------------------------

        inventoryData
          .filter(
            (row) =>
              row.status ===
                'Low' ||
              row.status ===
                'Out of Stock'
          )
          .forEach(
            (row) => {

              const coverage =
                coverageData.find(
                  (item) =>
                    Number(
                      item.product.id
                    ) ===
                    Number(
                      row.product.id
                    )
                );


              result.push({

                priority:
                  row.status ===
                    'Out of Stock'
                    ? 'HIGH'
                    : 'MEDIUM',

                type:
                  'STOCK',

                title:
                  `${row.product.sku} needs attention`,

                message:
                  row.status ===
                    'Out of Stock'
                    ? 'Product is currently out of stock.'
                    : `Stock is at ${formatMeters(row.meters)} against a reorder level of ${formatMeters(row.reorderLevel)}.`,

                coverDays:
                  coverage?.coverDays,

              });

            }
          );


        // ------------------------------------------------------
        // Short coverage
        // ------------------------------------------------------

        coverageData
          .filter(
            (row) =>
              row.stock > 0 &&
              Number.isFinite(
                row.coverDays
              ) &&
              row.coverDays < 30
          )
          .forEach(
            (row) => {

              result.push({

                priority:
                  row.coverDays <
                  15
                    ? 'HIGH'
                    : 'MEDIUM',

                type:
                  'FORECAST',

                title:
                  `${row.product.sku} may run low soon`,

                message:
                  `Only about ${Math.round(row.coverDays)} days of stock cover remains at the current outward velocity.`,

                coverDays:
                  row.coverDays,

              });

            }
          );


        // ------------------------------------------------------
        // Dead stock
        // ------------------------------------------------------

        dead
          .slice(
            0,
            5
          )
          .forEach(
            (row) => {

              result.push({

                priority:
                  'LOW',

                type:
                  'DEAD STOCK',

                title:
                  `${row.product.sku} is slow-moving`,

                message:
                  row.lastOutward
                    ? `No outward movement for approximately ${row.idleDays} days.`
                    : 'No outward movement has been recorded.',

                coverDays:
                  null,

              });

            }
          );


        // ------------------------------------------------------
        // Pending PO
        // ------------------------------------------------------

        if (
          poAnalytics.pending >
          0
        ) {

          result.push({

            priority:
              'MEDIUM',

            type:
              'PURCHASE ORDER',

            title:
              'Purchase orders still pending',

            message:
              `${formatMeters(poAnalytics.pending)} remains to be received across open purchase orders.`,

            coverDays:
              null,

          });

        }


        // ------------------------------------------------------
        // Large adjustment activity
        // ------------------------------------------------------

        if (
          adjustmentSummary.decrease >
          0
        ) {

          result.push({

            priority:
              adjustmentSummary.decrease >=
              100
                ? 'HIGH'
                : 'MEDIUM',

            type:
              'ADJUSTMENT',

            title:
              'Inventory reductions recorded',

            message:
              `${formatMeters(adjustmentSummary.decrease)} has been removed through inventory adjustments during this period.`,

            coverDays:
              null,

          });

        }


        const priorityRank = {

          HIGH:
            1,

          MEDIUM:
            2,

          LOW:
            3,

        };


        return result
          .sort(
            (a, b) =>
              priorityRank[
                a.priority
              ] -
              priorityRank[
                b.priority
              ]
          )
          .slice(
            0,
            10
          );

      },
      [
        inventoryData,
        coverageData,
        dead,
        poAnalytics,
        adjustmentSummary,
      ]
    );


  // ==========================================================
  // CHART DATA
  // ==========================================================

  const stockChartData =
    inventoryData
      .slice(
        0,
        12
      )
      .map(
        (row) => ({

          name:
            row.product.sku,

          meters:
            Number(
              row.meters.toFixed(
                1
              )
            ),

        })
      );


  const fastMoverChartData =
    fastMovers.map(
      (row) => ({

        name:
          row.product.sku,

        meters:
          Math.round(
            row.outward
          ),

      })
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="space-y-8">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>

          <h1 className="font-display text-2xl">
            Analytics
          </h1>

          <p className="text-sm text-ink-700/60 mt-1">
            Inventory, movement, forecasting and operational insights from your ERP data.
          </p>

        </div>


        <div className="flex items-center gap-2">

          <span className="text-sm text-ink-700/60">
            Movement period
          </span>


          <select
            className="input w-auto"
            value={
              dateRange
            }
            onChange={(e) =>
              setDateRange(
                Number(
                  e.target.value
                )
              )
            }
          >

            <option value={7}>
              7 days
            </option>

            <option value={30}>
              30 days
            </option>

            <option value={90}>
              90 days
            </option>

            <option value={180}>
              180 days
            </option>

            <option value={365}>
              365 days
            </option>

          </select>

        </div>

      </div>


      {/* ======================================================
          ACTIONABLE ALERTS
      ====================================================== */}

      <section className="space-y-3">

        <div className="flex items-center justify-between">

          <h2 className="font-display text-lg">
            Recommended actions
          </h2>

          <span className="text-xs text-ink-700/50">
            Based on current stock and movement
          </span>

        </div>


        <div className="grid lg:grid-cols-2 gap-3">

          {recommendations.length === 0 ? (

            <div className="card p-5 text-sm text-signal-good lg:col-span-2">
              No urgent inventory actions detected.
            </div>

          ) : (

            recommendations.map(
              (item, index) => (

                <div
                  key={
                    `${item.type}-${item.title}-${index}`
                  }
                  className="card p-4"
                >

                  <div className="flex items-start justify-between gap-3">

                    <div>

                      <div className="flex items-center gap-2">

                        <Badge
                          tone={
                            item.priority ===
                              'HIGH'
                              ? 'bad'
                              : item.priority ===
                                'MEDIUM'
                                ? 'warn'
                                : 'neutral'
                          }
                        >
                          {
                            item.priority
                          }
                        </Badge>

                        <span className="text-[11px] uppercase tracking-wide text-ink-700/50">
                          {
                            item.type
                          }
                        </span>

                      </div>


                      <p className="font-medium mt-2">
                        {
                          item.title
                        }
                      </p>


                      <p className="text-sm text-ink-700/60 mt-1">
                        {
                          item.message
                        }
                      </p>

                    </div>


                    {Number.isFinite(
                      item.coverDays
                    ) && (

                      <div className="text-right shrink-0">

                        <p className="text-[11px] uppercase tracking-wide text-ink-700/50">
                          Cover
                        </p>

                        <p className="font-display text-lg">
                          {
                            Math.round(
                              item.coverDays
                            )
                          }d
                        </p>

                      </div>

                    )}

                  </div>

                </div>

              )
            )

          )}

        </div>

      </section>


      {/* ======================================================
          INVENTORY KPIs
      ====================================================== */}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <AnalyticsCard
          label="Current stock"
          value={formatMeters(
            inventorySummary.meters
          )}
        />

        <AnalyticsCard
          label="Stock value"
          value={formatCurrency(
            inventorySummary.value
          )}
        />

        <AnalyticsCard
          label="Available rolls"
          value={
            inventorySummary.availableRolls
          }
        />

        <AnalyticsCard
          label="Low / out of stock"
          value={
            inventorySummary.lowStock
          }
          tone={
            inventorySummary.lowStock >
            0
              ? 'bad'
              : 'good'
          }
        />

      </section>


      {/* ======================================================
          MOVEMENT KPIs
      ====================================================== */}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <AnalyticsCard
          label={`${dateRange}-day inward`}
          value={formatMeters(
            movementSummary.inward
          )}
        />

        <AnalyticsCard
          label={`${dateRange}-day outward`}
          value={formatMeters(
            movementSummary.outward
          )}
        />

        <AnalyticsCard
          label="Net movement"
          value={formatMeters(
            movementSummary.net
          )}
          tone={
            movementSummary.net >= 0
              ? 'good'
              : 'bad'
          }
        />

        <AnalyticsCard
          label="Adjustment net"
          value={formatMeters(
            adjustmentSummary.net
          )}
          tone={
            adjustmentSummary.net >= 0
              ? 'good'
              : 'bad'
          }
        />

      </section>


      {/* ======================================================
          PURCHASE ORDER KPIs
      ====================================================== */}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <AnalyticsCard
          label="PO ordered"
          value={formatMeters(
            poAnalytics.ordered
          )}
        />

        <AnalyticsCard
          label="PO received"
          value={formatMeters(
            poAnalytics.received
          )}
        />

        <AnalyticsCard
          label="PO pending"
          value={formatMeters(
            poAnalytics.pending
          )}
          tone={
            poAnalytics.pending >
            0
              ? 'bad'
              : 'good'
          }
        />

        <AnalyticsCard
          label="Open POs"
          value={
            poAnalytics.openCount
          }
        />

      </section>


      {/* ======================================================
          MOVEMENT TREND
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          Inward, outward & adjustments
        </h2>


        <div className="card p-4">

          {movementTrend.length ===
          0 ? (

            <div className="h-[300px] flex items-center justify-center text-sm text-ink-700/50">
              No movement data available for this period.
            </div>

          ) : (

            <ResponsiveContainer
              width="100%"
              height={300}
            >

              <LineChart
                data={
                  movementTrend
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 11,
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                  }}
                />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="inward"
                  name="Inward (m)"
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="outward"
                  name="Outward (m)"
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="returns"
                  name="Returns (m)"
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="adjustments"
                  name="Adjustments (net m)"
                  strokeWidth={2}
                  dot={false}
                />

              </LineChart>

            </ResponsiveContainer>

          )}

        </div>

      </section>


      {/* ======================================================
          ADJUSTMENT SUMMARY
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          Inventory adjustments
        </h2>


        <div className="grid grid-cols-3 gap-4">

          <AnalyticsCard
            label="Increased"
            value={`+${formatMeters(
              adjustmentSummary.increase
            )}`}
            tone="good"
          />

          <AnalyticsCard
            label="Decreased"
            value={`-${formatMeters(
              adjustmentSummary.decrease
            )}`}
            tone={
              adjustmentSummary.decrease >
              0
                ? 'bad'
                : 'ink'
            }
          />

          <AnalyticsCard
            label="Net adjustment"
            value={formatMeters(
              adjustmentSummary.net
            )}
            tone={
              adjustmentSummary.net >= 0
                ? 'good'
                : 'bad'
            }
          />

        </div>

      </section>


      {/* ======================================================
          STOCK BY SKU
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          Current stock by SKU
        </h2>


        <div className="card p-4">

          <ResponsiveContainer
            width="100%"
            height={300}
          >

            <BarChart
              data={
                stockChartData
              }
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 11,
                }}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                }}
              />

              <Tooltip />

              <Bar
                dataKey="meters"
                name="Stock (m)"
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

      </section>


      {/* ======================================================
          INVENTORY TABLE
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          Inventory health
        </h2>


        <div className="card overflow-x-auto">

          <table className="w-full">

            <thead>

              <tr>

                <th className="table-head">
                  SKU
                </th>

                <th className="table-head">
                  Product
                </th>

                <th className="table-head">
                  Stock
                </th>

                <th className="table-head">
                  Rolls
                </th>

                <th className="table-head">
                  Reorder level
                </th>

                <th className="table-head">
                  Value
                </th>

                <th className="table-head">
                  Status
                </th>

              </tr>

            </thead>


            <tbody>

              {inventoryData.map(
                (row) => (

                  <tr
                    key={
                      row.product.id
                    }
                  >

                    <td className="table-cell font-medium">
                      {
                        row.product.sku
                      }
                    </td>

                    <td className="table-cell">
                      {
                        row.product.name
                      }
                    </td>

                    <td className="table-cell">
                      {
                        formatMeters(
                          row.meters
                        )
                      }
                    </td>

                    <td className="table-cell">
                      {
                        row.rollCount
                      }
                    </td>

                    <td className="table-cell">
                      {
                        formatMeters(
                          row.reorderLevel
                        )
                      }
                    </td>

                    <td className="table-cell">
                      {
                        formatCurrency(
                          row.value
                        )
                      }
                    </td>

                    <td className="table-cell">

                      <Badge
                        tone={
                          row.status ===
                            'Out of Stock'
                            ? 'bad'
                            : row.status ===
                              'Low'
                              ? 'warn'
                              : row.status ===
                                'Watch'
                                ? 'warn'
                                : 'good'
                        }
                      >
                        {
                          row.status
                        }
                      </Badge>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          FAST MOVERS
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          Fast-moving products
        </h2>


        <div className="card p-4">

          {fastMoverChartData.length ===
          0 ? (

            <div className="h-[280px] flex items-center justify-center text-sm text-ink-700/50">
              No outward movement recorded.
            </div>

          ) : (

            <ResponsiveContainer
              width="100%"
              height={280}
            >

              <BarChart
                data={
                  fastMoverChartData
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 11,
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                  }}
                />

                <Tooltip />

                <Bar
                  dataKey="meters"
                  name="Outward (m)"
                  radius={[
                    3,
                    3,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          )}

        </div>

      </section>


      {/* ======================================================
          FAST / SLOW TABLES
      ====================================================== */}

      <section className="grid lg:grid-cols-2 gap-5">

        <MoverTable
          title="Fast movers"
          rows={
            fastMovers
          }
        />


        <MoverTable
          title="Slow / no movement"
          rows={
            slowMovers
          }
        />

      </section>


      {/* ======================================================
          STOCK COVERAGE
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          Stock coverage
        </h2>


        <div className="card overflow-x-auto">

          <table className="w-full">

            <thead>

              <tr>

                <th className="table-head">
                  SKU
                </th>

                <th className="table-head">
                  Stock
                </th>

                <th className="table-head">
                  Daily outward
                </th>

                <th className="table-head">
                  Estimated cover
                </th>

              </tr>

            </thead>


            <tbody>

              {coverageData.map(
                (row) => (

                  <tr
                    key={
                      row.product.id
                    }
                  >

                    <td className="table-cell font-medium">
                      {
                        row.product.sku
                      }
                    </td>

                    <td className="table-cell">
                      {
                        formatMeters(
                          row.stock
                        )
                      }
                    </td>

                    <td className="table-cell">
                      {
                        formatNumber(
                          row.dailyVelocity
                        )
                      }{' '}
                      m/day
                    </td>

                    <td className="table-cell">

                      {Number.isFinite(
                        row.coverDays
                      )
                        ? `${Math.round(
                            row.coverDays
                          )} days`
                        : 'No sales'}

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          ABC CLASSIFICATION
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          ABC classification
        </h2>


        <div className="card overflow-x-auto">

          <table className="w-full">

            <thead>

              <tr>

                <th className="table-head">
                  SKU
                </th>

                <th className="table-head">
                  Outward meters
                </th>

                <th className="table-head">
                  Value
                </th>

                <th className="table-head">
                  % of value
                </th>

                <th className="table-head">
                  Grade
                </th>

              </tr>

            </thead>


            <tbody>

              {abc.map(
                (item) => (

                  <tr
                    key={
                      item.product.id
                    }
                  >

                    <td className="table-cell font-medium">
                      {
                        item.product.sku
                      }
                    </td>

                    <td className="table-cell">
                      {
                        formatMeters(
                          item.meters
                        )
                      }
                    </td>

                    <td className="table-cell">
                      {
                        formatCurrency(
                          item.value
                        )
                      }
                    </td>

                    <td className="table-cell">
                      {
                        (
                          item.pctOfValue *
                          100
                        ).toFixed(
                          1
                        )
                      }%
                    </td>

                    <td className="table-cell">

                      <Badge
                        tone={
                          gradeTone(
                            item.grade
                          )
                        }
                      >
                        {
                          item.grade
                        }
                      </Badge>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          DEAD STOCK
      ====================================================== */}

      <section className="space-y-3">

        <div className="flex items-center justify-between">

          <h2 className="font-display text-lg">
            Dead / slow stock
          </h2>


          <select
            className="input w-auto"
            value={
              deadThreshold
            }
            onChange={(e) =>
              setDeadThreshold(
                Number(
                  e.target.value
                )
              )
            }
          >

            <option value={30}>
              30 days
            </option>

            <option value={45}>
              45 days
            </option>

            <option value={60}>
              60 days
            </option>

            <option value={90}>
              90 days
            </option>

            <option value={120}>
              120 days
            </option>

          </select>

        </div>


        <div className="card overflow-x-auto">

          <table className="w-full">

            <thead>

              <tr>

                <th className="table-head">
                  SKU
                </th>

                <th className="table-head">
                  Stock
                </th>

                <th className="table-head">
                  Last outward
                </th>

                <th className="table-head">
                  Idle
                </th>

              </tr>

            </thead>


            <tbody>

              {dead.length ===
              0 ? (

                <tr>

                  <td
                    colSpan={4}
                    className="table-cell text-center text-ink-700/50 py-6"
                  >
                    No products idle beyond{' '}
                    {
                      deadThreshold
                    }{' '}
                    days.
                  </td>

                </tr>

              ) : (

                dead.map(
                  (row) => (

                    <tr
                      key={
                        row.product.id
                      }
                    >

                      <td className="table-cell font-medium">
                        {
                          row.product.sku
                        }
                      </td>

                      <td className="table-cell">
                        {
                          formatMeters(
                            row.meters
                          )
                        }
                      </td>

                      <td className="table-cell">
                        {
                          row.lastOutward
                            ? formatDate(
                                row.lastOutward
                              )
                            : 'Never'
                        }
                      </td>

                      <td className="table-cell text-signal-warn font-medium">

                        {
                          Number.isFinite(
                            row.idleDays
                          )
                            ? `${row.idleDays} days`
                            : 'No sales'
                        }

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          CUSTOMER ANALYTICS
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          Top customers
        </h2>


        <div className="card overflow-x-auto">

          <table className="w-full">

            <thead>

              <tr>

                <th className="table-head">
                  Customer
                </th>

                <th className="table-head">
                  Outward meters
                </th>

                <th className="table-head">
                  Transactions
                </th>

              </tr>

            </thead>


            <tbody>

              {customerAnalytics
                .slice(
                  0,
                  10
                )
                .map(
                  (customer) => (

                    <tr
                      key={
                        customer.id
                      }
                    >

                      <td className="table-cell font-medium">
                        {
                          customer.name
                        }
                      </td>

                      <td className="table-cell">
                        {
                          formatMeters(
                            customer.meters
                          )
                        }
                      </td>

                      <td className="table-cell">
                        {
                          customer.transactions
                        }
                      </td>

                    </tr>

                  )
                )}


              {customerAnalytics.length ===
                0 && (

                <tr>

                  <td
                    colSpan={3}
                    className="table-cell text-center text-ink-700/50 py-6"
                  >
                    No outward transactions available.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          SUPPLIER ANALYTICS
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          Suppliers by received volume
        </h2>


        <div className="card overflow-x-auto">

          <table className="w-full">

            <thead>

              <tr>

                <th className="table-head">
                  Supplier
                </th>

                <th className="table-head">
                  Received meters
                </th>

                <th className="table-head">
                  Inward transactions
                </th>

              </tr>

            </thead>


            <tbody>

              {supplierAnalytics
                .slice(
                  0,
                  10
                )
                .map(
                  (supplier) => (

                    <tr
                      key={
                        supplier.id
                      }
                    >

                      <td className="table-cell font-medium">
                        {
                          supplier.name
                        }
                      </td>

                      <td className="table-cell">
                        {
                          formatMeters(
                            supplier.meters
                          )
                        }
                      </td>

                      <td className="table-cell">
                        {
                          supplier.transactions
                        }
                      </td>

                    </tr>

                  )
                )}


              {supplierAnalytics.length ===
                0 && (

                <tr>

                  <td
                    colSpan={3}
                    className="table-cell text-center text-ink-700/50 py-6"
                  >
                    No inward transactions available.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          PURCHASE ORDERS
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          Purchase order analytics
        </h2>


        <div className="card overflow-x-auto">

          <table className="w-full">

            <thead>

              <tr>

                <th className="table-head">
                  PO #
                </th>

                <th className="table-head">
                  Supplier
                </th>

                <th className="table-head">
                  Ordered
                </th>

                <th className="table-head">
                  Received
                </th>

                <th className="table-head">
                  Pending
                </th>

                <th className="table-head">
                  Status
                </th>

              </tr>

            </thead>


            <tbody>

              {purchaseOrders.map(
                (po) => {

                  const ordered =
                    Number(
                      po.orderedMeters ??
                      po.totalOrderedMeters ??
                      0
                    );


                  const received =
                    Number(
                      po.receivedMeters ??
                      po.totalReceivedMeters ??
                      0
                    );


                  return (

                    <tr
                      key={
                        po.id
                      }
                    >

                      <td className="table-cell font-medium">
                        {
                          po.poNumber
                        }
                      </td>

                      <td className="table-cell">
                        {
                          po.supplierName ||
                          '—'
                        }
                      </td>

                      <td className="table-cell">
                        {
                          formatMeters(
                            ordered
                          )
                        }
                      </td>

                      <td className="table-cell">
                        {
                          formatMeters(
                            received
                          )
                        }
                      </td>

                      <td className="table-cell">
                        {
                          formatMeters(
                            Math.max(
                              0,
                              ordered -
                                received
                            )
                          )
                        }
                      </td>

                      <td className="table-cell">

                        <Badge
                          tone={
                            po.status ===
                                'RECEIVED' ||
                            po.status ===
                                'Received'
                              ? 'good'
                              : po.status ===
                                  'PARTIALLY_RECEIVED' ||
                                po.status ===
                                  'Partially Received'
                                ? 'warn'
                                : po.status ===
                                    'CANCELLED' ||
                                  po.status ===
                                    'Cancelled'
                                  ? 'neutral'
                                  : 'info'
                          }
                        >
                          {
                            po.status
                          }
                        </Badge>

                      </td>

                    </tr>

                  );

                }
              )}


              {purchaseOrders.length ===
                0 && (

                <tr>

                  <td
                    colSpan={6}
                    className="table-cell text-center text-ink-700/50 py-6"
                  >
                    No purchase orders available.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ======================================================
          DEMAND FORECAST
      ====================================================== */}

      <section className="space-y-3">

        <h2 className="font-display text-lg">
          Demand forecast
        </h2>


        <div className="card p-5 max-w-2xl space-y-5">


          <div>

            <label className="label">
              Product
            </label>


            <select
              className="input"
              value={
                forecastProduct
              }
              onChange={(e) =>
                setForecastProduct(
                  e.target.value
                )
              }
            >

              {products.map(
                (product) => (

                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {
                      product.sku
                    }{' '}
                    —{' '}
                    {
                      product.name
                    }
                  </option>

                )
              )}

            </select>

          </div>


          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            <ForecastBox
              label="Current stock"
              value={formatMeters(
                forecastMeters
              )}
            />


            <ForecastBox
              label="Daily velocity"
              value={`${formatNumber(
                forecast.dailyVelocity
              )} m`}
            />


            <ForecastBox
              label="30-day demand"
              value={formatMeters(
                forecast.d30
              )}
            />


            <ForecastBox
              label="60-day demand"
              value={formatMeters(
                forecast.d60
              )}
            />


            <ForecastBox
              label="90-day demand"
              value={formatMeters(
                forecast.d90
              )}
            />


            <ForecastBox
              label="Stock cover"
              value={
                Number.isFinite(
                  forecastCoverDays
                )
                  ? `${Math.round(
                      forecastCoverDays
                    )} days`
                  : 'No sales'
              }
            />


            <ForecastBox
              label="60-day shortfall"
              value={
                forecastMeters -
                  forecast.d60 <
                0
                  ? formatMeters(
                      Math.abs(
                        forecastMeters -
                          forecast.d60
                      )
                    )
                  : 'None'
              }
              tone={
                forecastMeters -
                  forecast.d60 <
                0
                  ? 'bad'
                  : 'good'
              }
            />

          </div>


          <p className="text-xs text-ink-700/50">

            Forecast uses actual outward
            movement as customer demand.
            Inventory adjustments affect stock
            but are not treated as customer demand.

          </p>

        </div>

      </section>

    </div>

  );
}


// ============================================================
// ANALYTICS CARD
// ============================================================

function AnalyticsCard({
  label,
  value,
  tone = 'ink',
}) {

  const toneMap = {

    ink:
      'text-ink-900',

    good:
      'text-signal-good',

    bad:
      'text-signal-bad',

  };


  return (

    <div className="card p-4">

      <p className="text-[11px] uppercase tracking-wide text-ink-700/50">
        {label}
      </p>


      <p
        className={`font-display text-xl mt-1 ${toneMap[tone]}`}
      >
        {value}
      </p>

    </div>

  );
}


// ============================================================
// MOVER TABLE
// ============================================================

function MoverTable({
  title,
  rows,
}) {

  return (

    <div className="space-y-3">

      <h2 className="font-display text-lg">
        {title}
      </h2>


      <div className="card overflow-x-auto">

        <table className="w-full">

          <thead>

            <tr>

              <th className="table-head">
                SKU
              </th>

              <th className="table-head">
                Outward
              </th>

            </tr>

          </thead>


          <tbody>

            {rows.map(
              (row) => (

                <tr
                  key={
                    row.product.id
                  }
                >

                  <td className="table-cell font-medium">
                    {
                      row.product.sku
                    }
                  </td>

                  <td className="table-cell">
                    {
                      formatMeters(
                        row.outward
                      )
                    }
                  </td>

                </tr>

              )
            )}


            {rows.length ===
              0 && (

              <tr>

                <td
                  colSpan={2}
                  className="table-cell text-center text-ink-700/50 py-6"
                >
                  No movement data.
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

    </div>

  );
}


// ============================================================
// FORECAST BOX
// ============================================================

function ForecastBox({
  label,
  value,
  tone = 'ink',
}) {

  const toneMap = {

    ink:
      'text-ink-900',

    bad:
      'text-signal-bad',

    good:
      'text-signal-good',

  };


  return (

    <div className="bg-canvas rounded-sm p-3 border border-ink-900/5">

      <p className="text-[11px] uppercase tracking-wide text-ink-700/50">
        {label}
      </p>


      <p
        className={`font-display text-lg mt-1 ${toneMap[tone]}`}
      >
        {value}
      </p>

    </div>

  );
}