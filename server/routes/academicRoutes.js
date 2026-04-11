const express = require('express');
const router = express.Router();
const { createExam, getExams, enterMarks, enterBatchMarks, getStudentResults, getSubjects, getEnrolledSubjects, getStudyMaterials, getStudentTimetable, createSession, getAllSessions, enrollStudent, unenrollStudent, getTeacherTimetable, uploadStudyMaterial, downloadMaterial, createSubject, deleteSubject, addToTimetable, getAllTimetable, deleteTimetableEntry } = require('../controllers/academicController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.post('/exams', verifyToken, verifyRole(['teacher', 'admin']), createExam);
router.get('/exams', verifyToken, verifyRole(['teacher', 'admin']), getExams);
router.get('/subjects', verifyToken, getSubjects); // Allow all verified users (parents need into)
router.post('/subjects', verifyToken, verifyRole(['admin']), createSubject);
router.delete('/subjects/:subjectId', verifyToken, verifyRole(['admin']), deleteSubject);
router.post('/marks', verifyToken, verifyRole(['teacher']), enterMarks);
router.post('/marks/batch', verifyToken, verifyRole(['teacher']), enterBatchMarks);
router.get('/results/:studentId', verifyToken, verifyRole(['parent', 'teacher', 'admin']), getStudentResults);
router.get('/enrollments/:studentId', verifyToken, verifyRole(['parent', 'student']), getEnrolledSubjects);
router.get('/materials/:subjectId', verifyToken, verifyRole(['parent', 'student', 'teacher', 'admin']), getStudyMaterials);
router.get('/timetable/teacher', verifyToken, verifyRole(['teacher']), getTeacherTimetable);
router.get('/timetable/:studentId', verifyToken, verifyRole(['parent', 'student']), getStudentTimetable);

// Timetable Management (Admin)
router.post('/timetable', verifyToken, verifyRole(['admin']), addToTimetable);
router.get('/timetable', verifyToken, verifyRole(['admin']), getAllTimetable);
router.delete('/timetable/:id', verifyToken, verifyRole(['admin']), deleteTimetableEntry);

// Enrollment Management
router.post('/enroll', verifyToken, verifyRole(['parent', 'admin']), enrollStudent);
router.post('/unenroll', verifyToken, verifyRole(['parent', 'admin']), unenrollStudent);

// Configure Multer for File Uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/materials/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append extension
    }
});

const upload = multer({ storage: storage });

// Admin / Scheduler Routes
router.post('/sessions', verifyToken, verifyRole(['admin']), createSession);
router.get('/sessions', verifyToken, verifyRole(['admin', 'teacher']), getAllSessions);

// File Upload Route
router.post('/materials', verifyToken, verifyRole(['teacher']), upload.single('file'), uploadStudyMaterial);
router.get('/materials/download/:filename', verifyToken, downloadMaterial);

module.exports = router;
