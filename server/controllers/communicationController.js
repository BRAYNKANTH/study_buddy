const db = require('../config/db');
const { createNotification } = require('./notificationController');

// Send Message (Chat)
const sendMessage = async (req, res) => {
    const { receiverId, message } = req.body;
    const senderId = req.user.id;

    try {
        const chatId = 'MSG' + Date.now().toString().slice(-8) + Math.random().toString(36).substring(2, 5);
        await db.query(
            "INSERT INTO Chat (ChatID, SenderID, ReceiverID, Message, Timestamp, IsRead) VALUES (?, ?, ?, ?, NOW(), FALSE)",
            [chatId, senderId, receiverId, message]
        );
        res.json({ message: "Message sent" });
    } catch (err) {
        res.status(500).json({ message: "Error sending message" });
    }
};

// Get Chat History (also marks messages from contact as read)
const getChatHistory = async (req, res) => {
    const userId = req.user.id;
    const { contactId } = req.params;

    try {
        const [chats] = await db.query(`
            SELECT * FROM Chat
            WHERE (SenderID = ? AND ReceiverID = ?) OR (SenderID = ? AND ReceiverID = ?)
            ORDER BY Timestamp ASC
        `, [userId, contactId, contactId, userId]);

        // Mark incoming messages from this contact as read
        await db.query(
            `UPDATE Chat SET IsRead = TRUE WHERE SenderID = ? AND ReceiverID = ? AND IsRead = FALSE`,
            [contactId, userId]
        );

        res.json(chats);
    } catch (err) {
        res.status(500).json({ message: "Error fetching chat" });
    }
};

// Delete Chat
const deleteChat = async (req, res) => {
    const userId = req.user.id;
    const { contactId } = req.params;

    try {
        await db.query(`
            DELETE FROM Chat
            WHERE (SenderID = ? AND ReceiverID = ?) OR (SenderID = ? AND ReceiverID = ?)
        `, [userId, contactId, contactId, userId]);

        res.json({ message: "Chat deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting chat" });
    }
};

