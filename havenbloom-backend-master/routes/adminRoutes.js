const express = require('express');
const router = express.Router();
const Admin = require('../models/adminModel');
const { authenticateToken } = require('../middleware/auth');

// Get all admin proajhisbdf,nmasbndmnfbasdf
router.get('/', authenticateToken, async (req, res) => {
    try {
        const admins = await Admin.find();
        res.json(admins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific admin profile
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.json(admin);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
