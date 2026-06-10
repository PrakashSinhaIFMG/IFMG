const express = require("express");
const jwt     = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const Admin   = require("../models/Admin");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Helper: sign JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req, res) => {
    // Validate
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Find admin with password field included
      const admin = await Admin.findOne({ email }).select("+password");
      if (!admin || !(await admin.comparePassword(password))) {
        return res.status(401).json({ success: false, message: "Invalid credentials." });
      }

      // Update last login
      admin.lastLogin = new Date();
      await admin.save({ validateBeforeSave: false });

      const token = signToken(admin._id);

      res.json({
        success: true,
        token,
        admin: {
          id:        admin._id,
          email:     admin.email,
          name:      admin.name,
          lastLogin: admin.lastLogin,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, message: "Server error during login." });
    }
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    admin: {
      id:        req.admin._id,
      email:     req.admin.email,
      name:      req.admin.name,
      lastLogin: req.admin.lastLogin,
    },
  });
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Current password required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const admin = await Admin.findById(req.admin._id).select("+password");
      if (!(await admin.comparePassword(currentPassword))) {
        return res.status(401).json({ success: false, message: "Current password is incorrect." });
      }

      admin.password = newPassword;
      await admin.save();

      res.json({ success: true, message: "Password changed successfully." });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error." });
    }
  }
);

module.exports = router;
