const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

// Маршрути для чату
router.post('/', authMiddleware, messageController.sendMessage);
router.get('/conversations', authMiddleware, messageController.getConversations);
router.get('/unread', authMiddleware, messageController.getUnreadCount);
router.get('/:otherUserId/:listingId', authMiddleware, messageController.getMessages);
router.patch('/:messageId/read', authMiddleware, messageController.markAsRead);

module.exports = router;