// Get Chat Contacts
const getChatContacts = async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        // Base query: people this user has already chatted with
        const baseQuery = `
            SELECT DISTINCT
                u.UserID AS ContactID,
                u.FullName AS ContactName,
                CAST(u.Role AS CHAR) AS Role,
                s.SubjectName
            FROM Chat c
            JOIN User u ON (c.SenderID = u.UserID OR c.ReceiverID = u.UserID)
            LEFT JOIN TeacherSubject ts ON u.UserID = ts.TeacherID
            LEFT JOIN Subject s ON ts.SubjectID = s.SubjectID
            WHERE (c.SenderID = ? OR c.ReceiverID = ?)
            AND u.UserID != ?
        `;
        const [baseContacts] = await db.query(baseQuery, [userId, userId, userId]);

        let discoveryContacts = [];

        // Teachers: find all parents of enrolled students (via Session or TeacherSubject)
        if (userRole === 'teacher') {
            const [rows] = await db.query(`
                SELECT DISTINCT
                    u.UserID AS ContactID,
                    u.FullName AS ContactName,
                    'parent' AS Role,
                    sub.SubjectName
                FROM Session sess
                JOIN SubjectGrade sg ON sess.SubjectGradeID = sg.SubjectGradeID
                JOIN Subject sub ON sg.SubjectID = sub.SubjectID
                JOIN Enrollment e ON sess.SubjectGradeID = e.SubjectGradeID
                JOIN Student st ON e.StudentID = st.StudentID
                JOIN User u ON st.ParentID = u.UserID
                WHERE sess.TeacherID = ?
                UNION
                SELECT DISTINCT
                    u.UserID AS ContactID,
                    u.FullName AS ContactName,
                    'parent' AS Role,
                    sub.SubjectName
                FROM TeacherSubject ts
                JOIN Subject sub ON ts.SubjectID = sub.SubjectID
                JOIN SubjectGrade sg ON sub.SubjectID = sg.SubjectID
                JOIN Enrollment e ON sg.SubjectGradeID = e.SubjectGradeID
                JOIN Student st ON e.StudentID = st.StudentID
                JOIN User u ON st.ParentID = u.UserID
                WHERE ts.TeacherID = ?
            `, [userId, userId]);
            discoveryContacts = rows;
        }

        // Parents: find all teachers of their children (via Session or TeacherSubject)
        if (userRole === 'parent') {
            const [rows] = await db.query(`
                SELECT DISTINCT
                    u.UserID AS ContactID,
                    u.FullName AS ContactName,
                    'teacher' AS Role,
                    sub.SubjectName
                FROM Student st
                JOIN Enrollment e ON st.StudentID = e.StudentID
                JOIN Session sess ON e.SubjectGradeID = sess.SubjectGradeID
                JOIN User u ON sess.TeacherID = u.UserID
                JOIN SubjectGrade sg ON e.SubjectGradeID = sg.SubjectGradeID
                JOIN Subject sub ON sg.SubjectID = sub.SubjectID
                WHERE st.ParentID = ?
                UNION
                SELECT DISTINCT
                    u.UserID AS ContactID,
                    u.FullName AS ContactName,
                    'teacher' AS Role,
                    sub.SubjectName
                FROM Student st
                JOIN Enrollment e ON st.StudentID = e.StudentID
                JOIN SubjectGrade sg ON e.SubjectGradeID = sg.SubjectGradeID
                JOIN TeacherSubject ts ON sg.SubjectID = ts.SubjectID
                JOIN User u ON ts.TeacherID = u.UserID
                JOIN Subject sub ON sg.SubjectID = sub.SubjectID
                WHERE st.ParentID = ?
            `, [userId, userId]);
            discoveryContacts = rows;
        }

        // Merge: base chat contacts + discovery contacts, deduplicated by ContactID
        const seen = new Set();
        const contacts = [];
        for (const c of [...baseContacts, ...discoveryContacts]) {
            if (!seen.has(c.ContactID)) {
                seen.add(c.ContactID);
                contacts.push(c);
            }
        }

        if (contacts.length === 0) return res.json([]);

        // Enrich parent contacts with student details (for teachers)
        if (userRole === 'teacher') {
            for (let c of contacts) {
                if (c.Role === 'parent') {
                    const [students] = await db.query(`
                        SELECT DISTINCT st.StudentID, st.StudentName, st.Grade
                        FROM Student st
                        JOIN Enrollment e ON st.StudentID = e.StudentID
                        JOIN SubjectGrade sg ON e.SubjectGradeID = sg.SubjectGradeID
                        JOIN TeacherSubject ts ON sg.SubjectID = ts.SubjectID
                        WHERE st.ParentID = ? AND ts.TeacherID = ?
                    `, [c.ContactID, userId]);
                    c.Students = students;
                }
            }
        }

        // Enrich teacher contacts with student details (for parents)
        if (userRole === 'parent') {
            for (let c of contacts) {
                if (c.Role === 'teacher') {
                    const [students] = await db.query(`
                        SELECT DISTINCT st.StudentID, st.StudentName, st.Grade
                        FROM Student st
                        JOIN Enrollment e ON st.StudentID = e.StudentID
                        JOIN SubjectGrade sg ON e.SubjectGradeID = sg.SubjectGradeID
                        JOIN TeacherSubject ts ON sg.SubjectID = ts.SubjectID
                        WHERE st.ParentID = ? AND ts.TeacherID = ?
                    `, [userId, c.ContactID]);
                    c.Students = students;
                }
            }
        }

        // Attach last message preview + per-contact unread count
        const [summary] = await db.query(`
            SELECT
                partner_id AS ContactID,
                MAX(Timestamp) AS LastMessageTime,
                SUBSTRING_INDEX(GROUP_CONCAT(Message ORDER BY Timestamp DESC SEPARATOR CHAR(1)), CHAR(1), 1) AS LastMessage,
                SUM(CASE WHEN SenderID != ? AND IsRead = FALSE THEN 1 ELSE 0 END) AS UnreadCount
            FROM (
                SELECT
                    CASE WHEN SenderID = ? THEN ReceiverID ELSE SenderID END AS partner_id,
                    Timestamp, Message, SenderID, IsRead
                FROM Chat
                WHERE SenderID = ? OR ReceiverID = ?
            ) t
            GROUP BY partner_id
        `, [userId, userId, userId, userId]);

        const summaryMap = {};
        summary.forEach(s => { summaryMap[s.ContactID] = s; });

        const enriched = contacts.map(c => ({
            ...c,
            LastMessage: summaryMap[c.ContactID]?.LastMessage || null,
            LastMessageTime: summaryMap[c.ContactID]?.LastMessageTime || null,
            UnreadCount: Number(summaryMap[c.ContactID]?.UnreadCount || 0),
        }));

        // Sort by most recent conversation first, contacts with no messages go last
        enriched.sort((a, b) => {
            if (!a.LastMessageTime) return 1;
            if (!b.LastMessageTime) return -1;
            return new Date(b.LastMessageTime) - new Date(a.LastMessageTime);
        });

        res.json(enriched);
    } catch (err) {
        console.error('getChatContacts error:', err.message, err.sql || '');
        res.status(500).json({ message: "Error fetching contacts", detail: err.message });
    }
};

