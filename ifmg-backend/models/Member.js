const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
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
        // Legacy values — kept so existing DB docs don't break
        "Aadhar Card",
        "Driving Licence",
        "Police Clearance",
        "Other",
      ],
    },
    icon: {
      type:    String,
      enum:    ["id", "card", "shield", "car", "fileText", "users"],
      default: "fileText",
    },
    status: {
      type:    String,
      enum:    ["pending", "verified", "rejected"],
      default: "verified",
    },
    cloudinaryPublicId: String,
    fileUrl:            String,
    fileName:           String,
    fileSize:           Number,
    mimeType:           String,
    uploadedAt:         { type: Date, default: Date.now },
    verifiedAt:         Date,
    notes:              String,
  },
  { _id: true }
);

const memberSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Name is required"],
      trim:     true,
    },
    initials: String,
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
    city: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "City",
      required: [true, "City is required"],
    },
    profilePicUrl:      String,
    profilePicPublicId: String,
    joined: {
      type:    String,
      default: () => {
        const d = new Date();
        return d.toLocaleString("en-US", { month: "short", year: "numeric" });
      },
    },
    isActive: { type: Boolean, default: true },
    docs:     [documentSchema],
  },
  { timestamps: true }
);

memberSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.initials = this.name
      .split(" ")
      .map(w => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  next();
});

module.exports = mongoose.model("Member", memberSchema);