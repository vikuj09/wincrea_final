const pool = require('../config/db');


// ============================================================
// GET ALL PURCHASE ORDERS
// ============================================================

async function getPurchaseOrders(req, res) {
  try {

    const [rows] = await pool.query(`
      SELECT
        po.id,
        po.po_number,
        po.supplier_id,
        s.name AS supplier_name,
        po.status,
        po.expected_date,
        po.notes,
        po.created_by,
        po.created_at,
        po.updated_at,

        poi.id AS item_id,
        poi.product_id,
        poi.ordered_meters,
        poi.received_meters,
        poi.rate_per_meter,

        p.sku,
        p.name AS product_name,
        p.color,
        p.width_cm

      FROM purchase_orders po

      INNER JOIN suppliers s
        ON s.id = po.supplier_id

      LEFT JOIN purchase_order_items poi
        ON poi.purchase_order_id = po.id

      LEFT JOIN products p
        ON p.id = poi.product_id

      ORDER BY po.id DESC, poi.id ASC
    `);


    // ----------------------------------------------------------
    // Group database rows by purchase order
    // ----------------------------------------------------------

    const purchaseOrders = [];

    for (const row of rows) {

      let po =
        purchaseOrders.find(
          (item) =>
            item.id === row.id
        );


      // --------------------------------------------------------
      // Create PO object
      // --------------------------------------------------------

      if (!po) {

        po = {

          id:
            row.id,

          po_number:
            row.po_number,

          supplier_id:
            row.supplier_id,

          supplier_name:
            row.supplier_name || '',

          status:
            row.status,

          expected_date:
            row.expected_date,

          notes:
            row.notes || null,

          created_by:
            row.created_by,

          created_at:
            row.created_at,

          updated_at:
            row.updated_at,

          ordered_meters:
            0,

          received_meters:
            0,

          items:
            [],
        };


        purchaseOrders.push(po);
      }


      // --------------------------------------------------------
      // Add PO item
      // --------------------------------------------------------

      if (row.item_id) {

        const orderedMeters =
          Number(
            row.ordered_meters || 0
          );

        const receivedMeters =
          Number(
            row.received_meters || 0
          );


        po.ordered_meters +=
          orderedMeters;

        po.received_meters +=
          receivedMeters;


        po.items.push({

          id:
            row.item_id,

          product_id:
            row.product_id,

          sku:
            row.sku || '',

          product_name:
            row.product_name || '',

          color:
            row.color || '',

          width_cm:
            Number(
              row.width_cm || 0
            ),

          ordered_meters:
            orderedMeters,

          received_meters:
            receivedMeters,

          rate_per_meter:
            row.rate_per_meter !== null
              ? Number(
                  row.rate_per_meter
                )
              : null,

        });
      }
    }


    res.json(
      purchaseOrders
    );

  } catch (error) {

    console.error(
      'Get purchase orders error:',
      error
    );

    res.status(500).json({

      success: false,

      message:
        'Failed to fetch purchase orders',

      error:
        error.message,

    });
  }
}


// ============================================================
// GET ONE PURCHASE ORDER
// ============================================================

async function getPurchaseOrderById(req, res) {

  try {

    const { id } =
      req.params;


    // ----------------------------------------------------------
    // Get PO
    // ----------------------------------------------------------

    const [orders] =
      await pool.query(
        `
        SELECT
          po.id,
          po.po_number,
          po.supplier_id,
          s.name AS supplier_name,
          po.status,
          po.expected_date,
          po.notes,
          po.created_by,
          po.created_at,
          po.updated_at

        FROM purchase_orders po

        INNER JOIN suppliers s
          ON s.id = po.supplier_id

        WHERE po.id = ?
        `,
        [id]
      );


    if (
      orders.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          'Purchase order not found',

      });
    }


    // ----------------------------------------------------------
    // Get PO items
    // ----------------------------------------------------------

    const [items] =
      await pool.query(
        `
        SELECT
          poi.id,
          poi.product_id,

          p.sku,
          p.name AS product_name,
          p.color,
          p.width_cm,

          poi.ordered_meters,
          poi.received_meters,
          poi.rate_per_meter

        FROM purchase_order_items poi

        INNER JOIN products p
          ON p.id = poi.product_id

        WHERE poi.purchase_order_id = ?

        ORDER BY poi.id
        `,
        [id]
      );


    res.json({

      ...orders[0],

      items,

    });

  } catch (error) {

    console.error(
      'Get purchase order error:',
      error
    );

    res.status(500).json({

      success: false,

      message:
        'Failed to fetch purchase order',

      error:
        error.message,

    });
  }
}


