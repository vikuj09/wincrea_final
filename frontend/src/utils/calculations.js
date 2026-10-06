import { daysAgo } from './dateUtils';

/**
 * Roll statuses that count as sellable, on-hand stock.
 *
 * MySQL currently uses:
 *   AVAILABLE
 *   EMPTY
 *
 * Older frontend data may use:
 *   Available
 *   Reserved
 */
export const AVAILABLE_STATUSES = [
  'AVAILABLE',
  'Available',
  'Reserved',
];


/**
 * Get all rolls belonging to a product.
 */
export function rollsForProduct(rolls, productId) {
  return rolls.filter(
    (r) =>
      Number(r.productId) === Number(productId)
  );
}


/**
 * Get the actual remaining meters of a roll.
 *
 * New MySQL data is expected to provide
 * remainingLength.
 *
 * Older frontend data may only have length,
 * so we fall back to length.
 */
export function rollRemainingMeters(roll) {
  if (
    roll.remainingLength !== undefined &&
    roll.remainingLength !== null
  ) {
    return Number(
      roll.remainingLength
    ) || 0;
  }

  if (
    roll.remaining_length !== undefined &&
    roll.remaining_length !== null
  ) {
    return Number(
      roll.remaining_length
    ) || 0;
  }

  return Number(
    roll.length
  ) || 0;
}


/**
 * Total meters currently on hand
 * for a product.
 *
 * Uses remaining meters, not original
 * roll length.
 */
export function stockMeters(
  rolls,
  productId
) {

  return rollsForProduct(
    rolls,
    productId
  )
    .filter(
      (r) =>
        AVAILABLE_STATUSES.includes(
          r.status
        )
    )
    .reduce(
      (sum, roll) =>
        sum +
        rollRemainingMeters(
          roll
        ),
      0
    );
}


/**
 * Number of sellable/on-hand rolls
 * for a product.
 */
export function stockRollCount(
  rolls,
  productId
) {

  return rollsForProduct(
    rolls,
    productId
  )
    .filter(
      (r) =>
        AVAILABLE_STATUSES.includes(
          r.status
        )
    )
    .filter(
      (r) =>
        rollRemainingMeters(
          r
        ) > 0
    )
    .length;
}


/**
 * Total stock across all products.
 */
export function totalStock(
  rolls
) {

  const available =
    rolls.filter(
      (r) =>
        AVAILABLE_STATUSES.includes(
          r.status
        )
    );


  return {

    rolls:
      available.filter(
        (r) =>
          rollRemainingMeters(
            r
          ) > 0
      ).length,

    meters:
      available.reduce(
        (sum, roll) =>
          sum +
          rollRemainingMeters(
            roll
          ),
        0
      ),

  };
}


/**
 * Determine stock status based on
 * current meters and reorder level.
 */
export function stockStatus(
  meters,
  reorderLevel
) {

  if (
    meters <= 0
  ) {
    return 'out';
  }

  if (
    meters <= reorderLevel
  ) {
    return 'low';
  }

  if (
    meters <=
    reorderLevel * 1.5
  ) {
    return 'watch';
  }

  return 'ok';
}


/**
 * Sum meters moved on a given ISO date
 * from ledger entries.
 */
export function ledgerMetersOnDate(
  ledger,
  type,
  isoDate
) {

  return ledger
    .filter(
      (l) =>
        l.type === type &&
        l.timestamp &&
        l.timestamp.slice(
          0,
          10
        ) === isoDate
    )
    .reduce(
      (sum, l) =>
        sum +
        (
          Number(
            l.meters
          ) || 0
        ),
      0
    );
}


/**
 * Trailing daily outward velocity
 * for a product over N days.
 *
 * The calculation uses the full requested
 * window, making the forecast conservative.
 */
export function trailingVelocity(
  ledger,
  productId,
  days = 90
) {

  const cutoff =
    Date.now() -
    days *
      86400000;


  const outward =
    ledger.filter(
      (l) =>
        l.type === 'OUTWARD' &&
        Number(
          l.productId
        ) ===
          Number(
            productId
          ) &&
        l.timestamp &&
        new Date(
          l.timestamp
        ).getTime() >= cutoff
    );


  const totalMeters =
    outward.reduce(
      (sum, l) =>
        sum +
        (
          Number(
            l.meters
          ) || 0
        ),
      0
    );


  /*
   * Average over the full window.
   *
   * Example:
   * 900m sold in 90 days
   * = 10m/day
   */
  return (
    totalMeters /
    Math.max(
      1,
      days
    )
  );
}


/**
 * Simple linear demand forecast.
 *
 * Assumes the trailing velocity continues
 * unchanged.
 */
