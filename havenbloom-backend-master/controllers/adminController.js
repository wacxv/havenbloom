const Admin = require('../models/adminModel');

// Get all admins
const getAllAdmins = async (req, res) => {
    try {
        // Add logging
        console.log('Attempting to fetch admins...');
        
        const admins = await Admin.find({})
            .sort({ full_name: 1 })
            .lean();
        
        console.log('Fetched admins:', admins); // Debug log
        
        if (!admins || admins.length === 0) {
            return res.status(404).json({ error: 'No admins found' });
        }
        
        res.status(200).json(admins);
    } catch (error) {
        console.error('Admin query error:', error);
        res.status(500).json({ 
            error: 'Database operation failed', 
            details: error.message 
        });
    }
};

// Get single admin
const getAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findById(id);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(200).json(admin);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create new admin
const createAdmin = async (req, res) => {
    try {
        // Log incoming request
        console.log('Creating admin with data:', req.body);

        const { user_id, full_name, position, contact_number, profile_pic } = req.body;

        // Validate required fields
        if (!user_id || !full_name || !position || !contact_number) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['user_id', 'full_name', 'position', 'contact_number']
            });
        }

        const admin = await Admin.create({ 
            user_id, 
            full_name, 
            position, 
            contact_number, 
            profile_pic 
        });

        console.log('Admin created successfully:', admin);
        res.status(201).json(admin);
    } catch (error) {
        console.error('Admin creation error:', error);
        res.status(400).json({ 
            error: 'Failed to create admin',
            details: error.message 
        });
    }
};

// Update admin
const updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findByIdAndUpdate(
            id,
            { ...req.body },
            { new: true, runValidators: true }
        );
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(200).json(admin);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete admin
const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findByIdAndDelete(id);
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.status(200).json({ message: 'Admin deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Search admins
const searchAdmins = async (req, res) => {
    try {
        const { query } = req.params;
        const admins = await Admin.find({
            $or: [
                { full_name: { $regex: query, $options: 'i' } },
                { position: { $regex: query, $options: 'i' } }
            ]
        });
        res.status(200).json(admins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllAdmins,
    getAdmin,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    searchAdmins
};
