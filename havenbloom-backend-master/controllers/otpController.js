const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const Otp = require("../models/otpModel");
const User = require("../models/userModel");
const Patient = require("../models/patientModel");
const Doctor = require("../models/doctorModel");

// Debug environment variables
console.log('🔍 Email User:', process.env.EMAIL_USER);
console.log('🔍 Email Pass exists:', !!process.env.EMAIL_PASS);
console.log('🔍 Email Pass length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'undefined');

// Configure nodemailer transporter with explicit SMTP settings
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test the connection on startup (but don't fail if it doesn't work)
transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ Email configuration error:', error.message);
    console.log('💡 Make sure EMAIL_USER and EMAIL_PASS are set in .env file');
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP for password reset
const sendPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    // Check if email credentials are properly configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email credentials not found in environment variables');
      return res.status(500).json({ 
        success: false, 
        message: "Email service not configured properly" 
      });
    }

    // Check if user exists in any of the user tables
    const user = await User.findOne({ email }) ||
                 await Patient.findOne({ email }) ||
                 await Doctor.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User with this email does not exist" 
      });
    }

    // Delete any existing OTPs for this email
    await Otp.deleteMany({ email });

    // Generate new OTP
    const otp = generateOTP();

    // Save OTP to database
    await Otp.create({ email, otp });

    // Email template
    const mailOptions = {
      from: `"HavenBloom" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "HavenBloom - Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h1>HavenBloom</h1>
            <h2>Password Reset Request</h2>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9;">
            <p>Hello,</p>
            <p>You have requested to reset your password. Please use the following OTP to proceed:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 24px; font-weight: bold; background-color: #e8f5e8; padding: 10px 20px; border-radius: 5px; letter-spacing: 3px;">${otp}</span>
            </div>
            <p><strong>This OTP is valid for 5 minutes only.</strong></p>
            <p>If you did not request this password reset, please ignore this email.</p>
            <p>Best regards,<br>HavenBloom Team</p>
          </div>
          <div style="background-color: #333; color: white; text-align: center; padding: 10px;">
            <p style="margin: 0; font-size: 12px;">© 2025 HavenBloom. All rights reserved.</p>
          </div>
        </div>
      `
    };

    // Send email with better error handling
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', info.messageId);

    res.status(200).json({ 
      success: true, 
      message: "OTP sent successfully to your email" 
    });

  } catch (error) {
    console.error("Error sending OTP:", error.message);
    
    // Handle specific Gmail errors
    if (error.code === 'EAUTH') {
      return res.status(500).json({ 
        success: false, 
        message: "Email authentication failed. Please check your Gmail settings." 
      });
    }
    
    if (error.code === 'ENOTFOUND') {
      return res.status(500).json({ 
        success: false, 
        message: "Network error. Please check your internet connection." 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to send OTP. Please try again." 
    });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and OTP are required" 
      });
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({ email, otp, used: false });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired OTP" 
      });
    }

    // Mark OTP as used
    otpRecord.used = true;
    await otpRecord.save();

    res.status(200).json({ 
      success: true, 
      message: "OTP verified successfully" 
    });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to verify OTP. Please try again." 
    });
  }
};

// Reset password after OTP verification
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, otp } = req.body;

    if (!email || !newPassword || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email, new password, and OTP are required" 
      });
    }

    // Verify OTP one more time
    const otpRecord = await Otp.findOne({ email, otp, used: true });

    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid OTP or OTP not verified" 
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in appropriate user table
    let updated = false;
    
    // Try updating in User table
    const userUpdate = await User.findOneAndUpdate(
      { email }, 
      { password: hashedPassword }
    );
    if (userUpdate) updated = true;

    // Try updating in Patient table
    if (!updated) {
      const patientUpdate = await Patient.findOneAndUpdate(
        { email }, 
        { password: hashedPassword }
      );
      if (patientUpdate) updated = true;
    }

    // Try updating in Doctor table
    if (!updated) {
      const doctorUpdate = await Doctor.findOneAndUpdate(
        { email }, 
        { password: hashedPassword }
      );
      if (doctorUpdate) updated = true;
    }

    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Delete all OTPs for this email after successful reset
    await Otp.deleteMany({ email });

    res.status(200).json({ 
      success: true, 
      message: "Password reset successful" 
    });

  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to reset password. Please try again." 
    });
  }
};

module.exports = {
  sendPasswordResetOTP,
  verifyOTP,
  resetPassword
};