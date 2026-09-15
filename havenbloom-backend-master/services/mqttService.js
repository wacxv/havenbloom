const mqtt = require('mqtt');
const mongoose = require('mongoose');
const FetalHeartRate = require('../models/fetalHeartRateModel');
const WatchHeartRate = require('../models/watchHeartRateModel');
const Device = require('../models/deviceModel');
const { broadcastBpmData } = require('./websocketService');

const mqttURL = process.env.MQTT_URL || 'wss://test.mosquitto.org:8081';
const fetalTopic = '20heartbeat/bpm';
const watchTopic = '69heartrate/bpm';

const topicDeviceMap = {
    [fetalTopic]: 'DOPPLER-001',
    [watchTopic]: 'SMARTWATCH-001'
};

let fetalBpmBuffer = {};
let watchBpmBuffer = {};
let fetalIntervalId = null;
let watchIntervalId = null;
let fetalNoDataTimeout = null;
let watchNoDataTimeout = null;

// Track device activity timeouts
let deviceInactivityTimeouts = new Map();

async function getDeviceInfo(deviceId) {
    try {
        const device = await Device.findOne({ deviceId: deviceId });
        if (!device) {
            console.warn(`Device not found in database: ${deviceId}`);
            return null;
        }
        console.log(`Device found: ${deviceId}, Type: ${device.type}, AssignedPatient: ${device.patientId || 'None'}`);
        return device;
    } catch (error) {
        console.error('Error finding device:', error);
        return null;
    }
}

async function patchDeviceActive(deviceId, isActive) {
    try {
        const updateData = { 
            isActive: isActive,
            lastDataReceived: new Date()
        };
        
        const updatedDevice = await Device.findOneAndUpdate(
            { deviceId: deviceId },
            updateData,
            { new: true }
        );
        
        if (updatedDevice) {
            console.log(`✅ Device ${deviceId} patched - isActive: ${isActive}`);
        } else {
            console.warn(`⚠️ Device ${deviceId} not found when trying to patch status`);
        }
        
        return updatedDevice;
    } catch (error) {
        console.error(`❌ Error patching device ${deviceId} status:`, error);
        return null;
    }
}

function resetDeviceInactivityTimeout(deviceId) {
    // Clear existing timeout if any
    if (deviceInactivityTimeouts.has(deviceId)) {
        clearTimeout(deviceInactivityTimeouts.get(deviceId));
    }
    
    // Set new timeout - mark device as inactive after 30 seconds of no data
    const timeout = setTimeout(async () => {
        console.log(`⏰ No data from device ${deviceId} for 5 seconds. Marking as inactive.`);
        await patchDeviceActive(deviceId, false);
        deviceInactivityTimeouts.delete(deviceId);
    }, 5 * 1000); // 5 seconds
    
    deviceInactivityTimeouts.set(deviceId, timeout);
}

function validateAndCleanBuffer(buffer, type) {
    const invalidKeys = [];
    Object.keys(buffer).forEach(key => {
        if (!key || 
            key === 'null' || 
            key === 'undefined' || 
            key === 'false' ||
            key === 'true' ||
            typeof key !== 'string' ||
            !key.match(/^[0-9a-fA-F]{24}$/)) {
            invalidKeys.push(key);
        }
    });
    invalidKeys.forEach(key => {
        console.warn(`🧹 Cleaning invalid ${type} buffer key: "${key}"`);
        delete buffer[key];
    });
    return invalidKeys.length;
}

