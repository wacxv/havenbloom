const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

// Track decryption errors to avoid spam
let fetalDecryptionErrorCount = 0;
const MAX_ERROR_LOGS = 5;

const fetalHeartRateSchema = new mongoose.Schema({
    patientId: { // Changed from assignedUserId to patientId
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient', // Changed from User to Patient
        default: null
    },
    bpm: {
        type: String,
        required: true,
        trim: true,
        set: function(bpm) {
            // Encrypt bpm before saving
            return CryptoJS.AES.encrypt(bpm, process.env.DEVICE_SECRET).toString();
        },
        get: function(encryptedBpm) {
            // Decrypt bpm when retrieving
            if (encryptedBpm) {
                try {
                    // Check if the data looks like encrypted data
                    if (encryptedBpm.length > 20 && (encryptedBpm.includes('U2F') || encryptedBpm.includes('=='))) {
                        const bytes = CryptoJS.AES.decrypt(encryptedBpm, process.env.DEVICE_SECRET);
                        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
                        
                        // If decryption results in empty string or malformed data, return original
                        if (decrypted && decrypted.length > 0) {
                            return decrypted;
                        }
                    }
                    // Return original data if it doesn't look encrypted or decryption failed
                    return encryptedBmp;
                } catch (error) {
                    // Only log first few errors to avoid spam
                    if (fetalDecryptionErrorCount < MAX_ERROR_LOGS) {
                        console.error('Decryption error for fetal heart rate bpm:', error.message);
                        fetalDecryptionErrorCount++;
                        if (fetalDecryptionErrorCount === MAX_ERROR_LOGS) {
                            console.log('Fetal heart rate: Suppressing further decryption error logs...');
                        }
                    }
                    // Return original data if decryption fails
                    return encryptedBpm;
                }
            }
            return '';
        }
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    }
}, {
    collection: 'fetal-heart-rate',
    timestamps: true
});

// Compound index for efficient patient-specific time-range queries
fetalHeartRateSchema.index({ patientId: 1, timestamp: -1 });

// Virtual to parse BPM string into array of numbers
fetalHeartRateSchema.virtual('bpmArray').get(function() {
    if (!this.bpm) return [];
    return this.bpm.split(',').map(val => parseFloat(val.trim())).filter(val => !isNaN(val));
});

// Virtual to get average BPM from the array
fetalHeartRateSchema.virtual('averageBpm').get(function() {
    const bpmArray = this.bpmArray;
    if (bpmArray.length === 0) return 0;
    const sum = bpmArray.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / bpmArray.length);
});

fetalHeartRateSchema.methods.decryptBpm = function() {
  try {
    if (this.bpm && this.bpm.length > 20 && (this.bpm.includes('U2F') || this.bmp.includes('=='))) {
      const bytes = CryptoJS.AES.decrypt(this.bpm, process.env.DEVICE_SECRET);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted && decrypted.length > 0 ? decrypted : this.bpm;
    }
    return this.bpm || '';
  } catch (error) {
    // Silent fallback for method calls
    return this.bmp || '[Encrypted bpm]';
  }
};

// Configure toJSON to include virtuals and use getters (which will decrypt)
fetalHeartRateSchema.set('toJSON', { 
    virtuals: true,
    getters: true 
});

fetalHeartRateSchema.set('toObject', { 
    virtuals: true,
    getters: true 
});

module.exports = mongoose.model('FetalHeartRate', fetalHeartRateSchema);