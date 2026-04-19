const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadPayment, getPendingPayments, verifyPayment, getMyPayments, updatePaymentReference, generatePayHereHash, payhereComplete } = require('../controllers/paymentController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, 'PAY-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images and PDFs are allowed!'));
    }
});

router.post('/hash', verifyToken, generatePayHereHash);
router.post('/upload', verifyToken, verifyRole(['parent']), upload.single('receipt'), uploadPayment);
router.get('/pending', verifyToken, verifyRole(['admin']), getPendingPayments);
router.put('/verify', verifyToken, verifyRole(['admin']), verifyPayment);
router.put('/payhere-complete', verifyToken, verifyRole(['parent']), payhereComplete);
router.get('/history', verifyToken, verifyRole(['parent']), getMyPayments);
router.put('/:paymentId/reference', verifyToken, verifyRole(['parent']), updatePaymentReference);

module.exports = router;
