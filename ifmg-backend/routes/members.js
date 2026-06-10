const express  = require("express");
const Member   = require("../models/Member");
const City     = require("../models/City");
const { protect }  = require("../middleware/auth");
const { cloudinary } = require("../config/cloudinary");
const multer   = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const router = express.Router();

// ── Profile pic storage ───────────────────────────────────────────────────────
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:          "ifmg/members/profiles",
    allowed_formats: ["jpg", "jpeg", "png"],
    resource_type:   "image",
    public_id:       `profile_${Date.now()}`,
    transformation:  [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" }],
  }),
});

const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG/PNG allowed for profile pic"), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ─── GET /api/members ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { cityId, cityName, limit = 50, page = 1 } = req.query;
    const filter = { isActive: true };

    if (cityId) {
      filter.city = cityId;
    } else if (cityName) {
      const city = await City.findOne({ name: new RegExp(`^${cityName}$`, "i") });
      if (!city) return res.json({ success: true, count: 0, total: 0, members: [] });
      filter.city = city._id;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [members, total] = await Promise.all([
      Member.find(filter)
        .populate("city", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Member.countDocuments(filter),
    ]);

    const formatted = members.map(m => ({
      id:            m._id,
      name:          m.name,
      initials:      m.initials,
      phone:         m.phone,
      email:         m.email,
      joined:        m.joined,
      city:          m.city,
      profilePicUrl: m.profilePicUrl || null,
      docs: m.docs.map(d => ({
        id:      d._id,
        type:    d.type,
        icon:    d.icon,
        status:  d.status,
        date:    d.uploadedAt
          ? new Date(d.uploadedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "",
        fileUrl:  d.fileUrl,
        mimeType: d.mimeType,
      })),
    }));

    res.json({ success: true, count: formatted.length, total, page: Number(page), members: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch members." });
  }
});

// ─── GET /api/members/:id ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).populate("city", "name slug");
    if (!member || !member.isActive) {
      return res.status(404).json({ success: false, message: "Member not found." });
    }
    res.json({ success: true, member });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch member." });
  }
});

// ─── POST /api/members ────────────────────────────────────────────────────────
// Admin only — accepts multipart/form-data (profilePic optional)
router.post(
  "/",
  protect,
  uploadProfile.single("profilePic"),
  async (req, res) => {
    const { name, phone, email, cityId } = req.body;

    if (!name || !phone || !cityId) {
      if (req.file) await cloudinary.uploader.destroy(req.file.filename);
      return res.status(400).json({ success: false, message: "Name, phone, and cityId are required." });
    }

    try {
      const city = await City.findById(cityId);
      if (!city) {
        if (req.file) await cloudinary.uploader.destroy(req.file.filename);
        return res.status(404).json({ success: false, message: "City not found." });
      }

      const memberData = { name, phone, email, city: cityId };
      if (req.file) {
        memberData.profilePicUrl      = req.file.path;      // Cloudinary secure URL
        memberData.profilePicPublicId = req.file.filename;  // For future deletion
      }

      const member = await Member.create(memberData);
      await City.findByIdAndUpdate(cityId, { $inc: { memberCount: 1 } });
      await member.populate("city", "name slug");

      res.status(201).json({ success: true, member });
    } catch (err) {
      console.error(err);
      if (req.file) await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
      res.status(500).json({ success: false, message: "Failed to create member." });
    }
  }
);

// ─── PATCH /api/members/:id ───────────────────────────────────────────────────
router.patch("/:id", protect, uploadProfile.single("profilePic"), async (req, res) => {
  try {
    const allowed = ["name", "phone", "email", "isActive"];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (req.file) {
      // Delete old profile pic from Cloudinary
      const existing = await Member.findById(req.params.id);
      if (existing?.profilePicPublicId) {
        await cloudinary.uploader.destroy(existing.profilePicPublicId).catch(() => {});
      }
      updates.profilePicUrl      = req.file.path;
      updates.profilePicPublicId = req.file.filename;
    }

    const member = await Member.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true,
    }).populate("city", "name slug");

    if (!member) return res.status(404).json({ success: false, message: "Member not found." });
    res.json({ success: true, member });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update member." });
  }
});

// ─── DELETE /api/members/:id ──────────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!member) return res.status(404).json({ success: false, message: "Member not found." });
    await City.findByIdAndUpdate(member.city, { $inc: { memberCount: -1 } });
    res.json({ success: true, message: "Member deactivated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete member." });
  }
});

module.exports = router;