// Get Unread Count
const getUnreadCount = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await db.query(`
            SELECT COUNT(*) as count FROM Chat
            WHERE ReceiverID = ? AND IsRead = FALSE
        `, [userId]);
        res.json({ count: rows[0].count });
    } catch (err) {
        res.status(500).json({ message: "Error fetching unread count" });
    }
};

// Create Announcement (Admin)
const createAnnouncement = async (req, res) => {
    const { title, content, targetAudience, grade } = req.body;
    const adminId = req.user.id;
    const finalTarget = targetAudience || 'All';
    const finalGrade = grade || 'All';

    try {
        await db.query(
            "INSERT INTO Announcement (AdminID, Title, Content, TargetAudience, Grade, Date) VALUES (?, ?, ?, ?, ?, NOW())",
            [adminId, title, content, finalTarget, finalGrade]
        );

        let targetUsers = [];
        if (finalTarget === 'All') {
            const [users] = await db.query("SELECT UserID FROM User WHERE Role IN ('teacher', 'parent')");
            targetUsers = users.map(u => u.UserID);
        } else if (finalTarget === 'Teachers') {
            const [users] = await db.query("SELECT UserID FROM User WHERE Role = 'teacher'");
            targetUsers = users.map(u => u.UserID);
        } else if (finalTarget === 'Students') {
            if (finalGrade === 'All') {
                const [users] = await db.query("SELECT UserID FROM User WHERE Role = 'parent'");
                targetUsers = users.map(u => u.UserID);
            } else {
                const [users] = await db.query(`
                    SELECT DISTINCT u.UserID 
                    FROM User u
                    JOIN Student s ON u.UserID = s.ParentID
                    WHERE u.Role = 'parent' AND s.Grade = ?
                `, [finalGrade]);
                targetUsers = users.map(u => u.UserID);
            }
        }

        for (const uid of targetUsers) {
            await createNotification(uid, `Announcement: ${title}`, content, 'SYSTEM');
        }

        res.status(201).json({ message: "Announcement published" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating announcement" });
    }
};

// Get Announcements (Filtered by user)
const getAnnouncements = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        let query = "SELECT * FROM Announcement";
        let params = [];

        if (role === 'admin') {
            query += " ORDER BY Date DESC";
        } else if (role === 'teacher') {
            query += " WHERE TargetAudience IN ('All', 'Teachers') ORDER BY Date DESC";
        } else if (role === 'parent') {
            const [children] = await db.query("SELECT Grade FROM Student WHERE ParentID = ?", [userId]);
            const parentGrades = children.map(c => String(c.Grade));

            if (parentGrades.length > 0) {
                const gradeMarks = parentGrades.map(() => '?').join(',');
                query += ` WHERE TargetAudience = 'All' OR (TargetAudience = 'Students' AND (Grade = 'All' OR Grade IN (${gradeMarks}))) ORDER BY Date DESC`;
                params.push(...parentGrades);
            } else {
                query += " WHERE TargetAudience = 'All' OR (TargetAudience = 'Students' AND Grade = 'All') ORDER BY Date DESC";
            }
        }

        const [announcements] = await db.query(query, params);
        res.json(announcements);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching announcements" });
    }
};

module.exports = {
    sendMessage,
    getChatHistory,
    getChatContacts,
    getUnreadCount,
    createAnnouncement,
    getAnnouncements,
    deleteChat
};