// ============================================================
// CREATE PURCHASE ORDER
// ============================================================

async function createPurchaseOrder(req, res) {

  const connection =
    await pool.getConnection();

  try {

    const {
      supplierId,
      expectedDate,
      notes,
      createdBy,
      items,
    } = req.body;


    // ----------------------------------------------------------
    // Validate supplier
    // ----------------------------------------------------------

    if (!supplierId) {

      return res.status(400).json({

        success: false,

        message:
          'supplierId is required',

      });
    }


    // ----------------------------------------------------------
    // Validate items
    // ----------------------------------------------------------

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          'At least one product is required',

      });
    }


    await connection.beginTransaction();


    // ----------------------------------------------------------
    // Check supplier
    // ----------------------------------------------------------

    const [suppliers] =
      await connection.query(
        `
        SELECT id
        FROM suppliers
        WHERE id = ?
        `,
        [supplierId]
      );


    if (
      suppliers.length === 0
    ) {

      await connection.rollback();

      return res.status(404).json({

        success: false,

        message:
          'Supplier not found',

      });
    }


    // ----------------------------------------------------------
    // Validate products
    // ----------------------------------------------------------

    for (
      const item of items
    ) {

      if (
        !item.productId ||
        item.quantityMeters === undefined ||
        item.quantityMeters === null
      ) {

        await connection.rollback();

        return res.status(400).json({

          success: false,

          message:
            'Each PO item requires productId and quantityMeters',

        });
      }


      const quantity =
        Number(
          item.quantityMeters
        );


      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {

        await connection.rollback();

        return res.status(400).json({

          success: false,

          message:
            'Quantity must be greater than 0',

        });
      }


      const [products] =
        await connection.query(
          `
          SELECT
            id,
            rate_per_meter
          FROM products
          WHERE id = ?
          `,
          [item.productId]
        );


      if (
        products.length === 0
      ) {

        await connection.rollback();

        return res.status(404).json({

          success: false,

          message:
            `Product ${item.productId} not found`,

        });
      }
    }


    // ----------------------------------------------------------
    // Generate PO number
    // ----------------------------------------------------------

    const [lastPO] =
      await connection.query(
        `
        SELECT po_number
        FROM purchase_orders
        ORDER BY id DESC
        LIMIT 1
        `
      );


    let nextNumber = 1;


    if (
      lastPO.length > 0
    ) {

      const match =
        String(
          lastPO[0].po_number
        ).match(
          /(\d+)$/
        );


      if (match) {

        nextNumber =
          Number(
            match[1]
          ) + 1;
      }
    }


    const poNumber =
      `PO-${String(
        nextNumber
      ).padStart(5, '0')}`;


    // ----------------------------------------------------------
    // Create PO
    // ----------------------------------------------------------

    const [poResult] =
      await connection.query(
        `
        INSERT INTO purchase_orders
        (
          po_number,
          supplier_id,
          status,
          expected_date,
          notes,
          created_by
        )
        VALUES
        (?, ?, 'DRAFT', ?, ?, ?)
        `,
        [
          poNumber,

          supplierId,

          expectedDate ||
            null,

          notes ||
            null,

          createdBy ||
            null,
        ]
      );


    const purchaseOrderId =
      poResult.insertId;


    // ----------------------------------------------------------
    // Create PO items
    // ----------------------------------------------------------

    for (
      const item of items
    ) {

      const [products] =
        await connection.query(
          `
          SELECT
            rate_per_meter
          FROM products
          WHERE id = ?
          `,
          [item.productId]
        );


      const productRate =
        products.length > 0
          ? Number(
              products[0]
                .rate_per_meter ||
              0
            )
          : 0;


      const rate =
        item.ratePerMeter !==
          undefined &&
        item.ratePerMeter !==
          null
          ? Number(
              item.ratePerMeter
            )
          : productRate;


      await connection.query(
        `
        INSERT INTO purchase_order_items
        (
          purchase_order_id,
          product_id,
          ordered_meters,
          received_meters,
          rate_per_meter
        )
        VALUES
        (?, ?, ?, 0, ?)
        `,
        [
          purchaseOrderId,

          Number(
            item.productId
          ),

          Number(
            item.quantityMeters
          ),

          rate,
        ]
      );
    }


    await connection.commit();


    res.status(201).json({

      success: true,

      message:
        'Purchase order created successfully',

      id:
        purchaseOrderId,

      poNumber,

    });

  } catch (error) {

    await connection.rollback();

    console.error(
      'Create purchase order error:',
      error
    );

    res.status(500).json({

      success: false,

      message:
        'Failed to create purchase order',

      error:
        error.message,

    });

  } finally {

    connection.release();
  }
}


