const db = require('../config/db');
const path = require('path');

// Helper to calculate Grade dynamically (Standard Sri Lankan Grading or Custom)
const calculateGrade = (marks) => {
    if (marks >= 75) return 'A';
    if (marks >= 65) return 'B';
    if (marks >= 55) return 'C';
    if (marks >= 35) return 'S';
    return 'W'; // Weak
};

// Create Exam (Tutor)
const createExam = async (req, res) => {
    const { examName, term, grade, date, subjectId } = req.body;

    if (!subjectId || !grade || !examName || !term || !date) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        // Resolve SubjectGradeID
        const [rows] = await db.query("SELECT SubjectGradeID FROM SubjectGrade WHERE SubjectID = ? AND Grade = ?", [subjectId, grade]);
        if (rows.length === 0) return res.status(400).json({ message: "Invalid Subject-Grade combination" });
        const subjectGradeId = rows[0].SubjectGradeID;

        const examId = 'EX' + Date.now().toString().slice(-6);
        // Insert without 'Grade' column
        await db.query(
            "INSERT INTO Exam (ExamID, ExamName, Term, SubjectGradeID, Date) VALUES (?, ?, ?, ?, ?)",
            [examId, examName, term, subjectGradeId, date]
        );
        res.status(201).json({ message: "Exam created successfully", examId });
    } catch (err) {
        res.status(500).json({ message: "Error creating exam", error: err.message });
    }
};

// Get Exams (Filtered by Subject and Grade if provided)
const getExams = async (req, res) => {
    const { subjectId, grade } = req.query;
    try {
        let query = `
            SELECT e.*, sg.Grade, s.SubjectName 
            FROM Exam e
            JOIN SubjectGrade sg ON e.SubjectGradeID = sg.SubjectGradeID
            JOIN Subject s ON sg.SubjectID = s.SubjectID
        `;
        const params = [];

        if (subjectId && grade) {
            query += ` WHERE s.SubjectID = ? AND sg.Grade = ?`;
            params.push(subjectId, grade);
        }

        query += ` ORDER BY e.Date DESC`;

        const [exams] = await db.query(query, params);
        res.json(exams);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching exams" });
    }
};

// Get All Subjects (Public/Parent)
const getSubjects = async (req, res) => {
    try {
        // Fetch Subjects with joined Grades
        const [rows] = await db.query(`
            SELECT s.*, GROUP_CONCAT(sg.Grade ORDER BY sg.Grade ASC) as GradesList
            FROM Subject s
            LEFT JOIN SubjectGrade sg ON s.SubjectID = sg.SubjectID
            GROUP BY s.SubjectID
        `);

        // Format for frontend (convert comma string back to array if needed, or keep as string)
        const subjects = rows.map(s => ({
            ...s,
            Grades: s.GradesList ? s.GradesList : '' // Frontend expects a string or list
        }));

        res.json(subjects);
    } catch (err) {
        res.status(500).json({ message: "Error fetching subjects", error: err.message });
    }
};

// Enter Marks (Tutor) - Single
const enterMarks = async (req, res) => {
    const { examId, studentId, marks, remarks } = req.body;
    // Teacher verification is done via middleware, but we don't store TeacherID in Marks table as per schema

    try {
        const markId = 'M' + Date.now().toString().slice(-6);
        await db.query(
            "INSERT INTO Marks (MarkID, ExamID, StudentID, Marks, Remarks, UploadDate) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE Marks = ?, Remarks = ?",
            [markId, examId, studentId, marks, remarks, marks, remarks]
        );
        res.json({ message: "Marks entered successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error entering marks" });
    }
};

// Enter Marks (Batch)
const enterBatchMarks = async (req, res) => {
    const { examId, marksData } = req.body; // marksData = [{ studentId, marks, remarks }]

    if (!marksData || !Array.isArray(marksData)) {
        return res.status(400).json({ message: "Invalid data format" });
    }

    try {
        // Use a transaction or Promise.all. Simple loop for now.
        for (const data of marksData) {
            const markId = 'M_' + examId + '_' + data.studentId.slice(-4);
            // UPSERT logic using explicit parameters for MariaDB compatibility
            await db.query(
                `INSERT INTO Marks (MarkID, ExamID, StudentID, Marks, Remarks, UploadDate)
                 VALUES (?, ?, ?, ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE Marks = ?, Remarks = ?`,
                [markId, examId, data.studentId, data.marks, data.remarks || '', data.marks, data.remarks || '']
            );
        }
        res.json({ message: "Batch marks updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating batch marks" });
    }
};

