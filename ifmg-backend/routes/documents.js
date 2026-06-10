const express  = require("express");
const Member   = require("../models/Member");
const { protect }       = require("../middleware/auth");
const { cloudinary, uploadDocument } = require("../config/cloudinary");

const router = express.Router();

// ─── POST /api/documents/upload/:memberId ─────────────────────────────────────
// Public — members upload their own documents (no admin token required)
router.post(
  "/upload/:memberId",
  uploadDocument.single("file"), // ← protect removed so members can upload
  async (req, res) => {
    try {
      const { memberId } = req.params;
      const { docType }  = req.body;

      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
      }

      const member = await Member.findById(memberId);
      if (!member || !member.isActive) {
        await cloudinary.uploader.destroy(req.file.filename);
        return res.status(404).json({ success: false, message: "Member not found." });
      }

      // Map docType to icon
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

      const newDoc = {
        type:               docType || "Other",
        icon:               iconMap[docType] || "fileText",
        status:             "verified", // auto-verified on upload
        cloudinaryPublicId: req.file.filename,
        fileUrl:            req.file.path,
        fileName:           req.file.originalname,
        fileSize:           req.file.size,
        mimeType:           req.file.mimetype,
        uploadedAt:         new Date(),
      };

      // Replace existing doc of same type instead of duplicating
      const existingIdx = member.docs.findIndex(d => d.type === newDoc.type);
      if (existingIdx >= 0) {
        const old = member.docs[existingIdx];
        if (old.cloudinaryPublicId) {
          const oldIsPdf = old.mimeType === "application/pdf";
          await cloudinary.uploader.destroy(old.cloudinaryPublicId, {
            resource_type: oldIsPdf ? "raw" : "image",
          }).catch(() => {});
        }
        member.docs[existingIdx] = newDoc;
      } else {
        member.docs.push(newDoc);
      }

      // Sync profilePicUrl on member root field when Profile Photo is uploaded
      if (docType === "Profile Photo") {
        member.profilePicUrl      = req.file.path;
        member.profilePicPublicId = req.file.filename;
      }

      await member.save();

      const savedDoc = existingIdx >= 0
        ? member.docs[existingIdx]
        : member.docs[member.docs.length - 1];

      res.status(201).json({
        success: true,
        message: "Document uploaded successfully.",
        profilePicUrl: docType === "Profile Photo" ? req.file.path : undefined,
        doc: {
          id:       savedDoc._id,
          type:     savedDoc.type,
          icon:     savedDoc.icon,
          status:   savedDoc.status,
          fileUrl:  savedDoc.fileUrl,
          mimeType: savedDoc.mimeType,
          date:     new Date(savedDoc.uploadedAt).toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
          }),
        },
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ success: false, message: err.message || "Upload failed." });
    }
  }
);

// ─── PATCH /api/documents/:memberId/:docId/verify ─────────────────────────────
router.patch("/:memberId/:docId/verify", protect, async (req, res) => {
  try {
    const { memberId, docId } = req.params;
    const { status, notes }   = req.body;

    if (!["verified", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ success: false, message: "Member not found." });

    const doc = member.docs.id(docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found." });

    doc.status = status;
    if (notes) doc.notes = notes;
    if (status === "verified") doc.verifiedAt = new Date();

    await member.save();
    res.json({ success: true, message: `Document marked as ${status}.`, doc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update document status." });
  }
});

// ─── DELETE /api/documents/:memberId/:docId ───────────────────────────────────
router.delete("/:memberId/:docId", protect, async (req, res) => {
  try {
    const { memberId, docId } = req.params;

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ success: false, message: "Member not found." });

    const doc = member.docs.id(docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found." });

    // Delete from Cloudinary
    if (doc.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(doc.cloudinaryPublicId, { resource_type: "auto" });
      } catch (cloudErr) {
        console.warn("Cloudinary delete warning:", cloudErr.message);
      }
    }

    // ✅ Fix: use pull instead of deprecated subdoc.deleteOne()
    member.docs.pull({ _id: docId });
    await member.save();

    res.json({ success: true, message: "Document deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete document." });
  }
});

// ─── GET /api/documents/:memberId ────────────────────────────────────────────
router.get("/:memberId", protect, async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId).select("name docs");
    if (!member) return res.status(404).json({ success: false, message: "Member not found." });

    res.json({ success: true, memberName: member.name, docs: member.docs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch documents." });
  }
});

// ─── GET /api/documents/all/list ─────────────────────────────────────────────
router.get("/all/list", protect, async (req, res) => {
  try {
    const members = await Member.find({ isActive: true })
      .select("name docs city")
      .populate("city", "name");

    const allDocs = [];
    members.forEach((m) => {
      m.docs.forEach((d) => {
        allDocs.push({
          docId:      d._id,
          memberId:   m._id,
          memberName: m.name,
          city:       m.city?.name || "",
          type:       d.type,
          icon:       d.icon,
          status:     d.status,
          fileUrl:    d.fileUrl,
          uploadedAt: d.uploadedAt,
          name: `${m.name} — ${d.type}`,
          sub:  `${m.city?.name || ""} · ${timeAgo(d.uploadedAt)}`,
        });
      });
    });

    res.json({ success: true, count: allDocs.length, docs: allDocs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch documents." });
  }
});

function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hrs   = Math.floor(mins / 60);
  const days  = Math.floor(hrs  / 24);
  if (days  > 0) return `${days} day${days  > 1 ? "s" : ""} ago`;
  if (hrs   > 0) return `${hrs} hr${hrs   > 1 ? "s" : ""} ago`;
  return `${mins} min${mins > 1 ? "s" : ""} ago`;
}

module.exports = router;