
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const caPath = path.join(__dirname, 'ca.pem');

const sslConfig = {
    ca: fs.readFileSync(caPath, 'utf8'),
    rejectUnauthorized: true,
};

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: sslConfig,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Verify the database connection
pool.getConnection()
    .then((connection) => {
        console.log('Connected to Aiven MySQL successfully');
        connection.release();
    })
    .catch((error) => {
        console.error('MySQL connection failed:', error.message);
    });

module.exports = pool;