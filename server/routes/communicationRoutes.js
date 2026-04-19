const express = require('express');
const router = express.Router();
const {
    createAnnouncement, getAnnouncements,
    getChatContacts, getChatHistory, sendMessage, getUnreadCount, deleteChat
} = require('../controllers/communicationController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Announcement routes — fixed: 'tutor' → 'teacher'
router.post('/announcements', verifyToken, verifyRole(['admin', 'teacher']), createAnnouncement);
router.get('/announcements', verifyToken, getAnnouncements);

// Chat Routes — fixed: removed stale 'tutor' role (schema only has 'teacher')
router.get('/contacts',              verifyToken, verifyRole(['teacher', 'parent']), getChatContacts);
router.get('/messages/:contactId',   verifyToken, verifyRole(['teacher', 'parent']), getChatHistory);
router.post('/messages',             verifyToken, verifyRole(['teacher', 'parent']), sendMessage);
router.delete('/messages/:contactId',verifyToken, verifyRole(['teacher', 'parent']), deleteChat);
router.get('/unread-count',          verifyToken, verifyRole(['teacher', 'parent', 'admin']), getUnreadCount);

module.exports = router;
