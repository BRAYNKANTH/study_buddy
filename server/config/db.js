const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

let pool;

// Railway provides DATABASE_URL — use it if available
if (process.env.DATABASE_URL) {
    pool = mysql.createPool(process.env.DATABASE_URL);
} else {
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'study_buddy',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

module.exports = pool.promise();
