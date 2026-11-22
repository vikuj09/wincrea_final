
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// ============================================================
// CORS CONFIGURATION
// ============================================================

const defaultOrigins = [
    'https://vikuj.live',
    'https://www.vikuj.live',
    'https://wincrea-final.vercel.app',
];

const allowedOrigins = [
    ...new Set([
        ...defaultOrigins,
        ...(process.env.FRONTEND_URL || '')
            .split(',')
            .map((url) => url.trim().replace(/\/$/, ''))
            .filter(Boolean),
    ]),
];

console.log('Allowed frontend origins:', allowedOrigins);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests without an Origin header,
            // such as curl and server-to-server requests.
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.error(`Blocked CORS origin: ${origin}`);

            return callback(
                new Error(`CORS: origin ${origin} not allowed`)
            );
        },
        credentials: true,
    })
);

// ============================================================
// BODY PARSING
// ============================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// ROUTES
// ============================================================

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const productRoutes = require('./routes/productRoutes');
const rollRoutes = require('./routes/rollRoutes');
const inwardRoutes = require('./routes/inwardRoutes');
const outwardRoutes = require('./routes/outwardRoutes');
const returnRoutes = require('./routes/returnRoutes');
const adjustmentRoutes = require('./routes/adjustmentRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const proformaInvoiceRoutes = require('./routes/proformaInvoiceRoutes');
const shareRoutes = require('./routes/shareRoutes');

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
    });
});

const { authenticateToken } = require('./middleware/authMiddleware');
const { requireAdmin } = require('./middleware/adminMiddleware');

const { clearInventoryData } = require('./controllers/dataController');
app.post('/api/admin/clear-data', authenticateToken, requireAdmin, clearInventoryData);

// API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, requireAdmin, userRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/suppliers', authenticateToken, supplierRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/rolls', authenticateToken, rollRoutes);
app.use('/api/inward', authenticateToken, inwardRoutes);
app.use('/api/outward', authenticateToken, outwardRoutes);
app.use('/api/return', authenticateToken, returnRoutes);
app.use('/api/adjustments', authenticateToken, adjustmentRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/purchase-orders', authenticateToken, purchaseOrderRoutes);
app.use('/api/proforma-invoices', authenticateToken, proformaInvoiceRoutes);
app.use('/api/share', shareRoutes);

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
    console.error('Server error:', err.message);

    // CORS rejection
    if (err.message.startsWith('CORS:')) {
        return res.status(403).json({
            success: false,
            message: err.message,
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 5055;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`WINCREA API running on port ${PORT}`);
    });
}

module.exports = app;
