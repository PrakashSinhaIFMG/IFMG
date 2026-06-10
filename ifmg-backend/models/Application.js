const mongoose = require("mongoose");

const applicationDocSchema = new mongoose.Schema(
  {
    type: {
      type:     String,
      required: true,
      enum: [
        "Profile Photo",
        "Aadhar Card Front",
        "Aadhar Card Back",
        "PAN Card",
        "GST Certificate",
        "MSME Certificate",
        "Electricity Bill",
        "Office Photo",
      ],
    },
    fileUrl:            String,
    cloudinaryPublicId: String,
    mimeType:           String,
    uploadedAt:         { type: Date, default: Date.now },
  },
  { _id: true }
);

const applicationSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Name is required"],
      trim:     true,
    },
    phone: {
      type:     String,
      required: [true, "Phone is required"],
      trim:     true,
    },
    email: {
      type:      String,
      trim:      true,
      lowercase: true,
    },
    // Docs uploaded during application
    docs: [applicationDocSchema],

    // Status lifecycle: pending → approved / rejected
    status: {
      type:    String,
      enum:    ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Set when admin approves and assigns a city
    assignedCityId:   { type: mongoose.Schema.Types.ObjectId, ref: "City" },
    assignedCityName: String,

    // Reference to the created Member after approval
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },

    rejectionReason: String,
    reviewedAt:      Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", applicationSchema);