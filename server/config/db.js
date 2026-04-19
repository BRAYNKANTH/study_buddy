const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

let pool;

// PlanetScale / Railway / any DATABASE_URL format
if (process.env.DATABASE_URL) {
    pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
} else {
    // Local / Azure individual env vars
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'study_buddy',
        ssl: process.env.DB_HOST && process.env.DB_HOST.includes('azure.com')
            ? { rejectUnauthorized: true }
            : undefined,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

module.exports = pool.promise();
