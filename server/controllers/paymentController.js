const db = require('../config/db');
const crypto = require('crypto');
const { createNotification } = require('./notificationController');

// Generate PayHere Hash
const generatePayHereHash = async (req, res) => {
    const { order_id, amount, currency } = req.body;
    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const merchantSecret = process.env.PAYHERE_SECRET || process.env.PAYHERE_MERCHANT_SECRET;

    if (!merchantId || !merchantSecret) {
        return res.status(500).json({ message: "PayHere configuration missing" });
    }

    const amountFormatted = parseFloat(amount).toLocaleString('en-us', { minimumFractionDigits: 2 }).replace(/,/g, '');
    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const hashString = merchantId + order_id + amountFormatted + currency + hashedSecret;
    const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

    res.json({ hash, merchantId, amountFormatted });
};

// Upload Payment (Parent)
const uploadPayment = async (req, res) => {
    const { studentId, month, referenceNo, amount } = req.body;
    let finalRef = referenceNo || '';

    if (req.file) {
        finalRef += ` [FILE: ${req.file.filename}]`;
    }

    try {
        const monthLabel = month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

        const paymentId = 'PM' + Date.now().toString().slice(-6);
        await db.query(
            "INSERT INTO Payment (PaymentID, StudentID, Month, ReferenceNo, Amount, PaymentDate, Status) VALUES (?, ?, ?, ?, ?, NOW(), 'Pending')",
            [paymentId, studentId, monthLabel, finalRef, amount]
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

// Verify Payment (Admin)
const verifyPayment = async (req, res) => {
    const { paymentId, status } = req.body;
    const { id: userId, role } = req.user;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        let updateQuery = "UPDATE Payment SET Status = ? WHERE PaymentID = ?";
        let params = [status, paymentId];

        if (role === 'admin') {
            updateQuery = "UPDATE Payment SET Status = ?, AdminID = ? WHERE PaymentID = ?";
            params = [status, userId, paymentId];
        }

        await connection.query(updateQuery, params);

        if (status === 'Verified') {
            const [rows] = await connection.query("SELECT StudentID FROM Payment WHERE PaymentID = ?", [paymentId]);
            if (rows.length > 0) {
                const studentId = rows[0].StudentID;
                await connection.query("UPDATE Student SET IsApproved = TRUE WHERE StudentID = ?", [studentId]);

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

// PayHere completion — called by parent after gateway confirms payment
const payhereComplete = async (req, res) => {
    const { paymentId } = req.body;
    const parentId = req.user.id;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Security: only allow if payment belongs to this parent's student
        const [rows] = await connection.query(`
            SELECT p.PaymentID, p.Status, s.StudentID, s.StudentName, s.IsApproved
            FROM Payment p
            JOIN Student s ON p.StudentID = s.StudentID
            WHERE p.PaymentID = ? AND s.ParentID = ?
        `, [paymentId, parentId]);

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(403).json({ message: "Payment not found or does not belong to you" });
        }

        const payment = rows[0];

        if (payment.Status === 'Verified') {
            await connection.rollback();
            return res.json({ message: "Payment already verified", alreadyVerified: true });
        }

        await connection.query("UPDATE Payment SET Status = 'Verified' WHERE PaymentID = ?", [paymentId]);

        if (!payment.IsApproved) {
            await connection.query("UPDATE Student SET IsApproved = TRUE WHERE StudentID = ?", [payment.StudentID]);
        }

        await createNotification(
            parentId,
            'Payment Verified',
            `Your PayHere payment for ${payment.StudentName} has been confirmed.`,
            'PAYMENT'
        );

        await connection.commit();
        res.json({ message: "Payment verified successfully" });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Error completing payment" });
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

// Update Payment Reference
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

module.exports = { uploadPayment, getPendingPayments, verifyPayment, getMyPayments, updatePaymentReference, generatePayHereHash, payhereComplete };