export function forecastDemand(
  ledger,
  productId
) {

  const dailyVelocity =
    trailingVelocity(
      ledger,
      productId,
      90
    );


  return {

    dailyVelocity,

    d30:
      dailyVelocity *
      30,

    d60:
      dailyVelocity *
      60,

    d90:
      dailyVelocity *
      90,

  };
}


/**
 * Number of days of stock remaining.
 */
export function daysOfCoverLeft(
  meters,
  dailyVelocity
) {

  if (
    dailyVelocity <= 0
  ) {
    return Infinity;
  }

  return (
    meters /
    dailyVelocity
  );
}


/**
 * ABC classification based on
 * trailing 90-day outward revenue proxy:
 *
 * meters sold × rate per meter
 *
 * A = first 70%
 * B = next 20%
 * C = remaining 10%
 */
export function abcClassification(
  products,
  ledger,
  days = 90
) {

  const cutoff =
    Date.now() -
    days *
      86400000;


  const usage =
    products.map(
      (product) => {

        const meters =
          ledger
            .filter(
              (l) =>
                l.type ===
                  'OUTWARD' &&
                Number(
                  l.productId
                ) ===
                  Number(
                    product.id
                  ) &&
                l.timestamp &&
                new Date(
                  l.timestamp
                ).getTime() >=
                  cutoff
            )
            .reduce(
              (sum, l) =>
                sum +
                (
                  Number(
                    l.meters
                  ) || 0
                ),
              0
            );


        const value =
          meters *
          (
            Number(
              product.ratePerMeter
            ) || 0
          );


        return {
          product,
          meters,
          value,
        };

      }
    );


  const sorted =
    [...usage].sort(
      (a, b) =>
        b.value -
        a.value
    );


  const totalValue =
    sorted.reduce(
      (sum, item) =>
        sum +
        item.value,
      0
    ) || 1;


  let cumulativeValue = 0;


  return sorted.map(
    (item) => {

      cumulativeValue +=
        item.value;


      const cumulativePercentage =
        cumulativeValue /
        totalValue;


      let grade = 'C';


      if (
        cumulativePercentage <=
        0.7
      ) {

        grade = 'A';

      } else if (
        cumulativePercentage <=
        0.9
      ) {

        grade = 'B';

      }


      return {

        ...item,

        grade,

        pctOfValue:
          item.value /
          totalValue,

      };

    }
  );
}


/**
 * Products with no outward movement
 * for N days.
 *
 * These are considered dead/slow stock.
 */
export function deadStock(
  products,
  rolls,
  ledger,
  thresholdDays = 60
) {

  return products

    .map(
      (product) => {

        const outward =
          ledger
            .filter(
              (l) =>
                l.type ===
                  'OUTWARD' &&
                Number(
                  l.productId
                ) ===
                  Number(
                    product.id
                  )
            )
            .sort(
              (a, b) =>
                new Date(
                  b.timestamp
                ) -
                new Date(
                  a.timestamp
                )
            )[0];


        const idleDays =
          outward
            ? daysAgo(
                outward.timestamp
              )
            : Infinity;


        return {

          product,

          meters:
            stockMeters(
              rolls,
              product.id
            ),

          idleDays,

          lastOutward:
            outward
              ? outward.timestamp
              : null,

        };

      }
    )

    .filter(
      (row) =>
        row.meters > 0 &&
        row.idleDays >=
          thresholdDays
    )

    .sort(
      (a, b) =>
        b.idleDays -
        a.idleDays
    );
}


/**
 * Purchase recommendations.
 *
 * Suggests enough stock to cover
 * approximately 60 days of forecast demand.
 */
export function purchaseRecommendations(
  products,
  rolls,
  ledger
) {

  return products

    .map(
      (product) => {

        const meters =
          stockMeters(
            rolls,
            product.id
          );


        const forecast =
          forecastDemand(
            ledger,
            product.id
          );


        const coverDays =
          daysOfCoverLeft(
            meters,
            forecast.dailyVelocity
          );


        const suggestedOrderMeters =
          Math.max(
            0,
            Math.round(
              forecast.d60 -
              meters
            )
          );


        return {

          product,

          meters,

          ...forecast,

          coverDays,

          suggestedOrderMeters,

        };

      }
    )

    .filter(
      (row) =>
        row.meters <=
          (
            Number(
              row.product
                .reorderLevel
            ) || 0
          ) ||
        row.coverDays < 30
    )

    .sort(
      (a, b) =>
        a.coverDays -
        b.coverDays
    );
}


/**
 * Format meters using Indian number formatting.
 */
export function formatMeters(
  meters
) {

  return `${(
    Number(
      meters
    ) || 0
  ).toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 1,
    }
  )} m`;
}


/**
 * Format currency using Indian
 * number formatting.
 */
export function formatCurrency(
  amount
) {

  return `₹${(
    Number(
      amount
    ) || 0
  ).toLocaleString(
    'en-IN',
    {
      maximumFractionDigits: 0,
    }
  )}`;
}