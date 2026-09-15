const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');

const messageSchema = new mongoose.Schema({
    sender_id: {
        type: String,  // Change to String to match with user_id
        required: true
    },
    receiver_id: {
        type: String,  // Change to String to match with user_id
        required: true
    },
    room: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true,
        set: function(message) {
            // Encrypt message before saving
            return CryptoJS.AES.encrypt(message, process.env.MESSAGE_SECRET).toString();
        },
        get: function(encryptedMessage) {
            // Decrypt message when retrieving
            if (encryptedMessage) {
                const bytes = CryptoJS.AES.decrypt(encryptedMessage, process.env.MESSAGE_SECRET);
                return bytes.toString(CryptoJS.enc.Utf8);
            }
            return '';
        }
    },
    time_sent: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'patient_message',
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

messageSchema.pre('find', function() {
  // Add this to log what's happening
  console.log('Message find operation');
});

messageSchema.set('toJSON', {
  transform: function(doc, ret) {
    // Ensure message is decrypted in JSON response
    if (ret.message) {
      try {
        // Check if already decrypted (to avoid double-decryption errors)
        if (ret.message.includes('U2F') || ret.message.includes('==')) {
          const bytes = CryptoJS.AES.decrypt(ret.message, process.env.MESSAGE_SECRET);
          ret.message = bytes.toString(CryptoJS.enc.Utf8);
        }
      } catch (error) {
        console.log('Could not decrypt message:', error.message);
      }
    }
    return ret;
  }
});

messageSchema.methods.decryptMessage = function() {
  try {
    const bytes = CryptoJS.AES.decrypt(this.message, process.env.MESSAGE_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return '[Encrypted message]';
  }
};

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;