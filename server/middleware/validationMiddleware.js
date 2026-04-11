const { body, validationResult } = require('express-validator');

// Helper to check validation result
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    next();
};

// Auth Validations
const registerValidation = [
    body('fullName').trim().notEmpty().withMessage('Full Name is required')
        .isLength({ min: 3 }).withMessage('Full Name must be at least 3 chars'),
    body('email').isEmail().withMessage('Invalid email address')
        .normalizeEmail(),
    body('phone').matches(/^07[0-9]{8}$/).withMessage('Invalid phone number (must be 07xxxxxxxx)'),
    body('password').isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    }).withMessage('Password must be at least 8 chars with uppercase, lowercase, number, and symbol'),
    validate
];

const loginValidation = [
    body('email').trim().notEmpty().withMessage('Email/Phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
];

// User Validations
const addTutorValidation = [
    // TeacherID is auto-generated
    body('TeacherName').trim().notEmpty().withMessage('Teacher Name is required'),
    body('Email').isEmail().withMessage('Invalid email'),
    body('Phone').matches(/^07[0-9]{8}$/).withMessage('Invalid phone number'),
    validate
];

const addStudentValidation = [
    body('StudentName').trim().notEmpty().withMessage('Student Name is required'),
    body('Grade').isInt({ min: 1, max: 13 }).withMessage('Grade must be between 1 and 13'),
    validate
];

module.exports = {
    registerValidation,
    loginValidation,
    addTutorValidation,
    addStudentValidation
};