// Get Exam Marks (Tutor)
const getExamMarks = async (req, res) => {
    const { examId } = req.params;
    try {
        const [marks] = await db.query("SELECT * FROM Marks WHERE ExamID = ?", [examId]);
        res.json(marks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching exam marks" });
    }
};

// Get Student Results (Parent)
const getStudentResults = async (req, res) => {
    const { studentId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    try {
        // Security check
        if (role === 'parent') {
            const [ownership] = await db.query("SELECT * FROM Student WHERE StudentID = ? AND ParentID = ?", [studentId, userId]);
            if (ownership.length === 0) return res.status(403).json({ message: "Unauthorized access to student" });
        }
        // Teachers/Admins are allowed by route middleware (verifyRole), so we skip ownership check for them.

        const [results] = await db.query(`
            SELECT m.*, e.ExamName, s.SubjectName
            FROM Marks m
            JOIN Exam e ON m.ExamID = e.ExamID
            JOIN SubjectGrade sg ON e.SubjectGradeID = sg.SubjectGradeID
            JOIN Subject s ON sg.SubjectID = s.SubjectID
            WHERE m.StudentID = ?
            ORDER BY e.Date DESC
        `, [studentId]);

        // Calculate Grade dynamically
        const resultsWithGrade = results.map(r => ({
            ...r,
            Grade: calculateGrade(r.Marks)
        }));

        res.json(resultsWithGrade);
    } catch (err) {
        res.status(500).json({ message: "Error fetching results" });
    }
};

// Get Enrolled Subjects (for a specific student)
const getEnrolledSubjects = async (req, res) => {
    const { studentId } = req.params;
    try {
        const [subjects] = await db.query(`
            SELECT s.SubjectID, s.SubjectName, u.FullName as TeacherName, u.UserID as TeacherID
            FROM Enrollment e
            JOIN SubjectGrade sg ON e.SubjectGradeID = sg.SubjectGradeID
            JOIN Subject s ON sg.SubjectID = s.SubjectID
            LEFT JOIN TeacherSubject ts ON s.SubjectID = ts.SubjectID
            LEFT JOIN User u ON ts.TeacherID = u.UserID AND u.Role = 'teacher'
            WHERE e.StudentID = ?
            GROUP BY s.SubjectID
            `, [studentId]);
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ message: "Error fetching enrolled subjects" });
    }
};

// Get Study Materials (for a subject)
const getStudyMaterials = async (req, res) => {
    const { subjectId } = req.params;
    // We strictly need Grade to filter filtering, let's assume we fetch all or filter by query
    const { grade } = req.query; // If frontend sends it

    try {
        let query = `
            SELECT m.*, t.FullName as TeacherName 
            FROM StudyMaterial m
            JOIN SubjectGrade sg ON m.SubjectGradeID = sg.SubjectGradeID
            JOIN User t ON m.TeacherID = t.UserID
            WHERE sg.SubjectID = ?
            `;
        const params = [subjectId];

        if (grade) {
            query += " AND sg.Grade = ?";
            params.push(grade);
        }

        query += " ORDER BY m.UploadDate DESC";

        const [materials] = await db.query(query, params);
        res.json(materials);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching materials" });
    }
};

// Get Student Timetable (Weekly Schedule for Enrolled Subjects)
const getStudentTimetable = async (req, res) => {
    const { studentId } = req.params;
    try {
        const [timetable] = await db.query(`
            SELECT t.*, sub.SubjectName, tea.FullName as TeacherName, sg.Grade
            FROM Timetable t
            JOIN SubjectGrade sg ON t.SubjectGradeID = sg.SubjectGradeID
            JOIN Subject sub ON sg.SubjectID = sub.SubjectID
            JOIN User tea ON t.TeacherID = tea.UserID
            JOIN Enrollment e ON t.SubjectGradeID = e.SubjectGradeID 
            WHERE e.StudentID = ?
            ORDER BY FIELD(t.DayOfWeek, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), t.StartTime
            `, [studentId]);
        res.json(timetable);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching timetable" });
    }
};

// ...



