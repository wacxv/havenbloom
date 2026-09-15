const FetalHeartRate = require('../models/fetalHeartRateModel');

// Create new record
exports.createFetalHeartRate = async (req, res) => {
    try {
        const { bpm, patientId } = req.body;
        
        if (!patientId) {
            return res.status(400).json({
                success: false,
                error: 'patientId is required'
            });
        }
        
        const record = await FetalHeartRate.create({ 
            bpm,
            patientId: patientId
        });
        res.status(201).json({
            success: true,
            message: 'Manual fetal heart rate record created',
            data: record
        });
    } catch (error) {
        res.status(400).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Get all records (optionally filter by patientId)
exports.getAllFetalHeartRates = async (req, res) => {
    try {
        const { patientId } = req.query;
        const filter = patientId ? { patientId } : {};
        
        const records = await FetalHeartRate.find(filter)
            .sort({ timestamp: -1 });
        res.status(200).json({
            success: true,
            count: records.length,
            data: records
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Get single record by ID
exports.getFetalHeartRate = async (req, res) => {
    try {
        const record = await FetalHeartRate.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.status(200).json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update record by ID
exports.updateFetalHeartRate = async (req, res) => {
    try {
        const record = await FetalHeartRate.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.status(200).json(record);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete record by ID
exports.deleteFetalHeartRate = async (req, res) => {
    try {
        const record = await FetalHeartRate.findByIdAndDelete(req.params.id);
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.status(200).json({ message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};