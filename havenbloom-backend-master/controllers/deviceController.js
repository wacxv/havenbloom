const Device = require('../models/deviceModel');
const Patient = require('../models/patientModel');
const { broadcastBpmData } = require('../services/websocketService');

// GET /api/devices - Get all devices with optional type filter
exports.getAllDevices = async (req, res) => {
    try {
        const { type } = req.query;
        const filter = type ? { type } : {};
        
        const devices = await Device.find(filter)
            .populate('patientId') // Changed from assignedUserId to patientId
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: devices.length,
            data: devices
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch devices',
            details: error.message
        });
    }
};

// GET /api/devices/:id - Get single device by _id
exports.getDeviceById = async (req, res) => {
    try {
        const device = await Device.findOne({ deviceId: req.params.id })
            .populate('patientId'); // Changed from assignedUserId to patientId

        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        res.json({
            success: true,
            data: device
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch device',
            details: error.message
        });
    }
};

// PATCH /api/devices/:id/connect - Connect device to patient
exports.connectDevice = async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const { patientId } = req.body;

    console.log('Connect request received:');
    console.log('Device ID:', deviceId);
    console.log('Patient ID:', patientId);

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(400).json({ error: 'Patient not found' });
    }

    const device = await Device.findOneAndUpdate(
      { deviceId },
      { 
        patientId: patientId,
        connectedAt: new Date()
      },
      { new: true }
    ).populate('patientId', 'first_name last_name email');

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    console.log('Device updated:', device);
    res.json({
      success: true,
      message: 'Device connected successfully',
      data: device
    });
  } catch (error) {
    console.error('Error in connectDevice:', error);
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/devices/:id/disconnect - Disconnect device from patient
exports.disconnectDevice = async (req, res) => {
  try {
    const { id: deviceId } = req.params;

    console.log('Disconnect request received for device:', deviceId);

    const device = await Device.findOneAndUpdate(
      { deviceId },
      { 
        patientId: null,
        connectedAt: null
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    console.log('Device disconnected:', device);
    res.json({
      success: true,
      message: 'Device disconnected successfully',
      data: device
    });
  } catch (error) {
    console.error('Error in disconnectDevice:', error);
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/devices/:id - Update device
exports.updateDevice = async (req, res) => {
    try {
        const { id: deviceId } = req.params;
        const updates = req.body;

        const device = await Device.findOneAndUpdate(
            { deviceId },
            updates,
            { new: true, runValidators: true }
        ).populate('patientId'); // Changed from assignedUserId to patientId

        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        res.json({
            success: true,
            message: 'Device updated successfully',
            data: device
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update device',
            details: error.message
        });
    }
};

// DELETE /api/devices/:id - Delete device
exports.deleteDevice = async (req, res) => {
    try {
        const { id: deviceId } = req.params;

        const device = await Device.findOneAndDelete({ deviceId });

        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        res.json({
            success: true,
            message: 'Device deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete device',
            details: error.message
        });
    }
};

// GET /api/devices/:id/status - Get device status
exports.getDeviceStatus = async (req, res) => {
    try {
        const { id: deviceId } = req.params;

        const device = await Device.findOne({ deviceId })
            .populate('patientId', 'first_name last_name email');

        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }

        const status = {
            deviceId: device.deviceId,
            type: device.type,
            isConnected: !!device.patientId,
            isActive: device.isActive,
            connectedAt: device.connectedAt,
            assignedPatient: device.patientId
        };

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get device status',
            details: error.message
        });
    }
};

// Other methods remain the same...
exports.createDevice = async (req, res) => {
    try {
        const { deviceId, type } = req.body;

        const device = new Device({
            deviceId,
            type,
            isActive: true
        });

        await device.save();

        res.status(201).json({
            success: true,
            message: 'Device created successfully',
            data: device
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Device ID already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create device',
            details: error.message
        });
    }
};

// POST /api/devices/:id/heartrate - Receive heart rate data from smartwatch (NO DATABASE SAVE)
exports.receiveHeartRateData = async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const { bpm, timestamp } = req.body;

    console.log('Heart rate data received:', { deviceId, bpm, timestamp });

    if (!bpm || isNaN(bpm)) {
      return res.status(400).json({ error: 'Valid BPM value is required' });
    }

    // Find the device and get the assigned patient
    const device = await Device.findOne({ deviceId }).populate('patientId');
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (!device.patientId) {
      return res.status(400).json({ error: 'Device not assigned to any patient' });
    }

    // ONLY BROADCAST VIA WEBSOCKET - NO DATABASE SAVE
    broadcastBpmData({
      bpm: parseInt(bpm),
      deviceType: 'smartwatch',
      timestamp: timestamp || new Date().toISOString(),
      patientId: device.patientId._id.toString(),
      deviceId: device.deviceId
    });

    res.json({
      success: true,
      message: 'Heart rate data broadcasted live',
      data: {
        deviceId: device.deviceId,
        bpm: parseInt(bpm),
        deviceType: 'smartwatch',
        patientId: device.patientId._id,
        timestamp: timestamp || new Date().toISOString(),
        saved: false // Indicates this is live data only
      }
    });

  } catch (error) {
    console.error('Error receiving heart rate data:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/devices/:id/fetal-heartrate - Receive fetal heart rate data from doppler (NO DATABASE SAVE)
exports.receiveFetalHeartRateData = async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const { bpm, timestamp } = req.body;

    console.log('Fetal heart rate data received:', { deviceId, bpm, timestamp });

    if (!bpm || isNaN(bpm)) {
      return res.status(400).json({ error: 'Valid BPM value is required' });
    }

    // Find the device and get the assigned patient
    const device = await Device.findOne({ deviceId }).populate('patientId');
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (!device.patientId) {
      return res.status(400).json({ error: 'Device not assigned to any patient' });
    }

    // ONLY BROADCAST VIA WEBSOCKET - NO DATABASE SAVE
    broadcastBpmData({
      bpm: parseInt(bpm),
      deviceType: 'doppler',
      timestamp: timestamp || new Date().toISOString(),
      patientId: device.patientId._id.toString(),
      deviceId: device.deviceId
    });

    res.json({
      success: true,
      message: 'Fetal heart rate data broadcasted live',
      data: {
        deviceId: device.deviceId,
        bpm: parseInt(bpm),
        deviceType: 'doppler',
        patientId: device.patientId._id,
        timestamp: timestamp || new Date().toISOString(),
        saved: false // Indicates this is live data only
      }
    });

  } catch (error) {
    console.error('Error receiving fetal heart rate data:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/devices/:id/data - Generic endpoint for any live device data (NO DATABASE SAVE)
exports.receiveDeviceData = async (req, res) => {
  try {
    const { id: deviceId } = req.params;
    const { bpm, timestamp, type } = req.body;

    console.log('Live device data received:', { deviceId, bpm, timestamp, type });

    if (!bpm || isNaN(bpm)) {
      return res.status(400).json({ error: 'Valid BPM value is required' });
    }

    // Find the device and get the assigned patient
    const device = await Device.findOne({ deviceId }).populate('patientId');
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (!device.patientId) {
      return res.status(400).json({ error: 'Device not assigned to any patient' });
    }

    // Determine device type
    const deviceType = type || device.type;
    
    if (!['smartwatch', 'doppler'].includes(deviceType)) {
      return res.status(400).json({ error: 'Invalid device type. Must be smartwatch or doppler' });
    }

    // ONLY BROADCAST VIA WEBSOCKET - NO DATABASE SAVE
    broadcastBpmData({
      bpm: parseInt(bpm),
      deviceType: deviceType,
      timestamp: timestamp || new Date().toISOString(),
      patientId: device.patientId._id.toString(),
      deviceId: device.deviceId
    });

    res.json({
      success: true,
      message: `Live ${deviceType} data broadcasted`,
      data: {
        deviceId: device.deviceId,
        deviceType: deviceType,
        bpm: parseInt(bpm),
        patientId: device.patientId._id,
        timestamp: timestamp || new Date().toISOString(),
        saved: false // Indicates this is live data only
      }
    });

  } catch (error) {
    console.error('Error receiving device data:', error);
    res.status(500).json({ error: error.message });
  }
};