async function processBpmReading(device, bpm) {
    try {
        console.log(`📡 Processing BPM reading - DeviceId: ${device.deviceId}, PatientId: ${device.patientId || 'None'}, BPM: ${bpm}`);
        
        // Patch device as active when data is received
        await patchDeviceActive(device.deviceId, true);
        
        // Reset inactivity timeout for this device
        resetDeviceInactivityTimeout(device.deviceId);
        
        const broadcastPayload = {
            deviceId: device.deviceId,
            patientId: device.patientId ? device.patientId.toString() : null,
            bpm: Number(bpm),
            timestamp: new Date().toISOString(),
            type: device.type
        };
        broadcastBpmData(broadcastPayload);
        console.log(`📤 Broadcasted live BPM data for device ${device.deviceId}`);
        
        if (device.patientId) {
            const patientIdString = device.patientId.toString();
            if (patientIdString.match(/^[0-9a-fA-F]{24}$/)) {
                console.log(`✅ Valid patientId for buffering: ${patientIdString}`);
                const deviceType = (device.type || '').toLowerCase();

                if (deviceType === 'doppler') {
                    const cleanedCount = validateAndCleanBuffer(fetalBpmBuffer, 'fetal');
                    console.log(`🧹 Cleaned ${cleanedCount} invalid fetal buffer entries`);
                    if (!fetalBpmBuffer[patientIdString]) fetalBpmBuffer[patientIdString] = [];
                    fetalBpmBuffer[patientIdString].push(Number(bpm));
                    console.log(`📋 Buffered fetal BPM for patient ${patientIdString}: ${bpm} (total: ${fetalBpmBuffer[patientIdString].length})`);

                    if (!fetalIntervalId) {
                        console.log(`🔄 Starting 1-minute fetal BPM buffering interval`);
                        fetalIntervalId = setInterval(() => {
                            console.log(`⏰ Fetal interval triggered`);
                            saveBufferedData('fetal');
                        }, 60 * 1000);
                    }
                    resetFetalNoDataTimeout();
                }
                else if (deviceType === 'smartwatch') {
                    const cleanedCount = validateAndCleanBuffer(watchBpmBuffer, 'watch');
                    console.log(`🧹 Cleaned ${cleanedCount} invalid watch buffer entries`);
                    if (!watchBpmBuffer[patientIdString]) watchBpmBuffer[patientIdString] = [];
                    watchBpmBuffer[patientIdString].push(Number(bpm));
                    console.log(`📋 Buffered watch BPM for patient ${patientIdString}: ${bpm} (total: ${watchBpmBuffer[patientIdString].length})`);

                    if (!watchIntervalId) {
                        console.log(`🔄 Starting 1-minute watch BPM buffering interval`);
                        watchIntervalId = setInterval(() => {
                            console.log(`⏰ Watch interval triggered`);
                            saveBufferedData('watch');
                        }, 60 * 1000);
                    }
                    resetWatchNoDataTimeout();
                }
                else {
                    console.warn(`⚠️ Device type "${device.type}" not recognized for buffering`);
                }
            } else {
                console.warn(`❌ Invalid patientId format for buffering: ${patientIdString}`);
            }
        } else {
            console.log(`⚠️ Skipping buffering - Device ${device.deviceId} not assigned to any patient`);
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Error processing BPM reading:`, error);
        return false;
    }
}

async function saveBufferedData(type) {
    try {
        const buffer = type === 'fetal' ? fetalBpmBuffer : watchBpmBuffer;
        const Model = type === 'fetal' ? FetalHeartRate : WatchHeartRate;
        console.log(`💾 Saving buffered ${type} data, keys:`, Object.keys(buffer));

        const validPatientIds = [];
        Object.keys(buffer).forEach(key => {
            if (key && key.match(/^[0-9a-fA-F]{24}$/)) validPatientIds.push(key);
            else delete buffer[key];
        });

        for (const patientId of validPatientIds) {
            const bpmArray = buffer[patientId];
            if (!Array.isArray(bpmArray) || bpmArray.length === 0) continue;

            try {
                const bpmString = bpmArray.join(',');
                const now = new Date();
                const savedRecord = await Model.create({
                    patientId: new mongoose.Types.ObjectId(patientId),
                    bpm: bpmString,
                    timestamp: now
                });
                console.log(`✅ Saved ${type} HR aggregate for ${patientId}: ${savedRecord._id}`);
                buffer[patientId] = [];
            } catch (err) {
                console.error(`❌ Error saving ${type} HR for patient ${patientId}:`, err.message);
                buffer[patientId] = [];
            }
        }
    } catch (error) {
        console.error(`❌ Error in saveBufferedData for ${type}:`, error);
    }
}

function resetFetalNoDataTimeout() {
    if (fetalNoDataTimeout) clearTimeout(fetalNoDataTimeout);
    fetalNoDataTimeout = setTimeout(() => {
        console.log('⏰ No fetal BPM data for 2 minutes. Stopping buffering.');
        if (fetalIntervalId) {
            clearInterval(fetalIntervalId);
            fetalIntervalId = null;
        }
        saveBufferedData('fetal');
        fetalBpmBuffer = {};
    }, 120 * 1000);
}

function resetWatchNoDataTimeout() {
    if (watchNoDataTimeout) clearTimeout(watchNoDataTimeout);
    watchNoDataTimeout = setTimeout(() => {
        console.log('⏰ No watch BPM data for 2 minutes. Stopping buffering.');
        if (watchIntervalId) {
            clearInterval(watchIntervalId);
            watchIntervalId = null;
        }
        saveBufferedData('watch');
        watchBpmBuffer = {};
    }, 120 * 1000);
}

async function handleMqttMessage(topic, message) {
    try {
        console.log(`📨 MQTT Message Received - Topic: ${topic}, Payload: ${message.toString()}`);
        let deviceId, bpm;
        const messageStr = message.toString().trim();

        try {
            const data = JSON.parse(messageStr);
            if (data && data.deviceId && data.bpm) {
                deviceId = data.deviceId;
                bpm = data.bpm;
                if (isNaN(Number(bpm))) return;
                console.log(`📡 JSON format detected - DeviceId: ${deviceId}, BPM: ${bpm}`);
            } else throw new Error();
        } catch {
            const bpmValue = Number(messageStr);
            if (isNaN(bpmValue)) return;
            bpm = bpmValue;
            if (topic === fetalTopic) deviceId = topicDeviceMap[fetalTopic];
            else if (topic === watchTopic) deviceId = topicDeviceMap[watchTopic];
            else return;
            console.log(`📡 Simple format detected - Topic: ${topic}, BPM: ${bpm}, Mapped DeviceId: ${deviceId}`);
        }

        const device = await getDeviceInfo(deviceId);
        if (!device) return;

        const processed = await processBpmReading(device, bpm);
        if (processed) console.log(`✅ Processed MQTT message for ${deviceId}`);
    } catch (error) {
        console.error(`❌ Error handling MQTT message:`, error);
    }
}

function startMqttListener() {
    const client = mqtt.connect(mqttURL);
    client.on('connect', () => {
        console.log('🔗 Connected to MQTT broker');
        client.subscribe([fetalTopic, watchTopic], err => {
            if (err) console.error('❌ MQTT subscribe error:', err);
            else console.log(`📡 Subscribed to topics: ${fetalTopic}, ${watchTopic}`);
        });
    });
    client.on('message', handleMqttMessage);
    client.on('error', error => console.error('❌ MQTT connection error:', error));
    client.on('disconnect', () => console.log('❌ Disconnected from MQTT broker'));
}

// Clean up timeouts on service shutdown
function stopMqttService() {
    // Clear all device inactivity timeouts
    deviceInactivityTimeouts.forEach((timeout, deviceId) => {
        clearTimeout(timeout);
        console.log(`🧹 Cleared inactivity timeout for device ${deviceId}`);
    });
    deviceInactivityTimeouts.clear();
    
    // Clear other timeouts
    if (fetalNoDataTimeout) clearTimeout(fetalNoDataTimeout);
    if (watchNoDataTimeout) clearTimeout(watchNoDataTimeout);
    if (fetalIntervalId) clearInterval(fetalIntervalId);
    if (watchIntervalId) clearInterval(watchIntervalId);
}

module.exports = { 
    startMqttListener, 
    handleMqttMessage, 
    getDeviceInfo, 
    processBpmReading, 
    saveBufferedData,
    stopMqttService
};
