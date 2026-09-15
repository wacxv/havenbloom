const Doctor = require('../models/doctorModel');

// Get all doctors
const getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find({}).sort({ full_name: 1 });
        res.status(200).json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get single doctor
const getDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findById(id);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.status(200).json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create new doctor
const createDoctor = async (req, res) => {
    try {
        console.log('Creating doctor with data:', req.body);

        const { 
            user_id, 
            title,
            first_name,
            last_name,
            specialization, 
            gender, 
            license_number, 
            contact_number, 
            schedule_info,
            hospital_clinic
        } = req.body;

        // Validate required fields
        if (!user_id || !title || !first_name || !last_name || !specialization || 
            !gender || !license_number || !contact_number || !schedule_info) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: [
                    'user_id', 'title', 'first_name', 'last_name', 
                    'specialization', 'gender', 'license_number', 
                    'contact_number', 'schedule_info'
                ]
            });
        }

        const doctor = await Doctor.create({ 
            user_id, 
            title,
            first_name,
            last_name,
            specialization, 
            gender, 
            license_number, 
            contact_number, 
            schedule_info,
            hospital_clinic
        });

        console.log('Doctor created successfully:', doctor);
        res.status(201).json(doctor);
    } catch (error) {
        console.error('Doctor creation error:', error);
        res.status(400).json({ 
            error: 'Failed to create doctor',
            details: error.message 
        });
    }
};

// Update doctor
const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findByIdAndUpdate(id, req.body, { 
            new: true, 
            runValidators: true 
        });
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.status(200).json(doctor);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete doctor
const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findByIdAndDelete(id);
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.status(200).json({ message: 'Doctor deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Get doctor by user_id
const getDoctorByUserId = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.params.userId });
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }
        res.status(200).json(doctor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllDoctors,
    getDoctor,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    getDoctorByUserId
};
