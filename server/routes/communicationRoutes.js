const express = require('express');
const router = express.Router();
const { createAnnouncement, getAnnouncements, getNotifications, getChatContacts, getChatHistory, sendMessage, getUnreadCount, deleteChat } = require('../controllers/communicationController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.post('/announcements', verifyToken, verifyRole(['admin', 'tutor']), createAnnouncement);
router.get('/announcements', verifyToken, getAnnouncements);
router.get('/notifications', verifyToken, getNotifications);

// Chat Routes
router.get('/contacts', verifyToken, verifyRole(['tutor', 'teacher', 'parent']), getChatContacts);
router.get('/messages/:contactId', verifyToken, verifyRole(['tutor', 'teacher', 'parent']), getChatHistory); // Updated to getChatHistory
router.post('/messages', verifyToken, verifyRole(['tutor', 'teacher', 'parent']), sendMessage);
router.delete('/messages/:contactId', verifyToken, verifyRole(['tutor', 'teacher', 'parent']), deleteChat); // NEW: Delete Conversation
router.get('/unread-count', verifyToken, verifyRole(['tutor', 'teacher', 'parent', 'student']), getUnreadCount);

module.exports = router;
