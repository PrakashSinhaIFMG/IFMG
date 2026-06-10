/**
 * api.js — Central API service for IFMG frontend
 * All backend communication goes through here.
 * Base URL is read from REACT_APP_API_URL env var (set in .env)
 */

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// ─── Token helpers ─────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem("ifmg_token");
export const setToken = (t) => localStorage.setItem("ifmg_token", t);
export const clearToken = () => localStorage.removeItem("ifmg_token");

// ─── Core fetch wrapper ────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    // Surface the backend message, fallback to HTTP status text
    throw new Error(data.message || res.statusText);
  }
  return data;
}

// Multipart (file upload) — no Content-Type header so browser sets boundary
async function upload(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request("/auth/me"),

  changePassword: (currentPassword, newPassword) =>
    request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ─── Cities ────────────────────────────────────────────────────────────────────
export const citiesAPI = {
  // Public
  getAll: () => request("/cities"),

  getById: (id) => request(`/cities/${id}`),

  // Admin only
  create: (name) =>
    request("/cities", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  update: (id, updates) =>
    request(`/cities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  remove: (id) =>
    request(`/cities/${id}`, { method: "DELETE" }),
};

// ─── Members ───────────────────────────────────────────────────────────────────
export const membersAPI = {
  // Public — pass cityId or cityName
  getByCityId: (cityId) => request(`/members?cityId=${cityId}`),

  getByCityName: (cityName) =>
    request(`/members?cityName=${encodeURIComponent(cityName)}`),

  getById: (id) => request(`/members/${id}`),

  // Admin only
  create: (payload) =>
    request("/members", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id, updates) =>
    request(`/members/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  deactivate: (id) =>
    request(`/members/${id}`, { method: "DELETE" }),

  // Overview — recent members (first page, small limit)
  getRecent: (limit = 5) => request(`/members?limit=${limit}&page=1`),

  // Stats — total count
  getStats: () => request("/members?limit=1&page=1"),
};

// ─── Documents ─────────────────────────────────────────────────────────────────
export const docsAPI = {
  // Admin only
  getAllDocs: () => request("/documents/all/list"),

  getMemberDocs: (memberId) => request(`/documents/${memberId}`),

  uploadDoc: (memberId, file, docType) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docType", docType);
    return upload(`/documents/upload/${memberId}`, fd);
  },

  verifyDoc: (memberId, docId, status, notes) =>
    request(`/documents/${memberId}/${docId}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }),

  deleteDoc: (memberId, docId) =>
    request(`/documents/${memberId}/${docId}`, { method: "DELETE" }),
};