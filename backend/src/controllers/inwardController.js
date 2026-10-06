const XLSX = require('xlsx');
const pool = require('../config/db');


// ============================================================
// CONSTANTS
// ============================================================

const REQUIRED_HEADERS = [
    'Category',
    'SKU',
    'Product Name',
    'Color',
    'Width (CM)',
    'Roll Length (m)',
    'Batch',
    'Supplier',
];

const ESSENTIAL_RATE = 310;
const PREMIUM_RATE = 500;


// ============================================================
// GENERAL HELPERS
// ============================================================

function clean(value) {
    return String(
        value ?? ''
    ).trim();
}


function normalizeText(value) {
    return clean(value)
        .replace(/\s+/g, ' ')
        .toLowerCase();
}


function normalizeSku(value) {
    return clean(value)
        .toLowerCase();
}


function normalizeCategory(value) {

    const category =
        clean(value).toUpperCase();

    if (
        category !== 'ESSENTIAL' &&
        category !== 'PREMIUM'
    ) {
        throw new Error(
            'Product category must be ESSENTIAL or PREMIUM.'
        );
    }

    return category;
}


function parseNumber(value) {

    if (
        typeof value === 'number' &&
        Number.isFinite(value)
    ) {
        return value;
    }

    if (
        typeof value === 'string' &&
        value.trim() !== ''
    ) {

        const parsed =
            Number(
                value.trim()
            );

        if (
            Number.isFinite(parsed)
        ) {
            return parsed;
        }
    }

    return NaN;
}


function getRateForCategory(
    category
) {

    return category === 'PREMIUM'
        ? PREMIUM_RATE
        : ESSENTIAL_RATE;
}


function headersMatch(
    headers
) {

    if (
        !Array.isArray(headers) ||
        headers.length !==
            REQUIRED_HEADERS.length
    ) {
        return false;
    }

    return headers.every(
        (
            header,
            index
        ) =>
            normalizeText(header) ===
            normalizeText(
                REQUIRED_HEADERS[index]
            )
    );
}


function generateTransactionNumber(
    lastTransactionRows
) {

    let nextNumber = 1;

    if (
        Array.isArray(
            lastTransactionRows
        ) &&
        lastTransactionRows.length > 0
    ) {

        const lastNumber =
            String(
                lastTransactionRows[0]
                    .transaction_number ||
                ''
            );

        const match =
            lastNumber.match(
                /IN-(\d+)/
            );

        if (match) {

            nextNumber =
                Number(
                    match[1]
                ) + 1;
        }
    }

    return `IN-${String(
        nextNumber
    ).padStart(
        5,
        '0'
    )}`;
}


// ============================================================
// PARSE NEW EXCEL FORMAT
//
// Sheet: Import
//
// Category
// SKU
// Product Name
// Color
// Width (CM)
// Roll Length (m)
// Batch
// Supplier
//
// IMPORTANT:
// Supplier column is informational only.
// The supplier selected in the Inward UI is authoritative.
// ============================================================

