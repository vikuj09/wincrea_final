const express = require('express');
const multer = require('multer');

const router = express.Router();

const {
    createInward,
    createExcelInward,
    previewExcelInward
} = require('../controllers/inwardController');


// ============================================================
// EXCEL UPLOAD CONFIG
// ============================================================

const upload = multer({

    storage:
        multer.memoryStorage(),

    limits: {
        fileSize:
            10 * 1024 * 1024
    },

    fileFilter: (
        req,
        file,
        cb
    ) => {

        const allowedExtensions = [
            '.xlsx',
            '.xls'
        ];

        const name =
            String(
                file.originalname || ''
            ).toLowerCase();

        const isExcel =
            allowedExtensions.some(
                (extension) =>
                    name.endsWith(
                        extension
                    )
            );

        if (!isExcel) {

            return cb(
                new Error(
                    'Only Excel files (.xlsx or .xls) are allowed.'
                )
            );

        }

        cb(null, true);

    }

});


// ============================================================
// NORMAL MANUAL INWARD
// ============================================================

router.post(
    '/',
    createInward
);


// ============================================================
// EXCEL PREVIEW
//
// Reads the Excel file and checks:
// - products
// - existing/new SKUs
// - rolls
// - meters
//
// DOES NOT modify the database.
// ============================================================

router.post(
    '/excel/preview',
    upload.single('file'),
    previewExcelInward
);


// ============================================================
// EXCEL ACTUAL IMPORT
//
// This will create products, rolls and the INWARD transaction.
// ============================================================

router.post(
    '/excel',
    upload.single('file'),
    createExcelInward
);


module.exports = router;