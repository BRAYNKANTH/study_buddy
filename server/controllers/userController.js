const db = require('../config/db');
const bcrypt = require('bcrypt');

// --- Tutors ---
const getAllTutors = async (req, res) => {
    try {
        const [tutors] = await db.query(`
            SELECT u.UserID as TeacherID, u.FullName as TeacherName, u.Email, tp.Phone,
                   GROUP_CONCAT(DISTINCT tg.Grade) as Grades,
                   GROUP_CONCAT(DISTINCT ts.SubjectID) as SubjectIDs,
                   GROUP_CONCAT(DISTINCT s.SubjectName SEPARATOR ', ') as Subjects
            FROM User u 
            JOIN TeacherProfile tp ON u.UserID = tp.UserID
            LEFT JOIN TeacherGrade tg ON u.UserID = tg.TeacherID
            LEFT JOIN TeacherSubject ts ON u.UserID = ts.TeacherID
            LEFT JOIN Subject s ON ts.SubjectID = s.SubjectID
            WHERE u.Role = 'teacher'
            GROUP BY u.UserID
        `);

        // Format Grades and SubjectIDs as arrays
        const formattedTutors = tutors.map(t => ({
            ...t,
            Grades: t.Grades ? String(t.Grades).split(',').map(Number) : [],
            SubjectIDs: t.SubjectIDs ? String(t.SubjectIDs).split(',') : [],
            Subjects: t.Subjects || ''
        }));

        res.json(formattedTutors);
    } catch (err) {
        res.status(500).json({ message: "Error fetching tutors", error: err.message });
    }
};

const addTutor = async (req, res) => {
    // Removed TeacherID from destructuring
    const { TeacherName, Email, Phone, Grades, SubjectIDs, Password } = req.body;

    console.log("Received Add Tutor Request:", req.body); // Debug Log

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Auto-generate Teacher ID: T + Timestamp (Unique)
        const TeacherID = 'T' + Date.now();

        const hashedPassword = await bcrypt.hash(Password, 10);

        // 1. Create User
        await conn.query(
            "INSERT INTO User (UserID, FullName, Email, Password, Role, IsVerified) VALUES (?, ?, ?, ?, 'teacher', TRUE)",
            [TeacherID, TeacherName, Email, hashedPassword]
        );

        // 2. Create Profile
        await conn.query(
            "INSERT INTO TeacherProfile (UserID, Phone) VALUES (?, ?)",
            [TeacherID, Phone]
        );

        // 3. Add Grades
        if (Grades && Array.isArray(Grades)) {
            for (const grade of Grades) {
                await conn.query(
                    "INSERT INTO TeacherGrade (TeacherID, Grade) VALUES (?, ?)",
                    [TeacherID, grade]
                );
            }
        }

        // 4. Add Subjects
        if (SubjectIDs && Array.isArray(SubjectIDs)) {
            for (const subId of SubjectIDs) {
                await conn.query(
                    "INSERT INTO TeacherSubject (TeacherID, SubjectID) VALUES (?, ?)",
                    [TeacherID, subId]
                );
            }
        }

        await conn.commit();
        res.status(201).json({ message: "Tutor added successfully" });

    } catch (err) {
        await conn.rollback();
        console.error("Error adding tutor:", err); // Log full error
        if (err.code === 'ER_DUP_ENTRY') {
            if (err.message.includes('Email')) {
                return res.status(400).json({ message: "Email already exists" });
            }
            return res.status(400).json({ message: "Duplicate entry found (Email or ID)" });
        }
        res.status(500).json({ message: "Error adding tutor", error: err.message });
    } finally {
        conn.release();
    }
};

// --- Parents ---
const getAllParents = async (req, res) => {
    try {
        const [parents] = await db.query(`
            SELECT u.UserID as ParentID, u.FullName, u.Email, pp.Phone 
            FROM User u 
            JOIN ParentProfile pp ON u.UserID = pp.UserID
            WHERE u.Role = 'parent'
        `);
        res.json(parents);
    } catch (err) {
        res.status(500).json({ message: "Error fetching parents", error: err.message });
    }
};

const addParent = async (req, res) => {
    const { ParentID, FullName, Email, Phone, Password, SecretPasscode } = req.body;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const hashedPassword = await bcrypt.hash(Password, 10);

        // 1. Create User
        await conn.query(
            "INSERT INTO User (UserID, FullName, Email, Password, Role, IsVerified) VALUES (?, ?, ?, ?, 'parent', FALSE)",
            [ParentID, FullName, Email, hashedPassword]
        );

        // 2. Create Profile
        await conn.query(
            "INSERT INTO ParentProfile (UserID, Phone, SecretPasscode) VALUES (?, ?, ?)",
            [ParentID, Phone, SecretPasscode]
        );

        await conn.commit();
        res.status(201).json({ message: "Parent added successfully" });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: "Error adding parent", error: err.message });
    } finally {
        conn.release();
    }
};

