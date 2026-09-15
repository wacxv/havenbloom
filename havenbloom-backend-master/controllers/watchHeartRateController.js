const WatchHeartRate = require('../models/watchHeartRateModel');

// NOTE: These controllers are now for MANUAL data entry only
// MQTT data is broadcast-only and NOT saved to database

// Create new record (for manual entry)
exports.createWatchHeartRate = async (req, res) => {
    try {
        const { bpm, patientId } = req.body;
        
        if (!patientId) {
            return res.status(400).json({
                success: false,
                error: 'patientId is required'
            });
        }
        
        const record = await WatchHeartRate.create({ 
            bpm,
            patientId: patientId
        });
        res.status(201).json({
            success: true,
            message: 'Manual heart rate record created',
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
exports.getAllWatchHeartRates = async (req, res) => {
    try {
        const { patientId } = req.query;
        const filter = patientId ? { patientId } : {};
        
        const records = await WatchHeartRate.find(filter)
            .sort({ timestamp: -1 });
        res.status(200).json({
            success: true,
            count: records.length,
            data: records,
            note: "These are saved records only. Live MQTT data is broadcast-only."
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

// Get single record by ID
exports.getWatchHeartRate = async (req, res) => {
    try {
        const record = await WatchHeartRate.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.status(200).json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update record
exports.updateWatchHeartRate = async (req, res) => {
    try {
        const record = await WatchHeartRate.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.status(200).json(record);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete record
exports.deleteWatchHeartRate = async (req, res) => {
    try {
        const record = await WatchHeartRate.findByIdAndDelete(req.params.id);
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.status(200).json({ message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};