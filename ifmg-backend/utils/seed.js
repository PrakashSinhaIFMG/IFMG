/**
 * Seed script — run once to populate DB with cities and admin user
 * Usage: node utils/seed.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Admin    = require("../models/Admin");
const City     = require("../models/City");

const CITIES = [
  "Agra","Ahmedabad","Aurangabad","Bangalore","Bangalore-1","Bangalore-2",
  "Bareilly","Belagavi","Bhagalpur","Bhopal","Bhubaneswar","Chandigarh",
  "Chennai","Davanagere","Dhanbad","Dharwad","Durgapur","Faridabad",
  "Firozabad","Ghandinagar","Ghaziabad","Gorakhpur","Gulbarga","Gurgaon",
  "Gurgaon-1","Guwahati","Gwalior","Haridwar","Howrah","Hisar","Hubli",
  "Hyderabad","Indore","Jabalpur","Jaipur","Jamshedpur","Jhansi","Jodhpur",
  "Kanpur","Kharagpur","Kolkata","Kolkata-1","Kota","Lucknow","Ludhiana",
  "Madurai","Mangaluru","Meerut","Mumbai","Mumbai-1","Mundra","Nagpur",
  "Nashik","New Delhi","New Delhi-1","Noida","Patna","Prayagraj","Pune",
  "Pune-1","Raigarh","Raipur","Rajkot","Ranchi","Rudrapur","Singrauli",
  "Siliguri","Sonbhadra","Surat","Vadodara","Varanasi","Vijayawada","Visakhapatnam",
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB Atlas");

  // ─── Seed Cities ─────────────────────────────────────────────────────────
  let cityCount = 0;
  for (const name of CITIES) {
    const exists = await City.findOne({ name });
    if (!exists) {
      await City.create({ name });
      cityCount++;
    }
  }
  console.log(`🏙️  Cities seeded: ${cityCount} new (${CITIES.length} total)`);

  // ─── Seed Admin ───────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@swiftmove.in";
  const adminPass  = process.env.ADMIN_PASSWORD || "admin123";

  const existingAdmin = await Admin.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await Admin.create({ email: adminEmail, password: adminPass, name: "Super Admin" });
    console.log(`👤 Admin created: ${adminEmail}`);
  } else {
    console.log(`👤 Admin already exists: ${adminEmail}`);
  }

  console.log("✅ Seed complete!");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