function parseExcelWorkbook(
    buffer
) {

    const workbook =
        XLSX.read(
            buffer,
            {
                type: 'buffer',
                raw: true,
                cellDates: false,
            }
        );


    // ----------------------------------------------------------
    // REQUIRED SHEET
    // ----------------------------------------------------------

    const sheet =
        workbook.Sheets[
            'Import'
        ];


    if (!sheet) {

        throw new Error(
            'Invalid workbook. Expected a sheet named "Import".'
        );
    }


    // ----------------------------------------------------------
    // RAW ROWS
    // ----------------------------------------------------------

    const rows =
        XLSX.utils.sheet_to_json(
            sheet,
            {
                header: 1,
                defval: '',
                raw: true,
                blankrows: true,
            }
        );


    if (
        !rows ||
        rows.length === 0
    ) {

        throw new Error(
            'The Import sheet is empty.'
        );
    }


    // ----------------------------------------------------------
    // HEADERS
    // ----------------------------------------------------------

    const headers =
        rows[0] || [];


    if (
        !headersMatch(
            headers
        )
    ) {

        throw new Error(
            `Invalid Excel headers.\n\nExpected exactly:\n${REQUIRED_HEADERS.join(
                ' | '
            )}`
        );
    }


    // ----------------------------------------------------------
    // DATA
    // ----------------------------------------------------------

    const dataRows =
        rows.slice(1);


    if (
        dataRows.length === 0
    ) {

        throw new Error(
            'The Import sheet contains no roll rows.'
        );
    }


    const importedRows = [];

    const productMap =
        new Map();

    const errors = [];


    // ----------------------------------------------------------
    // PROCESS EACH ROW
    // ----------------------------------------------------------

    dataRows.forEach(
        (
            rawRow,
            index
        ) => {

            const excelRow =
                index + 2;


            const row =
                Array.isArray(
                    rawRow
                )
                    ? rawRow
                    : [];


            const hasValue =
                row.some(
                    (value) =>
                        clean(value) !== ''
                );


            if (!hasValue) {

                errors.push(
                    `Row ${excelRow}: Empty row is not allowed.`
                );

                return;
            }


            // --------------------------------------------------
            // READ CELLS
            // --------------------------------------------------

            const category =
                clean(
                    row[0]
                ).toUpperCase();


            const sku =
                clean(
                    row[1]
                );


            const productName =
                clean(
                    row[2]
                );


            const color =
                clean(
                    row[3]
                );


            const width =
                parseNumber(
                    row[4]
                );


            const rollLength =
                parseNumber(
                    row[5]
                );


            const batch =
                clean(
                    row[6]
                );


            // Supplier is deliberately NOT used.
            // Supplier is selected manually in the UI.


            // --------------------------------------------------
            // CATEGORY
            // --------------------------------------------------

            if (
                category !==
                    'ESSENTIAL' &&
                category !==
                    'PREMIUM'
            ) {

                errors.push(
                    `Row ${excelRow}: Category must be ESSENTIAL or PREMIUM.`
                );

                return;
            }


            // --------------------------------------------------
            // SKU
            // --------------------------------------------------

            if (!sku) {

                errors.push(
                    `Row ${excelRow}: SKU is required.`
                );

                return;
            }


            // --------------------------------------------------
            // PRODUCT NAME
            // --------------------------------------------------

            if (!productName) {

                errors.push(
                    `Row ${excelRow}: Product Name is required.`
                );

                return;
            }


            // --------------------------------------------------
            // WIDTH
            // --------------------------------------------------

            if (
                !Number.isFinite(
                    width
                ) ||
                width <= 0
            ) {

                errors.push(
                    `Row ${excelRow}: Width (CM) must be greater than 0.`
                );

                return;
            }


            // --------------------------------------------------
            // ROLL LENGTH
            // --------------------------------------------------

            if (
                !Number.isFinite(
                    rollLength
                ) ||
                rollLength <= 0
            ) {

                errors.push(
                    `Row ${excelRow}: Roll Length (m) must be greater than 0.`
                );

                return;
            }


            const skuKey =
                normalizeSku(
                    sku
                );


            // --------------------------------------------------
            // SAME SKU CONSISTENCY
            // --------------------------------------------------

            if (
                productMap.has(
                    skuKey
                )
            ) {

                const existing =
                    productMap.get(
                        skuKey
                    );


                if (
                    existing.category !==
                    category
                ) {

                    errors.push(
                        `Row ${excelRow}: SKU ${sku} has conflicting categories.`
                    );

                    return;
                }


                if (
                    normalizeText(
                        existing.name
                    ) !==
                    normalizeText(
                        productName
                    )
                ) {

                    errors.push(
                        `Row ${excelRow}: Product Name for SKU ${sku} does not match the other rows for this SKU.`
                    );

                    return;
                }


                if (
                    normalizeText(
                        existing.color
                    ) !==
                    normalizeText(
                        color
                    )
                ) {

                    errors.push(
                        `Row ${excelRow}: Color for SKU ${sku} does not match the other rows for this SKU.`
                    );

                    return;
                }


                if (
                    Number(
                        existing.width
                    ) !==
                    Number(
                        width
                    )
                ) {

                    errors.push(
                        `Row ${excelRow}: Width for SKU ${sku} does not match the other rows for this SKU.`
                    );

                    return;
                }


                existing.rolls += 1;

                existing.meters +=
                    rollLength;

            } else {

                productMap.set(
                    skuKey,
                    {

                        sku,

                        name:
                            productName,

                        category,

                        color,

                        width,

                        ratePerMeter:
                            getRateForCategory(
                                category
                            ),

                        rolls:
                            1,

                        meters:
                            rollLength,

                    }
                );
            }


            // --------------------------------------------------
            // ADD ROLL
            // --------------------------------------------------

            importedRows.push({

                excelRow,

                category,

                sku,

                name:
                    productName,

                color,

                width,

                length:
                    rollLength,

                batch:
                    batch || null,

                ratePerMeter:
                    getRateForCategory(
                        category
                    ),

            });

        }
    );


    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (
        errors.length > 0
    ) {

        const errorText =
            errors
                .slice(
                    0,
                    30
                )
                .join(
                    '\n'
                );


        const more =
            errors.length > 30
                ? `\n...and ${
                    errors.length - 30
                } more error(s).`
                : '';


        throw new Error(
            `Excel validation failed:\n${errorText}${more}`
        );
    }


    if (
        importedRows.length === 0
    ) {

        throw new Error(
            'No valid roll rows found.'
        );
    }


    // ----------------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------------

    const essentialRows =
        importedRows.filter(
            (row) =>
                row.category ===
                'ESSENTIAL'
        );


    const premiumRows =
        importedRows.filter(
            (row) =>
                row.category ===
                'PREMIUM'
        );


    const totalMeters =
        importedRows.reduce(
            (
                total,
                row
            ) =>
                total +
                Number(
                    row.length
                ),
            0
        );


    const essentialMeters =
        essentialRows.reduce(
            (
                total,
                row
            ) =>
                total +
                Number(
                    row.length
                ),
            0
        );


    const premiumMeters =
        premiumRows.reduce(
            (
                total,
                row
            ) =>
                total +
                Number(
                    row.length
                ),
            0
        );


    return {

        importedRows,

        productGroups:
            productMap,

        summary: {

            totalRolls:
                importedRows.length,

            totalMeters,

            totalProducts:
                productMap.size,

            essentialRolls:
                essentialRows.length,

            essentialMeters,

            premiumRolls:
                premiumRows.length,

            premiumMeters,

        },

        validation: {

            valid:
                true,

            errorCount:
                0,

            errors: [],

        },

    };
}


