const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Test token route
router.get('/test-token', (req, res) => {
    const token = jwt.sign({ id: 'test-message' }, process.env.JWT_SECRET);
    res.json({ token });
});

// Message routes
router.get('/', authenticateToken, messageController.getAllMessages);
router.get('/:id', authenticateToken, messageController.getMessage);
router.post('/create', authenticateToken, messageController.createMessage);

module.exports = router;