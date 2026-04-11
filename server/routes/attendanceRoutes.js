const express = require('express');
const router = express.Router();
const { markAttendance, getTeacherSubjects, getStudentAttendance, getTeacherSessions, getTeacherClasses, getClassStudents, createManualSession, getClassSessions, getSessionAttendance } = require('../controllers/attendanceController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.get('/teacher/subjects', verifyToken, verifyRole(['teacher']), getTeacherSubjects);
router.get('/teacher/sessions', verifyToken, verifyRole(['teacher']), getTeacherSessions);
router.get('/teacher/sessions/:subjectId/:grade', verifyToken, verifyRole(['teacher']), getClassSessions); // NEW
router.get('/teacher/session/:sessionId/students', verifyToken, verifyRole(['teacher']), getSessionAttendance); // NEW
router.get('/teacher/classes', verifyToken, verifyRole(['teacher']), getTeacherClasses);
router.get('/teacher/class/:subjectId/:grade/students', verifyToken, verifyRole(['teacher']), getClassStudents);
router.post('/teacher/session', verifyToken, verifyRole(['teacher']), createManualSession);
router.post('/mark', verifyToken, verifyRole(['teacher']), markAttendance);
router.get('/:studentId', verifyToken, verifyRole(['parent', 'student', 'teacher', 'admin']), getStudentAttendance);

module.exports = router;
