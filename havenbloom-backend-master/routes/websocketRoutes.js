const express = require('express');
const router = express.Router();
const { getConnectionStats } = require('../services/websocketService');
const { authenticateToken } = require('../middleware/auth');

// Get WebSocket connection statistics
router.get('/status', authenticateToken, (req, res) => {
    try {
        const stats = getConnectionStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get WebSocket statistics',
            details: error.message
        });
    }
});

module.exports = router;