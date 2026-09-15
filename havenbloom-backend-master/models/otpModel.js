const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true
  },
  otp: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 300 // 5 minutes expiry
  },
  used: {
    type: Boolean,
    default: false
  }
});

// Index for better query performance
otpSchema.index({ email: 1, otp: 1 });

module.exports = mongoose.model("Otp", otpSchema);