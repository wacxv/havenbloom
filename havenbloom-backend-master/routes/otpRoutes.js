// filepath: c:\Users\wacxv\OneDrive\Desktop\THESIS WEB APP\havenbloom-backend\routes\otpRoutes.js
const express = require("express");
const router = express.Router();
const {
  sendPasswordResetOTP,
  verifyOTP,
  resetPassword
} = require("../controllers/otpController");

// Send OTP for password reset
router.post("/send-password-reset-otp", sendPasswordResetOTP);

// Verify OTP
router.post("/verify-otp", verifyOTP);

// Reset password
router.post("/reset-password", resetPassword);

module.exports = router;