// ============================================================
// UPDATE PO STATUS
// ============================================================

async function updatePurchaseOrderStatus(
  req,
  res
) {

  try {

    const { id } =
      req.params;

    const { status } =
      req.body;


    const allowedStatuses = [

      'DRAFT',

      'APPROVED',

      'ORDERED',

      'PARTIALLY_RECEIVED',

      'RECEIVED',

      'CANCELLED',

    ];


    if (
      !allowedStatuses.includes(
        status
      )
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Invalid purchase order status',

      });
    }


    const [result] =
      await pool.query(
        `
        UPDATE purchase_orders
        SET status = ?
        WHERE id = ?
        `,
        [
          status,
          id,
        ]
      );


    if (
      result.affectedRows === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          'Purchase order not found',

      });
    }


    res.json({

      success: true,

      message:
        'Purchase order status updated',

    });

  } catch (error) {

    console.error(
      'Update PO status error:',
      error
    );

    res.status(500).json({

      success: false,

      message:
        'Failed to update purchase order status',

      error:
        error.message,

    });
  }
}


// ============================================================
// RECEIVE PURCHASE ORDER
// ============================================================

async function receivePurchaseOrder(
  req,
  res
) {

  const connection =
    await pool.getConnection();


  try {

    const { id } =
      req.params;

    const {
      userId = 1,
      items,
      notes,
    } = req.body;


    // ----------------------------------------------------------
    // Validate request
    // ----------------------------------------------------------

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          'At least one item is required for receiving',

      });
    }


    await connection.beginTransaction();


    // ----------------------------------------------------------
    // Lock PO
    // ----------------------------------------------------------

    const [orders] =
      await connection.query(
        `
        SELECT *
        FROM purchase_orders
        WHERE id = ?
        FOR UPDATE
        `,
        [id]
      );


    if (
      orders.length === 0
    ) {

      await connection.rollback();

      return res.status(404).json({

        success: false,

        message:
          'Purchase order not found',

      });
    }


    const po =
      orders[0];


    // ----------------------------------------------------------
    // Validate PO status
    // ----------------------------------------------------------

    if (
      po.status ===
      'CANCELLED'
    ) {

      await connection.rollback();

      return res.status(400).json({

        success: false,

        message:
          'Cancelled purchase order cannot be received',

      });
    }


    if (
      po.status ===
      'RECEIVED'
    ) {

      await connection.rollback();

      return res.status(400).json({

        success: false,

        message:
          'Purchase order is already fully received',

      });
    }


    let totalReceivedThisTime =
      0;


    const createdRolls = [];


    // ----------------------------------------------------------
    // Process every PO item
    // ----------------------------------------------------------

    for (
      const receivedItem of items
    ) {

      const [poItems] =
        await connection.query(
          `
          SELECT
            poi.*,
            p.sku,
            p.name AS product_name

          FROM purchase_order_items poi

          INNER JOIN products p
            ON p.id = poi.product_id

          WHERE poi.id = ?
            AND poi.purchase_order_id = ?

          FOR UPDATE
          `,
          [
            receivedItem.itemId,
            id,
          ]
        );


      if (
        poItems.length === 0
      ) {

        await connection.rollback();

        return res.status(404).json({

          success: false,

          message:
            `PO item ${receivedItem.itemId} not found`,

        });
      }


      const poItem =
        poItems[0];


      // --------------------------------------------------------
      // Validate rolls
      // --------------------------------------------------------

      if (
        !Array.isArray(
          receivedItem.rolls
        ) ||
        receivedItem.rolls.length === 0
      ) {

        await connection.rollback();

        return res.status(400).json({

          success: false,

          message:
            `No rolls supplied for ${poItem.sku}`,

        });
      }


      const receivingMeters =
        receivedItem.rolls.reduce(
          (
            sum,
            roll
          ) =>
            sum +
            Number(
              roll.length || 0
            ),
          0
        );


      const remainingPOQuantity =
        Number(
          poItem.ordered_meters
        ) -
        Number(
          poItem.received_meters
        );


      // --------------------------------------------------------
      // Validate receiving quantity
      // --------------------------------------------------------

      if (
        receivingMeters <= 0
      ) {

        await connection.rollback();

        return res.status(400).json({

          success: false,

          message:
            `Receiving quantity must be greater than 0 for ${poItem.sku}`,

        });
      }


      if (
        receivingMeters >
        remainingPOQuantity
      ) {

        await connection.rollback();

        return res.status(400).json({

          success: false,

          message:
            `Receiving ${receivingMeters} m exceeds remaining PO quantity ` +
            `${remainingPOQuantity} m for ${poItem.sku}`,

        });
      }


      // --------------------------------------------------------
      // Create rolls for this PO item
      // --------------------------------------------------------

      for (
        const roll of receivedItem.rolls
      ) {

        const length =
          Number(
            roll.length
          );


        if (
          !Number.isFinite(
            length
          ) ||
          length <= 0
        ) {

          await connection.rollback();

          return res.status(400).json({

            success: false,

            message:
              'Every roll must have a valid length',

          });
        }


        const rollId =
          `RL-${Date.now()}-${Math.floor(
            Math.random() * 10000
          )}`;


        const [rollResult] =
          await connection.query(
            `
            INSERT INTO rolls
            (
              roll_id,
              product_id,
              original_length,
              remaining_length,
              status,
              batch,
              rack,
              bin,
              supplier_id,
              inward_date
            )
            VALUES
            (
              ?,
              ?,
              ?,
              ?,
              'AVAILABLE',
              ?,
              ?,
              ?,
              ?,
              CURRENT_TIMESTAMP
            )
            `,
            [
              rollId,

              poItem.product_id,

              length,

              length,

              roll.batch ||
                null,

              roll.rack ||
                null,

              roll.bin ||
                null,

              po.supplier_id,
            ]
          );


        // ------------------------------------------------------
        // Keep exact inserted roll ID
        // ------------------------------------------------------

        createdRolls.push({

          id:
            rollResult.insertId,

          rollId,

          productId:
            poItem.product_id,

          length,

          itemId:
            poItem.id,

        });
      }


      // --------------------------------------------------------
      // Update PO item received meters
      // --------------------------------------------------------

      const newReceivedMeters =
        Number(
          poItem.received_meters
        ) +
        receivingMeters;


      await connection.query(
        `
        UPDATE purchase_order_items
        SET received_meters = ?
        WHERE id = ?
        `,
        [
          newReceivedMeters,

          poItem.id,
        ]
      );


      totalReceivedThisTime +=
        receivingMeters;
    }


    // ----------------------------------------------------------
    // Create INWARD transaction
    // ----------------------------------------------------------

    const [
      lastTransactions
    ] =
      await connection.query(
        `
        SELECT transaction_number
        FROM transactions
        WHERE transaction_type = 'INWARD'
        ORDER BY id DESC
        LIMIT 1
        `
      );


    let nextTransactionNumber =
      1;


    if (
      lastTransactions.length > 0
    ) {

      const match =
        String(
          lastTransactions[0]
            .transaction_number
        ).match(
          /(\d+)$/
        );


      if (match) {

        nextTransactionNumber =
          Number(
            match[1]
          ) + 1;
      }
    }


    const transactionNumber =
      `IN-${String(
        nextTransactionNumber
      ).padStart(5, '0')}`;


    const [transactionResult] =
      await connection.query(
        `
        INSERT INTO transactions
        (
          transaction_number,
          transaction_type,
          supplier_id,
          user_id,
          notes
        )
        VALUES
        (
          ?,
          'INWARD',
          ?,
          ?,
          ?
        )
        `,
        [
          transactionNumber,

          po.supplier_id,

          userId,

          notes ||
            `Received against ${po.po_number}`,
        ]
      );


    const transactionId =
      transactionResult.insertId;


    // ----------------------------------------------------------
    // Link exact created rolls to transaction
    // ----------------------------------------------------------

    for (
      const roll of createdRolls
    ) {

      await connection.query(
        `
        INSERT INTO transaction_items
        (
          transaction_id,
          roll_id,
          quantity
        )
        VALUES
        (?, ?, ?)
        `,
        [
          transactionId,

          roll.id,

          roll.length,
        ]
      );
    }


    // ----------------------------------------------------------
    // Calculate PO totals
    // ----------------------------------------------------------

    const [totals] =
      await connection.query(
        `
        SELECT
          COALESCE(
            SUM(ordered_meters),
            0
          ) AS ordered_meters,

          COALESCE(
            SUM(received_meters),
            0
          ) AS received_meters

        FROM purchase_order_items

        WHERE purchase_order_id = ?
        `,
        [id]
      );


    const orderedMeters =
      Number(
        totals[0]
          .ordered_meters
      );


    const receivedMeters =
      Number(
        totals[0]
          .received_meters
      );


    // ----------------------------------------------------------
    // Determine new PO status
    // ----------------------------------------------------------

    let newStatus;


    if (
      receivedMeters >=
      orderedMeters
    ) {

      newStatus =
        'RECEIVED';

    } else if (
      receivedMeters > 0
    ) {

      newStatus =
        'PARTIALLY_RECEIVED';

    } else {

      newStatus =
        po.status;
    }


    // ----------------------------------------------------------
    // Update PO status
    // ----------------------------------------------------------

    await connection.query(
      `
      UPDATE purchase_orders
      SET status = ?
      WHERE id = ?
      `,
      [
        newStatus,

        id,
      ]
    );


    await connection.commit();


    // ----------------------------------------------------------
    // Response
    // ----------------------------------------------------------

    res.status(201).json({

      success: true,

      message:
        'Purchase order received successfully',

      purchaseOrderId:
        Number(id),

      poNumber:
        po.po_number,

      transactionId,

      transactionNumber,

      receivedThisTime:
        totalReceivedThisTime,

      orderedMeters,

      receivedMeters,

      status:
        newStatus,

      rolls:
        createdRolls.map(
          (roll) => ({

            id:
              roll.id,

            length:
              roll.length,

            productId:
              roll.productId,

            rollId:
              roll.rollId,

          })
        ),

    });

  } catch (error) {

    await connection.rollback();

    console.error(
      'Receive purchase order error:',
      error
    );

    res.status(500).json({

      success: false,

      message:
        'Failed to receive purchase order',

      error:
        error.message,

    });

  } finally {

    connection.release();
  }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  getPurchaseOrders,

  getPurchaseOrderById,

  createPurchaseOrder,

  updatePurchaseOrderStatus,

  receivePurchaseOrder,

};