// ============================================================
// NORMAL MANUAL INWARD
// ============================================================

const createInward =
    async (
        req,
        res
    ) => {

        const connection =
            await pool.getConnection();


        try {

            const {
                supplierId,
                userId,
                notes,
                rolls,
            } = req.body;


            // --------------------------------------------------
            // BASIC VALIDATION
            // --------------------------------------------------

            if (!supplierId) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        'Supplier is required.',

                });
            }


            if (!userId) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        'User is required.',

                });
            }


            if (
                !Array.isArray(
                    rolls
                ) ||
                rolls.length === 0
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        'At least one roll is required.',

                });
            }


            // --------------------------------------------------
            // SUPPLIER
            // --------------------------------------------------

            const [
                supplierRows,
            ] =
                await connection.query(
                    `
                    SELECT id
                    FROM suppliers
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [
                        Number(
                            supplierId
                        ),
                    ]
                );


            if (
                supplierRows.length ===
                0
            ) {

                throw new Error(
                    'Supplier not found.'
                );
            }


            // --------------------------------------------------
            // USER
            // --------------------------------------------------

            const [
                userRows,
            ] =
                await connection.query(
                    `
                    SELECT id
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [
                        Number(
                            userId
                        ),
                    ]
                );


            if (
                userRows.length ===
                0
            ) {

                throw new Error(
                    'User not found.'
                );
            }


            // --------------------------------------------------
            // START TRANSACTION
            // --------------------------------------------------

            await connection.beginTransaction();


            // --------------------------------------------------
            // TRANSACTION NUMBER
            // --------------------------------------------------

            const [
                lastTransactionRows,
            ] =
                await connection.query(
                    `
                    SELECT
                        transaction_number
                    FROM transactions
                    WHERE transaction_type =
                        'INWARD'
                    ORDER BY id DESC
                    LIMIT 1
                    FOR UPDATE
                    `
                );


            const transactionNumber =
                generateTransactionNumber(
                    lastTransactionRows
                );


            // --------------------------------------------------
            // CREATE TRANSACTION
            // --------------------------------------------------

            const [
                transactionResult,
            ] =
                await connection.query(
                    `
                    INSERT INTO transactions
                        (
                            transaction_number,
                            transaction_type,
                            supplier_id,
                            user_id,
                            notes,
                            source_type,
                            source_file
                        )
                    VALUES
                        (
                            ?,
                            'INWARD',
                            ?,
                            ?,
                            ?,
                            'MANUAL',
                            NULL
                        )
                    `,
                    [
                        transactionNumber,

                        Number(
                            supplierId
                        ),

                        Number(
                            userId
                        ),

                        notes ||
                            null,
                    ]
                );


            const transactionId =
                transactionResult.insertId;


            const createdRolls = [];
            const createdProducts = [];

            const newProductMap =
                new Map();


            // --------------------------------------------------
            // CREATE ROLLS
            // --------------------------------------------------

            for (
                let index = 0;
                index < rolls.length;
                index++
            ) {

                const roll =
                    rolls[index];


                const length =
                    parseNumber(
                        roll.length
                    );


                if (
                    !Number.isFinite(
                        length
                    ) ||
                    length <= 0
                ) {

                    throw new Error(
                        `Invalid roll length at roll ${
                            index + 1
                        }.`
                    );
                }


                let productId =
                    Number(
                        roll.productId
                    );


                // ------------------------------------------------
                // EXISTING PRODUCT
                // ------------------------------------------------

                if (
                    Number.isInteger(
                        productId
                    ) &&
                    productId > 0
                ) {

                    const [
                        productRows,
                    ] =
                        await connection.query(
                            `
                            SELECT id
                            FROM products
                            WHERE id = ?
                            LIMIT 1
                            `,
                            [
                                productId,
                            ]
                        );


                    if (
                        productRows.length ===
                        0
                    ) {

                        throw new Error(
                            `Product ${
                                productId
                            } not found.`
                        );
                    }


                }


                // ------------------------------------------------
                // NEW PRODUCT
                // ------------------------------------------------

                else {

                    const newProduct =
                        roll.newProduct;


                    if (
                        !newProduct ||
                        typeof newProduct !==
                            'object'
                    ) {

                        throw new Error(
                            `Roll ${
                                index + 1
                            } must contain a valid product.`
                        );
                    }


                    const sku =
                        clean(
                            newProduct.sku
                        );


                    const skuKey =
                        normalizeSku(
                            sku
                        );


                    // Reuse product created earlier
                    // in the same request.

                    if (
                        newProductMap.has(
                            skuKey
                        )
                    ) {

                        productId =
                            newProductMap.get(
                                skuKey
                            );

                    } else {

                        const name =
                            clean(
                                newProduct.name
                            );


                        const color =
                            clean(
                                newProduct.color
                            );


                        const category =
                            normalizeCategory(
                                newProduct.category ||
                                'ESSENTIAL'
                            );


                        const width =
                            parseNumber(
                                newProduct.width ??
                                newProduct.width_cm
                            );


                        const rate =
                            parseNumber(
                                newProduct.ratePerMeter ??
                                newProduct.rate_per_meter
                            );


                        const reorderLevel =
                            parseNumber(
                                newProduct.reorderLevel ??
                                newProduct.reorder_level ??
                                0
                            );


                        if (!sku) {

                            throw new Error(
                                'New product SKU is required.'
                            );
                        }


                        if (!name) {

                            throw new Error(
                                'New product name is required.'
                            );
                        }


                        if (!color) {

                            throw new Error(
                                'New product colour is required.'
                            );
                        }


                        if (
                            !Number.isFinite(
                                width
                            ) ||
                            width <= 0
                        ) {

                            throw new Error(
                                'New product width must be greater than 0.'
                            );
                        }


                        if (
                            !Number.isFinite(
                                rate
                            ) ||
                            rate < 0
                        ) {

                            throw new Error(
                                'New product rate must be valid.'
                            );
                        }


                        if (
                            !Number.isFinite(
                                reorderLevel
                            ) ||
                            reorderLevel < 0
                        ) {

                            throw new Error(
                                'New product reorder level must be valid.'
                            );
                        }


                        const [
                            existingSkuRows,
                        ] =
                            await connection.query(
                                `
                                SELECT id
                                FROM products
                                WHERE LOWER(sku) =
                                    LOWER(?)
                                LIMIT 1
                                `,
                                [
                                    sku,
                                ]
                            );


                        if (
                            existingSkuRows.length >
                            0
                        ) {

                            throw new Error(
                                `SKU ${sku} already exists. Select the existing product instead.`
                            );
                        }


                        const [
                            productResult,
                        ] =
                            await connection.query(
                                `
                                INSERT INTO products
                                    (
                                        sku,
                                        name,
                                        category,
                                        color,
                                        width_cm,
                                        rate_per_meter,
                                        reorder_level
                                    )
                                VALUES
                                    (?, ?, ?, ?, ?, ?, ?)
                                `,
                                [

                                    sku,

                                    name,

                                    category,

                                    color,

                                    width,

                                    rate,

                                    reorderLevel,

                                ]
                            );


                        productId =
                            productResult.insertId;


                        newProductMap.set(
                            skuKey,
                            productId
                        );


                        createdProducts.push({

                            id:
                                productId,

                            sku,

                            name,

                            category,

                            color,

                            width,

                            ratePerMeter:
                                rate,

                            reorderLevel,

                        });
                    }
                }


                // ------------------------------------------------
                // ROLL ID
                // ------------------------------------------------

                const generatedRollId =
                    `${transactionNumber}-${String(
                        index + 1
                    ).padStart(
                        3,
                        '0'
                    )}-${Date.now()}-${Math.floor(
                        Math.random() * 100000
                    )}`;


                // ------------------------------------------------
                // INSERT ROLL
                // ------------------------------------------------

                const [
                    rollResult,
                ] =
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
                                NOW()
                            )
                        `,
                        [

                            generatedRollId,

                            productId,

                            length,

                            length,

                            clean(
                                roll.batch
                            ) ||
                                null,

                            clean(
                                roll.rack
                            ) ||
                                null,

                            clean(
                                roll.bin
                            ) ||
                                null,

                            Number(
                                supplierId
                            ),

                        ]
                    );


                const rollDatabaseId =
                    rollResult.insertId;


                // ------------------------------------------------
                // TRANSACTION ITEM
                // ------------------------------------------------

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

                        rollDatabaseId,

                        length,

                    ]
                );


                createdRolls.push({

                    id:
                        rollDatabaseId,

                    rollId:
                        generatedRollId,

                    productId,

                    length,

                });

            }


            await connection.commit();


            const totalMeters =
                createdRolls.reduce(
                    (
                        total,
                        roll
                    ) =>
                        total +
                        Number(
                            roll.length
                        ),
                    0
                );


            return res.status(
                201
            ).json({

                success:
                    true,

                message:
                    'Inward completed successfully.',

                transactionId,

                transactionNumber,

                createdProducts,

                createdRolls,

                totalRolls:
                    createdRolls.length,

                totalMeters,

            });


        } catch (error) {

            try {
                await connection.rollback();
            } catch (_) {}


            console.error(
                'Inward transaction failed:',
                error
            );


            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    error.message ||
                    'Inward transaction failed.',

            });


        } finally {

            connection.release();

        }
    };


// ============================================================
// PREVIEW EXCEL INWARD
//
// Supplier is NOT read from Excel.
// The supplier selected on the Inward page is used.
// ============================================================

const previewExcelInward =
    async (
        req,
        res
    ) => {

        let connection = null;


        try {

            if (!req.file) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        'Please upload an Excel file.',

                });
            }


            const supplierId =
                Number(
                    req.body.supplierId
                );


            if (
                !Number.isInteger(
                    supplierId
                ) ||
                supplierId <= 0
            ) {

                throw new Error(
                    'Please select a supplier.'
                );
            }


            const parsed =
                parseExcelWorkbook(
                    req.file.buffer
                );


            connection =
                await pool.getConnection();


            // --------------------------------------------------
            // VALIDATE SELECTED SUPPLIER
            // --------------------------------------------------

            const [
                supplierRows,
            ] =
                await connection.query(
                    `
                    SELECT
                        id,
                        name
                    FROM suppliers
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [
                        supplierId,
                    ]
                );


            if (
                supplierRows.length ===
                0
            ) {

                throw new Error(
                    'Selected supplier was not found.'
                );
            }


            // --------------------------------------------------
            // EXISTING / NEW SKU CHECK
            // --------------------------------------------------

            const existingProducts = [];
            const newProducts = [];


            for (
                const product
                    of parsed.productGroups.values()
            ) {

                const [
                    rows,
                ] =
                    await connection.query(
                        `
                        SELECT
                            id,
                            sku,
                            name,
                            category,
                            color,
                            width_cm,
                            rate_per_meter,
                            reorder_level
                        FROM products
                        WHERE LOWER(sku) =
                            LOWER(?)
                        LIMIT 1
                        `,
                        [
                            product.sku,
                        ]
                    );


                if (
                    rows.length ===
                    0
                ) {

                    newProducts.push({

                        sku:
                            product.sku,

                        name:
                            product.name,

                        category:
                            product.category,

                        color:
                            product.color,

                        width:
                            product.width,

                        ratePerMeter:
                            product.ratePerMeter,

                        incomingRolls:
                            product.rolls,

                        incomingMeters:
                            product.meters,

                    });

                    continue;
                }


                const existing =
                    rows[0];


                // ------------------------------------------------
                // CATEGORY
                // ------------------------------------------------

                if (
                    normalizeCategory(
                        existing.category ||
                        'ESSENTIAL'
                    ) !==
                    product.category
                ) {

                    throw new Error(
                        `SKU ${product.sku} already exists as ${existing.category}, but Excel says ${product.category}.`
                    );
                }


                // ------------------------------------------------
                // NAME
                // ------------------------------------------------

                if (
                    normalizeText(
                        existing.name
                    ) !==
                    normalizeText(
                        product.name
                    )
                ) {

                    throw new Error(
                        `SKU ${product.sku}: Product Name does not match Product Master.`
                    );
                }


                // ------------------------------------------------
                // WIDTH
                // ------------------------------------------------

                if (
                    Number(
                        existing.width_cm
                    ) !==
                    Number(
                        product.width
                    )
                ) {

                    throw new Error(
                        `SKU ${product.sku}: Width does not match Product Master.`
                    );
                }


                // ------------------------------------------------
                // COLOR
                //
                // Blank Excel colour is allowed.
                // ------------------------------------------------

                if (
                    product.color &&
                    normalizeText(
                        existing.color
                    ) !==
                    normalizeText(
                        product.color
                    )
                ) {

                    throw new Error(
                        `SKU ${product.sku}: Color does not match Product Master.`
                    );
                }


                existingProducts.push({

                    id:
                        existing.id,

                    sku:
                        existing.sku,

                    name:
                        existing.name,

                    category:
                        existing.category,

                    color:
                        existing.color,

                    width:
                        existing.width_cm,

                    ratePerMeter:
                        existing.rate_per_meter,

                    reorderLevel:
                        existing.reorder_level,

                    incomingRolls:
                        product.rolls,

                    incomingMeters:
                        product.meters,

                });

            }


            return res.json({

                success:
                    true,

                dryRun:
                    true,

                filename:
                    req.file.originalname,

                supplier: {

                    id:
                        supplierRows[0].id,

                    name:
                        supplierRows[0].name,

                },

                summary:
                    parsed.summary,

                validation:
                    parsed.validation,

                newProducts,

                existingProducts,

                products:
                    Array.from(
                        parsed.productGroups.values()
                    ),

            });


        } catch (error) {

            console.error(
                'Excel inward preview failed:',
                error
            );


            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    error.message ||
                    'Excel preview failed.',

            });


        } finally {

            if (connection) {
                connection.release();
            }

        }
    };


