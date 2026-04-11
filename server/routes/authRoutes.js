const express = require('express');
const router = express.Router();
const { login, registerAdmin, registerParent, verifyOTP, resendOTP, forgotPassword, resetPassword, changePassword, verifyPassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/register/admin', registerAdmin);
router.post('/register/parent', registerParent);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', verifyToken, changePassword);
router.post('/verify-password', verifyToken, verifyPassword);

module.exports = router;
