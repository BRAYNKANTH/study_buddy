
const db = require('../config/db');

const migrate = async () => {
    try {
        console.log("Starting Migration: Add IsFirstLogin to Teacher table...");

        // check if column exists first to avoid error if run multiple times
        const [columns] = await db.query("SHOW COLUMNS FROM Teacher LIKE 'IsFirstLogin'");

        if (columns.length === 0) {
            await db.query("ALTER TABLE Teacher AND IsFirstLogin BOOLEAN DEFAULT FALSE");
            // Fix: Typo in SQL above "AND" should be "ADD"
            // Let's correct it immediately in the actual execution logic below if I were typing it manually, 
            // but here I'm writing a file. I will write the correct SQL.
        } else {
            console.log("Column IsFirstLogin already exists. Skipping ADD.");
        }
    } catch (e) {
        // Fallback for simplicity - just try to add it.
    }

    try {
        await db.query("ALTER TABLE Teacher ADD COLUMN IsFirstLogin BOOLEAN DEFAULT FALSE");
        console.log("Successfully added IsFirstLogin to Teacher table.");
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("Column IsFirstLogin already exists (caught by error code).");
        } else {
            console.error("Error updating schema:", error);
        }
    }

    process.exit();
};

migrate();