// ============================================================
// CREATE EXCEL INWARD
//
// SUPPLIER:
// The supplier selected manually on the Inward page is used
// for every roll.
//
// Excel Supplier column is ignored.
// ============================================================

const createExcelInward =
    async (
        req,
        res
    ) => {

        const connection =
            await pool.getConnection();


        try {

            if (!req.file) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        'Please upload an Excel file.',

                });
            }


            const supplierId =
                Number(
                    req.body.supplierId
                );


            const userId =
                Number(
                    req.body.userId
                );


            if (
                !Number.isInteger(
                    supplierId
                ) ||
                supplierId <= 0
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        'Supplier is required.',

                });
            }


            if (
                !Number.isInteger(
                    userId
                ) ||
                userId <= 0
            ) {

                return res.status(
                    400
                ).json({

                    success:
                        false,

                    message:
                        'User is required.',

                });
            }


            // --------------------------------------------------
            // PARSE ENTIRE FILE BEFORE WRITING
            // --------------------------------------------------

            const parsed =
                parseExcelWorkbook(
                    req.file.buffer
                );


            await connection.beginTransaction();


            // --------------------------------------------------
            // SUPPLIER
            // --------------------------------------------------

            const [
                supplierRows,
            ] =
                await connection.query(
                    `
                    SELECT
                        id,
                        name
                    FROM suppliers
                    WHERE id = ?
                    LIMIT 1
                    FOR UPDATE
                    `,
                    [
                        supplierId,
                    ]
                );


            if (
                supplierRows.length ===
                0
            ) {

                throw new Error(
                    'Supplier not found.'
                );
            }


            // --------------------------------------------------
            // USER
            // --------------------------------------------------

            const [
                userRows,
            ] =
                await connection.query(
                    `
                    SELECT
                        id,
                        name
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    FOR UPDATE
                    `,
                    [
                        userId,
                    ]
                );


            if (
                userRows.length ===
                0
            ) {

                throw new Error(
                    'User not found.'
                );
            }


            // --------------------------------------------------
            // TRANSACTION NUMBER
            // --------------------------------------------------

            const [
                lastTransactionRows,
            ] =
                await connection.query(
                    `
                    SELECT
                        transaction_number
                    FROM transactions
                    WHERE transaction_type =
                        'INWARD'
                    ORDER BY id DESC
                    LIMIT 1
                    FOR UPDATE
                    `
                );


            const transactionNumber =
                generateTransactionNumber(
                    lastTransactionRows
                );


            // --------------------------------------------------
            // PRODUCT MAP
            // --------------------------------------------------

            const productIdMap =
                new Map();

            const createdProducts = [];


            // --------------------------------------------------
            // FIND / CREATE PRODUCTS
            // --------------------------------------------------

            for (
                const product
                    of parsed.productGroups.values()
            ) {

                const skuKey =
                    normalizeSku(
                        product.sku
                    );


                const [
                    existingRows,
                ] =
                    await connection.query(
                        `
                        SELECT
                            id,
                            sku,
                            name,
                            category,
                            color,
                            width_cm,
                            rate_per_meter,
                            reorder_level
                        FROM products
                        WHERE LOWER(sku) =
                            LOWER(?)
                        LIMIT 1
                        FOR UPDATE
                        `,
                        [
                            product.sku,
                        ]
                    );


                // ------------------------------------------------
                // EXISTING PRODUCT
                // ------------------------------------------------

                if (
                    existingRows.length >
                    0
                ) {

                    const existing =
                        existingRows[0];


                    const existingCategory =
                        normalizeCategory(
                            existing.category ||
                            'ESSENTIAL'
                        );


                    if (
                        existingCategory !==
                        product.category
                    ) {

                        throw new Error(
                            `SKU ${product.sku} already exists as ${existingCategory}, but Excel says ${product.category}.`
                        );
                    }


                    if (
                        normalizeText(
                            existing.name
                        ) !==
                        normalizeText(
                            product.name
                        )
                    ) {

                        throw new Error(
                            `SKU ${product.sku}: Product Name does not match Product Master.`
                        );
                    }


                    if (
                        Number(
                            existing.width_cm
                        ) !==
                        Number(
                            product.width
                        )
                    ) {

                        throw new Error(
                            `SKU ${product.sku}: Width does not match Product Master.`
                        );
                    }


                    if (
                        product.color &&
                        normalizeText(
                            existing.color
                        ) !==
                        normalizeText(
                            product.color
                        )
                    ) {

                        throw new Error(
                            `SKU ${product.sku}: Color does not match Product Master.`
                        );
                    }


                    productIdMap.set(
                        skuKey,
                        existing.id
                    );


                    continue;
                }


                // ------------------------------------------------
                // NEW PRODUCT
                // ------------------------------------------------

                const category =
                    normalizeCategory(
                        product.category
                    );


                const rate =
                    getRateForCategory(
                        category
                    );


                const [
                    result,
                ] =
                    await connection.query(
                        `
                        INSERT INTO products
                            (
                                sku,
                                name,
                                category,
                                color,
                                width_cm,
                                rate_per_meter,
                                reorder_level
                            )
                        VALUES
                            (?, ?, ?, ?, ?, ?, ?)
                        `,
                        [

                            product.sku,

                            product.name,

                            category,

                            product.color ||
                                null,

                            product.width,

                            rate,

                            0,

                        ]
                    );


                const productId =
                    result.insertId;


                productIdMap.set(
                    skuKey,
                    productId
                );


                createdProducts.push({

                    id:
                        productId,

                    sku:
                        product.sku,

                    name:
                        product.name,

                    category,

                    color:
                        product.color,

                    width:
                        product.width,

                    ratePerMeter:
                        rate,

                    reorderLevel:
                        0,

                });

            }


            // --------------------------------------------------
            // CREATE TRANSACTION
            // --------------------------------------------------

            const [
                transactionResult,
            ] =
                await connection.query(
                    `
                    INSERT INTO transactions
                        (
                            transaction_number,
                            transaction_type,
                            supplier_id,
                            user_id,
                            notes,
                            source_type,
                            source_file
                        )
                    VALUES
                        (
                            ?,
                            'INWARD',
                            ?,
                            ?,
                            ?,
                            'EXCEL',
                            ?
                        )
                    `,
                    [

                        transactionNumber,

                        supplierId,

                        userId,

                        req.body.notes ||
                            `Excel import: ${req.file.originalname}`,

                        req.file.originalname,

                    ]
                );


            const transactionId =
                transactionResult.insertId;


            // --------------------------------------------------
            // CREATE ROLLS
            // --------------------------------------------------

            const createdRolls = [];


            for (
                let index = 0;
                index <
                    parsed.importedRows.length;
                index++
            ) {

                const row =
                    parsed.importedRows[
                        index
                    ];


                const productId =
                    productIdMap.get(
                        normalizeSku(
                            row.sku
                        )
                    );


                if (!productId) {

                    throw new Error(
                        `Could not resolve product for SKU ${row.sku}.`
                    );
                }


                // ------------------------------------------------
                // ROLL ID
                // ------------------------------------------------

                const generatedRollId =
                    `${transactionNumber}-XLS-${String(
                        index + 1
                    ).padStart(
                        5,
                        '0'
                    )}`;


                // ------------------------------------------------
                // INSERT ROLL
                // ------------------------------------------------

                const [
                    rollResult,
                ] =
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
                                NULL,
                                NULL,
                                ?,
                                NOW()
                            )
                        `,
                        [

                            generatedRollId,

                            productId,

                            row.length,

                            row.length,

                            row.batch ||
                                null,

                            supplierId,

                        ]
                    );


                const rollDatabaseId =
                    rollResult.insertId;


                // ------------------------------------------------
                // TRANSACTION ITEM
                // ------------------------------------------------

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

                        rollDatabaseId,

                        row.length,

                    ]
                );


                createdRolls.push({

                    id:
                        rollDatabaseId,

                    rollId:
                        generatedRollId,

                    productId,

                    sku:
                        row.sku,

                    name:
                        row.name,

                    category:
                        row.category,

                    color:
                        row.color,

                    width:
                        row.width,

                    length:
                        row.length,

                    batch:
                        row.batch,

                });

            }


            // --------------------------------------------------
            // COMMIT
            // --------------------------------------------------

            await connection.commit();


            const totalMeters =
                createdRolls.reduce(
                    (
                        total,
                        roll
                    ) =>
                        total +
                        Number(
                            roll.length
                        ),
                    0
                );


            return res.status(
                201
            ).json({

                success:
                    true,

                message:
                    'Excel inward completed successfully.',

                filename:
                    req.file.originalname,

                supplier: {

                    id:
                        supplierRows[0].id,

                    name:
                        supplierRows[0].name,

                },

                transactionId,

                transactionNumber,

                createdProducts,

                totalProducts:
                    parsed.productGroups.size,

                totalNewProducts:
                    createdProducts.length,

                createdRolls,

                totalRolls:
                    createdRolls.length,

                totalMeters,

                summary:
                    parsed.summary,

                validation:
                    parsed.validation,

            });


        } catch (error) {

            try {
                await connection.rollback();
            } catch (_) {}


            console.error(
                'Excel inward failed:',
                error
            );


            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    error.message ||
                    'Excel inward failed.',

            });


        } finally {

            connection.release();

        }
    };


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    createInward,
    createExcelInward,
    previewExcelInward,
};