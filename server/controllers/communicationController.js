const db = require('../config/db');

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
        let query = `
            SELECT DISTINCT u.UserID AS ContactID, u.FullName AS ContactName, u.Role, s.SubjectName
            FROM Chat c
            JOIN User u ON (c.SenderID = u.UserID OR c.ReceiverID = u.UserID)
            LEFT JOIN TeacherSubject ts ON u.UserID = ts.TeacherID
            LEFT JOIN Subject s ON ts.SubjectID = s.SubjectID
            WHERE (c.SenderID = ? OR c.ReceiverID = ?)
            AND u.UserID != ?
        `;
        const params = [userId, userId, userId];

        // Teachers also see all parents of their enrolled students (even if no prior chat)
        if (userRole === 'teacher') {
            query += `
                UNION
                SELECT DISTINCT u.UserID AS ContactID, u.FullName AS ContactName, 'parent' as Role, sub.SubjectName
                FROM TeacherSubject ts
                JOIN Subject sub ON ts.SubjectID = sub.SubjectID
                JOIN SubjectGrade sg ON sub.SubjectID = sg.SubjectID
                JOIN Enrollment e ON sg.SubjectGradeID = e.SubjectGradeID
                JOIN Student st ON e.StudentID = st.StudentID
                JOIN User u ON st.ParentID = u.UserID
                WHERE ts.TeacherID = ?
             `;
            params.push(userId);
        }

        const [contacts] = await db.query(query, params);

        if (contacts.length === 0) return res.json([]);

        // Enrich each contact with last message preview and per-contact unread count
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

        // Sort by most recent conversation first
        enriched.sort((a, b) => {
            if (!a.LastMessageTime) return 1;
            if (!b.LastMessageTime) return -1;
            return new Date(b.LastMessageTime) - new Date(a.LastMessageTime);
        });

        console.log("Contacts found:", enriched.length);
        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching contacts" });
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
    const { title, content, targetGroup } = req.body;

    try {
        await db.query(
            "INSERT INTO Announcement (Title, Content, Date) VALUES (?, ?, NOW())",
            [title, content]
        );
        res.status(201).json({ message: "Announcement published" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating announcement" });
    }
};

// Get Announcements (All users)
const getAnnouncements = async (req, res) => {
    try {
        const [announcements] = await db.query("SELECT * FROM Announcement ORDER BY Date DESC");
        res.json(announcements);
    } catch (err) {
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
