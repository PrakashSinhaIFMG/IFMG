const express = require("express");
const { body, param, validationResult } = require("express-validator");
const City    = require("../models/City");
const Member  = require("../models/Member");
const { protect } = require("../middleware/auth");

const router = express.Router();

// ─── GET /api/cities ──────────────────────────────────────────────────────────
// Public — returns all active cities (for CitiesPage)
router.get("/", async (req, res) => {
  try {
    const cities = await City.find({ isActive: true })
      .sort({ name: 1 })
      .select("_id name slug memberCount");

    // Shape matches frontend: { id, name }
    const formatted = cities.map((c, i) => ({
      id:          c._id,
      name:        c.name,
      slug:        c.slug,
      memberCount: c.memberCount,
    }));

    res.json({ success: true, count: formatted.length, cities: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch cities." });
  }
});

// ─── GET /api/cities/:id ──────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) return res.status(404).json({ success: false, message: "City not found." });
    res.json({ success: true, city });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch city." });
  }
});

// ─── POST /api/cities ─────────────────────────────────────────────────────────
// Admin only
router.post(
  "/",
  protect,
  [body("name").trim().notEmpty().withMessage("City name is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name } = req.body;

      // Check duplicate (case-insensitive)
      const exists = await City.findOne({ name: new RegExp(`^${name}$`, "i") });
      if (exists) {
        return res.status(409).json({ success: false, message: "City already exists." });
      }

      const city = await City.create({ name });
      res.status(201).json({ success: true, city });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to create city." });
    }
  }
);

// ─── PATCH /api/cities/:id ────────────────────────────────────────────────────
// Admin only — rename or toggle active
router.patch(
  "/:id",
  protect,
  async (req, res) => {
    try {
      const { name, isActive } = req.body;
      const updates = {};
      if (name)       updates.name = name.trim();
      if (isActive !== undefined) updates.isActive = isActive;

      const city = await City.findByIdAndUpdate(req.params.id, updates, {
        new: true, runValidators: true,
      });
      if (!city) return res.status(404).json({ success: false, message: "City not found." });

      res.json({ success: true, city });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to update city." });
    }
  }
);

// ─── DELETE /api/cities/:id ───────────────────────────────────────────────────
// Admin only — soft delete (sets isActive: false) unless no members
router.delete("/:id", protect, async (req, res) => {
  try {
    const memberCount = await Member.countDocuments({ city: req.params.id, isActive: true });
    if (memberCount > 0) {
      // Soft delete only — city has members
      const city = await City.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );
      return res.json({
        success: true,
        message: `City deactivated (${memberCount} members exist). Members preserved.`,
        city,
      });
    }

    // Hard delete if no members
    await City.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "City deleted permanently." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete city." });
  }
});

module.exports = router;
