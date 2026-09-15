const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const deviceController = require('../controllers/deviceController');
const { authenticateToken } = require('../middleware/auth');

// Test route (no auth required for testing)
router.get('/test-token', async (req, res) => {
    try {
        const token = jwt.sign({ id: 'test-device' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ 
            success: true,
            token,
            message: 'Test token generated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to generate test token'
        });
    }
});

// Apply authentication middleware to protected routes
router.use(authenticateToken);

// GET /api/devices - Get all devices with optional type filter
router.get('/', deviceController.getAllDevices);

// GET /api/devices/:id - Get single device by ID
router.get('/:id', deviceController.getDeviceById);

// PATCH /api/devices/:id/connect - Connect device to user
router.patch('/:id/connect', deviceController.connectDevice);

// PATCH /api/devices/:id/disconnect - Disconnect device from user
router.patch('/:id/disconnect', deviceController.disconnectDevice);

module.exports = router;