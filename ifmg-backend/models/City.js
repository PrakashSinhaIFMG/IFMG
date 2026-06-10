const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "City name is required"],
      unique:   true,
      trim:     true,
    },
    slug: {
      type:   String,
      unique: true,
      // e.g. "new-delhi", "mumbai-1"
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    memberCount: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name before save
citySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }
  next();
});

module.exports = mongoose.model("City", citySchema);
