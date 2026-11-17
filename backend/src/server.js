require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// ============================================================
// CORS
//
// Allows the deployed frontend (Vercel) to call this API
// (deployed separately on Render). Set FRONTEND_URL in the
// backend's environment variables to your Vercel URL(s),
// comma-separated if you have more than one (e.g. a preview
// deployment and a production domain).
// ============================================================

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser requests (curl, server-to-server, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

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

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/rolls', rollRoutes);
app.use('/api/inward', inwardRoutes);
app.use('/api/outward', outwardRoutes);
app.use('/api/return', returnRoutes);
app.use('/api/adjustments', adjustmentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/proforma-invoices', proformaInvoiceRoutes);
app.use('/api/share', shareRoutes);

// ============================================================
// 404 + ERROR HANDLING
// ============================================================

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});

// ============================================================
// START
// ============================================================

const PORT = process.env.PORT || 5055;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
