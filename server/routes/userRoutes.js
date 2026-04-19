const express = require('express');
const router = express.Router();
const {
    getAllTutors, addTutor,
    getAllParents, addParent,
    getAllStudents, addStudent, registerStudent, deleteStudent,
    getMyChildren, deleteUser, getAdminStats
} = require('../controllers/userController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');
const { addTutorValidation, addStudentValidation } = require('../middleware/validationMiddleware');

// Tutors
router.get('/tutors', verifyToken, verifyRole(['admin']), getAllTutors);
router.post('/tutors', verifyToken, verifyRole(['admin']), addTutorValidation, addTutor);

// Parents
router.get('/parents', verifyToken, verifyRole(['admin']), getAllParents);
router.post('/parents', verifyToken, verifyRole(['admin']), addParent);
router.get('/my-children', verifyToken, verifyRole(['parent']), getMyChildren);

// Students
router.get('/students', verifyToken, verifyRole(['admin', 'parent']), getAllStudents); // Parents might need to see kids too, but this endpoint is general list
router.post('/students', verifyToken, verifyRole(['admin']), addStudent);
router.post('/parent/students', verifyToken, verifyRole(['parent']), addStudentValidation, registerStudent); // Parent adding their own child
router.delete('/student/:id', verifyToken, verifyRole(['admin', 'parent']), deleteStudent); // New Route - Admin or Parent can delete a student

// Admin Stats
router.get('/stats', verifyToken, verifyRole(['admin']), getAdminStats);

// General User Management
router.delete('/:userId', verifyToken, verifyRole(['admin']), deleteUser);

module.exports = router;
