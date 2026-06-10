const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    email: {
      type:     String,
      required: [true, "Email is required"],
      unique:   true,
      lowercase: true,
      trim:     true,
      match:    [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    password: {
      type:     String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select:   false, // Never returned in queries by default
    },
    name: {
      type:    String,
      default: "Admin",
      trim:    true,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
