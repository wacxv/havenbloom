const Prescription = require('../models/prescriptionModel');

// Get all prescriptions
const getAllPrescriptions = async (req, res) => {
    try {
        const prescriptions = await Prescription.find({})
            .populate('doctor_id', 'title first_name last_name specialization')
            .populate('patient_id', 'first_name last_name');

        const formattedPrescriptions = prescriptions.map(prescription => ({
            ...prescription.toJSON(),
            doctor_id: prescription.doctor_id ? {
                _id: prescription.doctor_id._id,
                title: prescription.doctor_id.title,
                first_name: prescription.doctor_id.first_name,
                last_name: prescription.doctor_id.last_name,
                specialization: prescription.doctor_id.specialization,
                full_name: `${prescription.doctor_id.title} ${prescription.doctor_id.first_name} ${prescription.doctor_id.last_name}`,
                id: prescription.doctor_id._id
            } : null,
            patient_id: prescription.patient_id ? {
                _id: prescription.patient_id._id,
                first_name: prescription.patient_id.first_name,
                last_name: prescription.patient_id.last_name,
                full_name: `${prescription.patient_id.first_name} ${prescription.patient_id.last_name}`,
                id: prescription.patient_id._id
            } : null
        }));

        res.status(200).json(formattedPrescriptions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get prescription by ID
const getPrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id)
            .populate('doctor_id', 'title first_name last_name specialization')
            .populate('patient_id', 'first_name last_name');

        if (!prescription) {
            return res.status(404).json({ error: 'Prescription not found' });
        }

        const formattedPrescription = {
            ...prescription.toJSON(),
            doctor_id: prescription.doctor_id ? {
                _id: prescription.doctor_id._id,
                title: prescription.doctor_id.title,
                first_name: prescription.doctor_id.first_name,
                last_name: prescription.doctor_id.last_name,
                specialization: prescription.doctor_id.specialization,
                full_name: `${prescription.doctor_id.title} ${prescription.doctor_id.first_name} ${prescription.doctor_id.last_name}`,
                id: prescription.doctor_id._id
            } : null,
            patient_id: prescription.patient_id ? {
                _id: prescription.patient_id._id,
                first_name: prescription.patient_id.first_name,
                last_name: prescription.patient_id.last_name,
                full_name: `${prescription.patient_id.first_name} ${prescription.patient_id.last_name}`,
                id: prescription.patient_id._id
            } : null
        };

        res.status(200).json(formattedPrescription);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create prescription
const createPrescription = async (req, res) => {
    try {
        console.log('Creating prescription:', req.body);
        const prescription = await Prescription.create(req.body);
        res.status(201).json(prescription);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update prescription
const updatePrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!prescription) {
            return res.status(404).json({ error: 'Prescription not found' });
        }
        res.status(200).json(prescription);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getAllPrescriptions,
    getPrescription,
    createPrescription,
    updatePrescription
};