// --- Students ---
const getAllStudents = async (req, res) => {
    try {
        // Parent Name is now in User table
        const [students] = await db.query(`
            SELECT s.StudentID, s.StudentName, s.Grade, s.QRCode, u.FullName as ParentName 
            FROM Student s 
            JOIN User u ON s.ParentID = u.UserID
        `);
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: "Error fetching students", error: err.message });
    }
};

const addStudent = async (req, res) => {
    const { StudentID, ParentID, StudentName, Grade, QRCode } = req.body;
    try {
        await db.query(
            "INSERT INTO Student (StudentID, ParentID, StudentName, Grade, QRCode) VALUES (?, ?, ?, ?, ?)",
            [StudentID, ParentID, StudentName, Grade, QRCode]
        );
        res.status(201).json({ message: "Student added successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error adding student", error: err.message });
    }
};

const registerStudent = async (req, res) => {
    const { StudentName, Grade, SubjectIDs } = req.body;
    const parentId = req.user.id;

    if (!StudentName || !Grade || !SubjectIDs || SubjectIDs.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Generate Student ID
        const studentId = 'S' + Date.now().toString().slice(-6);
        const qrCode = 'QR_' + studentId;

        // 2. Create Student
        await connection.query(
            "INSERT INTO Student (StudentID, ParentID, StudentName, Grade, QRCode, IsApproved) VALUES (?, ?, ?, ?, ?, ?)",
            [studentId, parentId, StudentName, Grade, qrCode, false]
        );

        // 3. Calculate Fees & Create Enrollments
        let totalSubjectFee = 0;
        const admissionFee = 500.00;

        for (const subId of SubjectIDs) {
            // Get Fee
            const [rows] = await connection.query("SELECT Fee FROM Subject WHERE SubjectID = ?", [subId]);
            if (rows.length > 0) totalSubjectFee += parseFloat(rows[0].Fee);

            // Resolve SubjectGradeID
            const [sg] = await connection.query("SELECT SubjectGradeID FROM SubjectGrade WHERE SubjectID = ? AND Grade = ?", [subId, Grade]);
            let subjectGradeId;
            if (sg.length === 0) {
                // Auto-fix if missing (Seeding like behavior)
                await connection.query("INSERT INTO SubjectGrade (SubjectID, Grade) VALUES (?,?)", [subId, Grade]);
                const [newSg] = await connection.query("SELECT SubjectGradeID FROM SubjectGrade WHERE SubjectID = ? AND Grade = ?", [subId, Grade]);
                subjectGradeId = newSg[0].SubjectGradeID;
            } else {
                subjectGradeId = sg[0].SubjectGradeID;
            }

            const enrollId = 'E' + Math.floor(Math.random() * 100000);
            await connection.query(
                "INSERT INTO Enrollment (EnrollmentID, StudentID, SubjectGradeID, EnrolledDate) VALUES (?, ?, ?, NOW())",
                [enrollId, studentId, subjectGradeId]
            );
        }

        const totalAmount = admissionFee + totalSubjectFee;

        // 4. Create Payment Record (Current Month)
        const paymentId = 'PM' + Date.now().toString().slice(-6);
        const date = new Date();
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' }); // "January 2026"

        await connection.query(
            "INSERT INTO Payment (PaymentID, StudentID, Month, ReferenceNo, Amount, PaymentDate, Status) VALUES (?, ?, ?, 'PENDING_UPLOAD', ?, NOW(), 'Pending')",
            [paymentId, studentId, monthName, totalAmount]
        );

        await connection.commit();

        res.status(201).json({
            message: "Student registered successfully. Please complete payment.",
            studentId,
            paymentId,
            totalAmount
        });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Error registering student", error: err.message });
    } finally {
        connection.release();
    }
};

const getMyChildren = async (req, res) => {
    const parentId = req.user.id; // From token
    try {
        const [children] = await db.query("SELECT * FROM Student WHERE ParentID = ?", [parentId]);
        res.json(children);
    } catch (err) {
        res.status(500).json({ message: "Error fetching children", error: err.message });
    }
};

