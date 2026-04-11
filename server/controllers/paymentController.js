const db = require('../config/db');
const crypto = require('crypto');
const { createNotification } = require('./notificationController');

// Generate PayHere Hash
const generatePayHereHash = async (req, res) => {
    const { order_id, amount, currency } = req.body;
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

    if (!merchantId || !merchantSecret) {
        return res.status(500).json({ message: "PayHere configuration missing" });
    }

    // Hash Formula: md5(merchant_id + order_id + amount_formatted + currency + md5(merchant_secret).toUpperCase()).toUpperCase();

    // 1. Format amount to 2 decimal places
    const amountFormatted = parseFloat(amount).toLocaleString('en-us', { minimumFractionDigits: 2 }).replace(/,/g, '');

    // 2. Hash the secret
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();

    // 3. Create string to hash
    const hashString = merchantId + order_id + amountFormatted + currency + hashedSecret;

    // 4. Final Hash
    const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

    res.json({ hash, merchantId, amountFormatted }); // Return formatted amount
};

// Upload Payment (Parent)
const uploadPayment = async (req, res) => {
    const { studentId, month, referenceNo, amount } = req.body; // month is "January 2026"
    let finalRef = referenceNo || '';

    if (req.file) {
        finalRef += ` [FILE: ${req.file.filename}]`;
    }

    try {
        // Resolve CycleID
        let cycleId;
        // Use provided month or current
        const cycleName = month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

        const [cycles] = await db.query("SELECT CycleID FROM BillingCycle WHERE CycleName = ?", [cycleName]);
        if (cycles.length > 0) {
            cycleId = cycles[0].CycleID;
        } else {
            // Create Cycle auto-fix
            const date = new Date();
            const startDetails = new Date(date.getFullYear(), date.getMonth(), 1);
            const endDetails = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const [insertResult] = await db.query("INSERT INTO BillingCycle (CycleName, StartDate, EndDate) VALUES (?, ?, ?)", [cycleName, startDetails, endDetails]);
            cycleId = insertResult.insertId;
        }

        const paymentId = 'PM' + Date.now().toString().slice(-6);
        await db.query(
            "INSERT INTO Payment (PaymentID, StudentID, CycleID, ReferenceNo, Amount, PaymentDate, Status) VALUES (?, ?, ?, ?, ?, NOW(), 'Pending')",
            [paymentId, studentId, cycleId, finalRef, amount]
        );
        res.status(201).json({ message: "Payment submitted for verification", paymentId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error uploading payment" });
    }
};

// Get All Payments (Admin) - Pending first
const getPendingPayments = async (req, res) => {
    try {
        const [payments] = await db.query(`
            SELECT p.*, s.StudentName, s.IsApproved, pa.FullName as ParentName 
            FROM Payment p 
            JOIN Student s ON p.StudentID = s.StudentID
            JOIN User pa ON s.ParentID = pa.UserID
            WHERE p.Status = 'Pending'
        `);
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: "Error fetching payments" });
    }
};

// Verify Payment (Admin or System Auto-Verify)
const verifyPayment = async (req, res) => {
    const { paymentId, status } = req.body; // Status: 'Verified' or 'Rejected'
    const { id: userId, role } = req.user;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        let updateQuery = "UPDATE Payment SET Status = ? WHERE PaymentID = ?";
        let params = [status, paymentId];

        // Only record AdminID if the verifier is an Admin
        if (role === 'admin') {
            updateQuery = "UPDATE Payment SET Status = ?, AdminID = ? WHERE PaymentID = ?";
            params = [status, userId, paymentId];
        }

        await connection.query(updateQuery, params);

        if (status === 'Verified') {
            // Find Student for this payment
            const [rows] = await connection.query("SELECT StudentID FROM Payment WHERE PaymentID = ?", [paymentId]);
            if (rows.length > 0) {
                const studentId = rows[0].StudentID;
                await connection.query("UPDATE Student SET IsApproved = TRUE WHERE StudentID = ?", [studentId]);

                // NOTIFICATION: Payment Verified
                const [student] = await connection.query("SELECT ParentID, StudentName FROM Student WHERE StudentID = ?", [studentId]);
                if (student.length > 0) {
                    await createNotification(
                        student[0].ParentID,
                        'Payment Verified',
                        `Payment for ${student[0].StudentName} has been verified successfully.`,
                        'PAYMENT'
                    );
                }
            }
        } else if (status === 'Rejected') {
            // Find Student/Parent to notify rejection
            const [rows] = await connection.query("SELECT s.ParentID, s.StudentName FROM Payment p JOIN Student s ON p.StudentID = s.StudentID WHERE p.PaymentID = ?", [paymentId]);
            if (rows.length > 0) {
                await createNotification(
                    rows[0].ParentID,
                    'Payment Rejected',
                    `Payment for ${rows[0].StudentName} was rejected. Please contact administration.`,
                    'PAYMENT'
                );
            }
        }

        await connection.commit();
        res.json({ message: `Payment ${status}` });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Error updating payment" });
    } finally {
        connection.release();
    }
};

// Get My Payments (Parent)
const getMyPayments = async (req, res) => {
    const parentId = req.user.id;
    try {
        const [payments] = await db.query(`
            SELECT p.*, s.StudentName 
            FROM Payment p 
            JOIN Student s ON p.StudentID = s.StudentID 
            WHERE s.ParentID = ?
            ORDER BY p.PaymentDate DESC
        `, [parentId]);
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: "Error fetching history" });
    }
};

// Update Payment Reference (For after-registration)
const updatePaymentReference = async (req, res) => {
    const { paymentId } = req.params;
    const { referenceNo } = req.body;
    try {
        await db.query("UPDATE Payment SET ReferenceNo = ? WHERE PaymentID = ?", [referenceNo, paymentId]);
        res.json({ message: "Payment reference updated" });
    } catch (err) {
        res.status(500).json({ message: "Error updating payment" });
    }
};

module.exports = { uploadPayment, getPendingPayments, verifyPayment, getMyPayments, updatePaymentReference, generatePayHereHash };
