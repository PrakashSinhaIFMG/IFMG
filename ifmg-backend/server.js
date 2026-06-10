const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes     = require("./routes/auth");
const cityRoutes     = require("./routes/cities");
const memberRoutes   = require("./routes/members");
const documentRoutes = require("./routes/documents");
const appRoutes      = require("./routes/applications");

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:3000",
  // Add your Vercel production URL after first deploy, e.g.:
  // "https://ifmg.vercel.app",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    // Allow any vercel.app preview/production URL automatically
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow if FRONTEND_URL env var matches
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many login attempts, please try again later." },
});
app.use("/api/auth/", authLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/cities",       cityRoutes);
app.use("/api/members",      memberRoutes);
app.use("/api/documents",    documentRoutes);
app.use("/api/applications", appRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "IFMG API is running", timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ─── Database & Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Atlas connected");
    app.listen(PORT, () => console.log(`🚀 IFMG Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = app;