// Delete User (Tutor/Parent) - Cascading
const deleteUser = async (req, res) => {
    const { id } = req.params; // Expecting :id in route
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Check Role
        const [users] = await conn.query("SELECT Role FROM User WHERE UserID = ?", [id]);
        if (users.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "User not found" });
        }
        const role = users[0].Role;

        if (role === 'teacher') {
            // Delete Teacher Data
            await conn.query("DELETE FROM Session WHERE TeacherID = ?", [id]);
            await conn.query("DELETE FROM Timetable WHERE TeacherID = ?", [id]);
            await conn.query("DELETE FROM TeacherSubject WHERE TeacherID = ?", [id]);
            await conn.query("DELETE FROM TeacherGrade WHERE TeacherID = ?", [id]);
            await conn.query("DELETE FROM TeacherProfile WHERE UserID = ?", [id]);
            // Chat/Announcements? Maybe set to null or delete?
            // For now, let's assume Chat FK might restrict. 
            // If Chat has FK to User, we must delete chats too or set NULL.
            // Schema has FK on SenderID/ReceiverID. 
            await conn.query("DELETE FROM Chat WHERE SenderID = ? OR ReceiverID = ?", [id, id]);
            // Communication (Announcements)?
            await conn.query("DELETE FROM Communication WHERE SenderID = ? OR ReceiverID = ?", [id, id]); // If exists
        } else if (role === 'parent') {
            // Delete Parent Data
            // First find students
            const [students] = await conn.query("SELECT StudentID FROM Student WHERE ParentID = ?", [id]);
            for (const s of students) {
                const sid = s.StudentID;
                await conn.query("DELETE FROM Enrollment WHERE StudentID = ?", [sid]);
                await conn.query("DELETE FROM Payment WHERE StudentID = ?", [sid]);
                await conn.query("DELETE FROM Attendance WHERE StudentID = ?", [sid]);
                await conn.query("DELETE FROM Marks WHERE StudentID = ?", [sid]);
                await conn.query("DELETE FROM Report WHERE StudentID = ?", [sid]);
                await conn.query("DELETE FROM Student WHERE StudentID = ?", [sid]);
            }
            await conn.query("DELETE FROM ParentProfile WHERE UserID = ?", [id]);
            await conn.query("DELETE FROM Chat WHERE SenderID = ? OR ReceiverID = ?", [id, id]);
        }

        // Finally Delete User
        await conn.query("DELETE FROM User WHERE UserID = ?", [id]);

        await conn.commit();
        res.json({ message: "User and all related data deleted successfully" });

    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ message: "Error deleting user", error: err.message });
    } finally {
        conn.release();
    }
};

// Delete Student (Cascading)
const deleteStudent = async (req, res) => {
    const { id } = req.params;
    const { role, id: userId } = req.user;
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        if (role === 'parent') {
            const [owns] = await conn.query("SELECT StudentID FROM Student WHERE StudentID = ? AND ParentID = ?", [id, userId]);
            if (owns.length === 0) {
                await conn.rollback();
                return res.status(403).json({ message: "You do not have permission to unenroll this student" });
            }
        }

        await conn.query("DELETE FROM Enrollment WHERE StudentID = ?", [id]);
        await conn.query("DELETE FROM Payment WHERE StudentID = ?", [id]);
        await conn.query("DELETE FROM Attendance WHERE StudentID = ?", [id]);
        await conn.query("DELETE FROM Marks WHERE StudentID = ?", [id]);
        await conn.query("DELETE FROM Report WHERE StudentID = ?", [id]);

        const [result] = await conn.query("DELETE FROM Student WHERE StudentID = ?", [id]);

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Student not found" });
        }

        await conn.commit();
        res.json({ message: "Student deleted successfully" });

    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ message: "Error deleting student", error: err.message });
    } finally {
        conn.release();
    }
};

// Admin Stats
const getAdminStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [[{ totalStudents }]] = await db.query("SELECT COUNT(*) as totalStudents FROM Student");
        const [[{ totalTeachers }]] = await db.query("SELECT COUNT(*) as totalTeachers FROM User WHERE Role = 'teacher'");
        const [[{ totalParents }]] = await db.query("SELECT COUNT(*) as totalParents FROM User WHERE Role = 'parent'");
        const [[{ pendingPayments }]] = await db.query("SELECT COUNT(*) as pendingPayments FROM Payment WHERE Status = 'Pending'");
        const [[{ todaySessions }]] = await db.query("SELECT COUNT(*) as todaySessions FROM Session WHERE DATE(Date) = ?", [today]);
        const [[{ approvedStudents }]] = await db.query("SELECT COUNT(*) as approvedStudents FROM Student WHERE IsApproved = TRUE");

        res.json({ totalStudents, totalTeachers, totalParents, pendingPayments, todaySessions, approvedStudents });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching stats" });
    }
};

module.exports = {
    getAllTutors, addTutor,
    getAllParents, addParent,
    getAllStudents, addStudent, registerStudent,
    getMyChildren,
    deleteUser, deleteStudent,
    getAdminStats
};
