# IFMG Backend — Setup & Deployment Guide

**Stack:** Node.js · Express · MongoDB Atlas · Cloudinary · Render (backend) · Vercel (frontend)

---

## 📁 Folder Structure

```
server/
├── config/
│   └── cloudinary.js       ← Cloudinary + Multer config
├── middleware/
│   └── auth.js             ← JWT protect middleware
├── models/
│   ├── Admin.js            ← Admin user schema
│   ├── City.js             ← City schema
│   └── Member.js           ← Member + documents sub-schema
├── routes/
│   ├── auth.js             ← POST /login, GET /me
│   ├── cities.js           ← CRUD cities
│   ├── members.js          ← CRUD members
│   └── documents.js        ← Upload/verify/delete docs (Cloudinary)
├── utils/
│   └── seed.js             ← One-time DB seed script
├── server.js               ← Entry point
├── .env.example            ← Copy to .env and fill in values
└── package.json
```

---

## 🚀 Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your actual values (see sections below)
```

### 3. Seed the database (first time only)
```bash
npm run seed
```
This creates all 71 cities + the admin user in MongoDB Atlas.

### 4. Start dev server
```bash
npm run dev     # nodemon (auto-restart)
npm start       # production
```

---

## 🍃 MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free **M0** cluster
3. Under **Database Access** → create a user with read/write permissions
4. Under **Network Access** → Add IP `0.0.0.0/0` (allow all, required for Render)
5. Click **Connect** → **Drivers** → copy the connection string
6. Replace `<password>` and set `<dbname>` to `ifmg`

```
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/ifmg?retryWrites=true&w=majority
```

---

## ☁️ Cloudinary Setup

1. Sign up at [cloudinary.com](https://cloudinary.com) (free tier: 25 GB storage)
2. Go to **Dashboard** → copy Cloud Name, API Key, API Secret

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret_here
```

Member documents are stored at: `ifmg/members/{memberId}/documents/`

---

## 🚢 Deploy to Render (Backend)

1. Push this `server/` folder to a GitHub repo
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Add all **Environment Variables** from `.env.example` in the Render dashboard
6. Deploy! Your API URL will be: `https://ifmg-backend.onrender.com`

> ⚠️ Free Render instances spin down after 15 min of inactivity. Upgrade to a paid plan for production.

---

## ▲ Deploy to Vercel (Frontend)

1. In your frontend `src/`, replace all `dummyData` calls with API calls (see Integration section below)
2. Push frontend to GitHub
3. Go to [vercel.com](https://vercel.com) → **New Project** → import repo
4. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-render-url.onrender.com/api
   ```
5. Deploy!

---

## 🔌 Frontend Integration Guide

Replace `dummyData` imports with these API calls:

### Fetch Cities (CitiesPage.js)
```js
// Replace: import { CITIES } from "../data/dummyData"
const res = await fetch(`${process.env.REACT_APP_API_URL}/cities`);
const { cities } = await res.json();
// cities = [{ id, name, slug, memberCount }]
```

### Fetch Members (MembersPage.js)
```js
// Replace: generateMembers(city.name)
const res = await fetch(`${process.env.REACT_APP_API_URL}/members?cityId=${city.id}`);
const { members } = await res.json();
```

### Admin Login (AdminLoginModal.js)
```js
const res = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const { token } = await res.json();
localStorage.setItem("ifmg_token", token);
```

### Upload Document (AdminDashboard.js)
```js
const form = new FormData();
form.append("file", fileInput.files[0]);
form.append("docType", selectedDocType);

const res = await fetch(`${process.env.REACT_APP_API_URL}/documents/upload/${memberId}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
```

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | ❌ | Admin login → returns JWT |
| GET | `/api/auth/me` | ✅ | Get current admin info |
| POST | `/api/auth/change-password` | ✅ | Change admin password |
| GET | `/api/cities` | ❌ | List all active cities |
| POST | `/api/cities` | ✅ | Add a new city |
| PATCH | `/api/cities/:id` | ✅ | Rename / deactivate city |
| DELETE | `/api/cities/:id` | ✅ | Delete city (soft if has members) |
| GET | `/api/members?cityId=` | ❌ | List members (filter by city) |
| GET | `/api/members/:id` | ❌ | Get single member profile |
| POST | `/api/members` | ✅ | Add new member |
| PATCH | `/api/members/:id` | ✅ | Update member details |
| DELETE | `/api/members/:id` | ✅ | Deactivate member |
| POST | `/api/documents/upload/:memberId` | ✅ | Upload doc to Cloudinary |
| GET | `/api/documents/all/list` | ✅ | All docs (Delete Doc tab) |
| GET | `/api/documents/:memberId` | ✅ | Docs for one member |
| PATCH | `/api/documents/:memberId/:docId/verify` | ✅ | Verify/reject document |
| DELETE | `/api/documents/:memberId/:docId` | ✅ | Delete doc from Cloudinary |

✅ = requires `Authorization: Bearer <token>` header
