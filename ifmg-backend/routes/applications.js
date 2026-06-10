const express      = require("express");
const Application  = require("../models/Application");
const Member       = require("../models/Member");
const City         = require("../models/City");
const { protect }  = require("../middleware/auth");
const { cloudinary } = require("../config/cloudinary");
const multer       = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const router = express.Router();

// ── Cloudinary storage for application docs ───────────────────────────────────
const appDocStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === "application/pdf";
    return {
      folder:        "ifmg/applications",
      resource_type: isPdf ? "raw" : "image",  // PDFs must use "raw", not "auto"
      public_id:     `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      // No transformation, no allowed_formats — avoids Cloudinary format rejections
    };
  },
});

const uploadAppDoc = multer({
  storage: appDocStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, PDF allowed"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── POST /api/applications ───────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: "Name and phone are required." });
    }
    const application = await Application.create({ name, phone, email });
    res.status(201).json({ success: true, applicationId: application._id });
  } catch (err) {
    console.error("Application create error:", err);
    res.status(500).json({ success: false, message: "Failed to submit application." });
  }
});

// ─── POST /api/applications/:applicationId/upload ─────────────────────────────
router.post(
  "/:applicationId/upload",
  uploadAppDoc.single("file"),
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const { docType }       = req.body;

      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
      }

      const application = await Application.findById(applicationId);
      if (!application || application.status !== "pending") {
        try {
          await cloudinary.uploader.destroy(req.file.filename, {
            resource_type: req.file.mimetype === "application/pdf" ? "raw" : "image",
          });
        } catch (_) {}
        return res.status(404).json({ success: false, message: "Application not found or already processed." });
      }

      const newDoc = {
        type:               docType,
        fileUrl:            req.file.path,       // Cloudinary secure_url
        cloudinaryPublicId: req.file.filename,
        mimeType:           req.file.mimetype,
        uploadedAt:         new Date(),
      };

      // Replace existing doc of same type
      const existingIdx = application.docs.findIndex(d => d.type === docType);
      if (existingIdx >= 0) {
        const old = application.docs[existingIdx];
        if (old.cloudinaryPublicId) {
          try {
            await cloudinary.uploader.destroy(old.cloudinaryPublicId, {
              resource_type: old.mimeType === "application/pdf" ? "raw" : "image",
            });
          } catch (_) {}
        }
        application.docs[existingIdx] = newDoc;
      } else {
        application.docs.push(newDoc);
      }

      await application.save();

      res.status(201).json({
        success: true,
        doc: { type: newDoc.type, fileUrl: newDoc.fileUrl, mimeType: newDoc.mimeType },
      });
    } catch (err) {
      console.error("App doc upload error:", err.message);
      res.status(500).json({ success: false, message: err.message || "Upload failed." });
    }
  }
);

// ─── GET /api/applications ────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const filter = status === "all" ? {} : { status };
    const apps = await Application.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: apps.length, applications: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch applications." });
  }
});

// ─── POST /api/applications/:id/approve ──────────────────────────────────────
router.post("/:id/approve", protect, async (req, res) => {
  try {
    const { cityId } = req.body;
    if (!cityId) {
      return res.status(400).json({ success: false, message: "cityId is required to approve." });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }
    if (application.status !== "pending") {
      return res.status(400).json({ success: false, message: "Application already processed." });
    }

    // Support both MongoDB ObjectId and slug/name (in case frontend sends either)
    const mongoose = require("mongoose");
    const isObjectId = mongoose.Types.ObjectId.isValid(cityId) && String(new mongoose.Types.ObjectId(cityId)) === cityId;
    const city = isObjectId
      ? await City.findById(cityId)
      : await City.findOne({ $or: [{ slug: cityId }, { name: new RegExp(`^${cityId}$`, "i") }] });
    if (!city) {
      return res.status(404).json({ success: false, message: "City not found." });
    }

    const iconMap = {
      "Profile Photo":     "users",
      "Aadhar Card Front": "id",
      "Aadhar Card Back":  "id",
      "PAN Card":          "card",
      "GST Certificate":   "shield",
      "MSME Certificate":  "shield",
      "Electricity Bill":  "fileText",
      "Office Photo":      "fileText",
    };

    const memberDocs = application.docs.map(d => ({
      type:               d.type,
      icon:               iconMap[d.type] || "fileText",
      status:             "verified",
      cloudinaryPublicId: d.cloudinaryPublicId,
      fileUrl:            d.fileUrl,
      mimeType:           d.mimeType,
      uploadedAt:         d.uploadedAt,
    }));

    const profileDoc   = application.docs.find(d => d.type === "Profile Photo");
    const member = await Member.create({
      name:          application.name,
      phone:         application.phone,
      email:         application.email,
      city:          city._id,              // always use resolved ObjectId
      profilePicUrl: profileDoc?.fileUrl || null,
      docs:          memberDocs,
    });

    await City.findByIdAndUpdate(city._id, { $inc: { memberCount: 1 } });

    application.status           = "approved";
    application.assignedCityId   = city._id;   // always ObjectId
    application.assignedCityName = city.name;
    application.memberId         = member._id;
    application.reviewedAt       = new Date();
    await application.save();

    res.json({ success: true, message: "Application approved. Member created.", memberId: member._id });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to approve application." });
  }
});

// ─── POST /api/applications/:id/reject ───────────────────────────────────────
router.post("/:id/reject", protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }
    if (application.status !== "pending") {
      return res.status(400).json({ success: false, message: "Application already processed." });
    }
    application.status          = "rejected";
    application.rejectionReason = reason || "";
    application.reviewedAt      = new Date();
    await application.save();
    res.json({ success: true, message: "Application rejected." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to reject application." });
  }
});

module.exports = router;