const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage for member documents
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const memberId = req.params.memberId || req.body.memberId || "unknown";
    return {
      folder:         `ifmg/members/${memberId}/documents`,
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      resource_type:  "auto",
      // Rename to: memberid_doctype_timestamp
      public_id: `${memberId}_${Date.now()}`,
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    };
  },
});

// File filter — only allow images & PDFs
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPG, PNG, and PDF are allowed."), false);
  }
};

const uploadDocument = multer({
  storage: documentStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = { cloudinary, uploadDocument };