// Create Session (Admin Schedule)
const createSession = async (req, res) => {
    const { teacherId, subjectId, grade, date, startTime, endTime } = req.body;

    // Basic Validation
    if (!teacherId || !subjectId || !grade || !date || !startTime || !endTime) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        // Resolve SubjectGradeID
        const [rows] = await db.query("SELECT SubjectGradeID FROM SubjectGrade WHERE SubjectID = ? AND Grade = ?", [subjectId, grade]);
        if (rows.length === 0) return res.status(400).json({ message: "Invalid Subject-Grade combination" });
        const subjectGradeId = rows[0].SubjectGradeID;

        const sessionId = 'SES' + Date.now().toString().slice(-6);
        await db.query(
            "INSERT INTO Session (SessionID, TeacherID, SubjectGradeID, Date, StartTime, EndTime) VALUES (?, ?, ?, ?, ?, ?)",
            [sessionId, teacherId, subjectGradeId, date, startTime, endTime]
        );
        res.status(201).json({ message: "Class scheduled successfully", sessionId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error scheduling class", error: err.message });
    }
};

// Get All Sessions (Admin View - Optional Filters)
const getAllSessions = async (req, res) => {
    const { grade, date } = req.query;
    try {
        let query = `
            SELECT s.*, sub.SubjectName, sg.Grade, t.FullName as TeacherName 
            FROM Session s
            JOIN SubjectGrade sg ON s.SubjectGradeID = sg.SubjectGradeID
            JOIN Subject sub ON sg.SubjectID = sub.SubjectID
            JOIN User t ON s.TeacherID = t.UserID
            `;
        const params = [];
        const conditions = [];

        if (grade) {
            conditions.push("sg.Grade = ?");
            params.push(grade);
        }
        if (date) {
            conditions.push("s.Date = ?");
            params.push(date);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY s.Date, s.StartTime";

        const [sessions] = await db.query(query, params);
        res.json(sessions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching sessions" });
    }
};

// Enroll Student in Subject
const enrollStudent = async (req, res) => {
    const { studentId, subjectId } = req.body;
    try {
        // 1. Get Student Grade
        const [student] = await db.query("SELECT Grade FROM Student WHERE StudentID = ?", [studentId]);
        if (student.length === 0) return res.status(404).json({ message: "Student not found" });
        const grade = student[0].Grade;

        // 2. Resolve SubjectGradeID
        const [sg] = await db.query("SELECT SubjectGradeID FROM SubjectGrade WHERE SubjectID = ? AND Grade = ?", [subjectId, grade]);
        if (sg.length === 0) return res.status(400).json({ message: "Subject not available for this grade" });
        const subjectGradeId = sg[0].SubjectGradeID;

        // 3. Check if already enrolled
        const [existing] = await db.query(
            "SELECT * FROM Enrollment WHERE StudentID = ? AND SubjectGradeID = ?",
            [studentId, subjectGradeId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: "Student already enrolled in this subject" });
        }

        const enrollmentId = 'E' + Date.now().toString().slice(-6);
        await db.query(
            "INSERT INTO Enrollment (EnrollmentID, StudentID, SubjectGradeID, EnrolledDate) VALUES (?, ?, ?, CURRENT_DATE)",
            [enrollmentId, studentId, subjectGradeId]
        );

        res.status(201).json({ message: "Enrolled successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error enrolling student" });
    }
};

// Unenroll Student from Subject
const unenrollStudent = async (req, res) => {
    const { studentId, subjectId } = req.body;
    try {
        // 1. Get Student Grade
        const [student] = await db.query("SELECT Grade FROM Student WHERE StudentID = ?", [studentId]);
        if (student.length === 0) return res.status(404).json({ message: "Student not found" });
        const grade = student[0].Grade;

        // 2. Resolve SubjectGradeID
        const [sg] = await db.query("SELECT SubjectGradeID FROM SubjectGrade WHERE SubjectID = ? AND Grade = ?", [subjectId, grade]);
        if (sg.length === 0) return res.status(400).json({ message: "Subject not available" });
        const subjectGradeId = sg[0].SubjectGradeID;

        await db.query(
            "DELETE FROM Enrollment WHERE StudentID = ? AND SubjectGradeID = ?",
            [studentId, subjectGradeId]
        );
        res.json({ message: "Unenrolled successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error unenrolling student" });
    }
};

// Get Teacher Timetable
const getTeacherTimetable = async (req, res) => {
    const teacherId = req.user.id;
    try {
        const [timetable] = await db.query(`
            SELECT t.*, s.SubjectName, sg.Grade
            FROM Timetable t
            JOIN SubjectGrade sg ON t.SubjectGradeID = sg.SubjectGradeID
            JOIN Subject s ON sg.SubjectID = s.SubjectID
            WHERE t.TeacherID = ?
            ORDER BY FIELD(t.DayOfWeek, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), t.StartTime
            `, [teacherId]);
        res.json(timetable);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching timetable" });
    }
};

// Upload Study Material
const uploadStudyMaterial = async (req, res) => {
    const { subjectId, grade, title, description } = req.body;
    const teacherId = req.user.id;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    try {
        // Resolve SubjectGradeID
        const [rows] = await db.query("SELECT SubjectGradeID FROM SubjectGrade WHERE SubjectID = ? AND Grade = ?", [subjectId, grade]);
        if (rows.length === 0) return res.status(400).json({ message: "Invalid Subject-Grade combination" });
        const subjectGradeId = rows[0].SubjectGradeID;

        const materialId = 'MAT' + Date.now().toString().slice(-6);
        const fileType = file.mimetype === 'application/pdf' ? 'PDF' : 'Image';

        await db.query(
            "INSERT INTO StudyMaterial (MaterialID, TeacherID, SubjectGradeID, Title, Description, FileName, FileType, UploadDate) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
            [materialId, teacherId, subjectGradeId, title, description, file.filename, fileType]
        );

        res.status(201).json({ message: "Material uploaded successfully", materialId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error uploading material" });
    }
};

// Download Study Material (Force Download)
const downloadMaterial = async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/materials', filename);

    res.download(filePath, (err) => {
        if (err) {
            console.error("Download error:", err);
            res.status(404).json({ message: "File not found" });
        }
    });
};

// Create Subject (Admin)
const createSubject = async (req, res) => {
    const { subjectName, fee, medium, grades } = req.body; // grades is array [6,7,8]

    if (!subjectName || !fee || !grades || grades.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Auto-generate ID: SUB_ENG_1234
        const shortName = subjectName.substring(0, 3).toUpperCase();
        const subjectId = `SUB_${shortName}_${Date.now().toString().slice(-4)}`;

        // 1. Insert Subject (No grades column)
        await conn.query(
            "INSERT INTO Subject (SubjectID, SubjectName, Fee, Medium) VALUES (?, ?, ?, ?)",
            [subjectId, subjectName, fee, medium]
        );

        // 2. Insert Grades into SubjectGrade
        for (const grade of grades) {
            await conn.query(
                "INSERT INTO SubjectGrade (SubjectID, Grade) VALUES (?, ?)",
                [subjectId, grade]
            );
        }

        await conn.commit();
        res.status(201).json({ message: "Subject added successfully" });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: "Error adding subject", error: err.message });
    } finally {
        conn.release();
    }
};

// Delete Subject
const deleteSubject = async (req, res) => {
    const { subjectId } = req.params;
    try {
        await db.query("DELETE FROM Subject WHERE SubjectID = ?", [subjectId]);
        res.json({ message: "Subject deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting subject", error: err.message });
    }
};

// Add to Weekly Timetable
const addToTimetable = async (req, res) => {
    const { subjectId, grade, teacherId, dayOfWeek, startTime, endTime } = req.body;

    if (!subjectId || !grade || !teacherId || !dayOfWeek || !startTime || !endTime) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        // Resolve SubjectGradeID
        const [rows] = await db.query("SELECT SubjectGradeID FROM SubjectGrade WHERE SubjectID = ? AND Grade = ?", [subjectId, grade]);
        if (rows.length === 0) return res.status(400).json({ message: "Invalid Subject-Grade combination" });
        const subjectGradeId = rows[0].SubjectGradeID;

        const timetableId = 'TT' + Date.now().toString().slice(-6);
        await db.query(
            "INSERT INTO Timetable (TimetableID, SubjectGradeID, TeacherID, DayOfWeek, StartTime, EndTime) VALUES (?, ?, ?, ?, ?, ?)",
            [timetableId, subjectGradeId, teacherId, dayOfWeek, startTime, endTime]
        );
        res.status(201).json({ message: "Timetable updated successfully", timetableId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating timetable" });
    }
};

// Get All Timetable Entries (Admin View)
const getAllTimetable = async (req, res) => {
    try {
        const [timetable] = await db.query(`
            SELECT t.TimetableID, t.DayOfWeek, t.StartTime, t.EndTime,
            sub.SubjectName, sg.Grade, u.FullName as TeacherName
            FROM Timetable t
            JOIN SubjectGrade sg ON t.SubjectGradeID = sg.SubjectGradeID
            JOIN Subject sub ON sg.SubjectID = sub.SubjectID
            JOIN User u ON t.TeacherID = u.UserID
            ORDER BY FIELD(t.DayOfWeek, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), t.StartTime
            `);
        res.json(timetable);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching timetable" });
    }
};

// Delete Timetable Entry
const deleteTimetableEntry = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM Timetable WHERE TimetableID = ?", [id]);
        res.json({ message: "Entry removed successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error removing entry" });
    }
};

module.exports = { createExam, getExams, enterMarks, enterBatchMarks, getExamMarks, getStudentResults, getSubjects, getEnrolledSubjects, getStudyMaterials, getStudentTimetable, createSession, getAllSessions, enrollStudent, unenrollStudent, getTeacherTimetable, uploadStudyMaterial, downloadMaterial, createSubject, deleteSubject, addToTimetable, getAllTimetable, deleteTimetableEntry };
