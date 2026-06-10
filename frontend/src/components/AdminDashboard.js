import { useState, useEffect, useRef, useCallback } from "react";
import { Icons } from "./Icons";
import { citiesAPI, membersAPI, docsAPI } from "../services/api";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const DOC_ICON_MAP = {
  id:       Icons.fileText,
  card:     Icons.creditCard,
  shield:   Icons.shield,
  car:      Icons.car,
  fileText: Icons.fileText,
};

const NAV_ITEMS = [
  { id: "overview",      icon: Icons.barChart,  label: "Overview"        },
  { id: "applications",  icon: Icons.userPlus,  label: "Applications"    },
  { id: "add-member",    icon: Icons.userPlus,  label: "Add Member"      },
  { id: "upload-doc",    icon: Icons.upload,    label: "Upload Document" },
  { id: "delete-doc",    icon: Icons.trash,     label: "Delete Document" },
  { id: "cities",        icon: Icons.building,  label: "Manage Cities"   },
  { id: "del-member",    icon: Icons.users,     label: "Delete Member"   },
];

const DOC_TYPES = [
  "Profile Photo",
  "Aadhar Card Front",
  "Aadhar Card Back",
  "PAN Card",
  "GST Certificate",
  "MSME Certificate",
  "Electricity Bill",
  "Office Photo",
];

// ─── Crop Modal (profile pic only) ───────────────────────────────────────────
function CropModal({ imageSrc, aspect, onDone, onCancel, title }) {
  const [crop, setCrop]        = useState({ unit: "%", width: 80, height: 80, x: 10, y: 10 });
  const [completedCrop, setCC] = useState(null);
  const imgRef                 = useRef(null);

  const getCroppedBlob = useCallback(() => {
    if (!completedCrop || !imgRef.current) return null;
    const image  = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth  / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width  = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      image,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0, completedCrop.width, completedCrop.height,
    );
    return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.92));
  }, [completedCrop]);

  const handleDone = async () => {
    const blob = await getCroppedBlob();
    if (blob) onDone(blob);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-box" style={{ maxWidth: 520, width: "95vw" }}>
        <div className="modal-top" style={{ paddingBottom: ".5rem" }}>
          <div className="modal-title" style={{ fontSize: "1rem" }}>{title || "Crop Image"}</div>
        </div>
        <div style={{ padding: "1rem", overflowY: "auto", maxHeight: "60vh" }}>
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCC(c)}
            aspect={aspect}
            style={{ width: "100%", borderRadius: 8 }}
          >
            <img ref={imgRef} src={imageSrc} alt="crop" style={{ maxWidth: "100%", display: "block" }} />
          </ReactCrop>
        </div>
        <div style={{ display: "flex", gap: ".75rem", padding: "1rem" }}>
          <button className="btn-submit-a" style={{ flex: 1 }} onClick={handleDone}>
            {Icons.check} Apply Crop
          </button>
          <button className="btn-del" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel}>
            {Icons.x} Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type = "ok" }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: ".6rem 1rem", borderRadius: 8, marginBottom: "1rem",
      background: type === "ok" ? "#dcfce7" : "#fee2e2",
      color: type === "ok" ? "#166534" : "#991b1b",
      fontSize: ".85rem", display: "flex", alignItems: "center", gap: ".4rem",
      border: `1px solid ${type === "ok" ? "#bbf7d0" : "#fecaca"}`,
    }}>
      {type === "ok" ? Icons.check : Icons.alertCircle}
      {msg}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function SidebarNav({ active, onTabChange, onLogout, onClose }) {
  function handleNav(id) { onTabChange(id); if (onClose) onClose(); }
  return (
    <>
      <div className="sb-section">Main</div>
      {NAV_ITEMS.map(it => (
        <button
          key={it.id}
          className={`sb-item${active === it.id ? " act" : ""}`}
          onClick={() => handleNav(it.id)}
        >
          <span className="sb-icon">{it.icon}</span>
          {it.label}
        </button>
      ))}
      <button className="sb-logout" onClick={onLogout}>
        {Icons.logOut} Logout
      </button>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard({ activeTab, onTabChange, onLogout }) {
  const [drawerOpen, setDrawer] = useState(false);

  // Overview
  const [stats, setStats]          = useState({ members: "—", cities: "—" });
  const [recentMembers, setRecent] = useState([]);
  const [overviewLoading, setOvL]  = useState(true);

  // Cities
  const [cities, setCities]      = useState([]);
  const [citiesLoading, setCitL] = useState(true);
  const [newCity, setNewCity]    = useState("");
  const [cityErr, setCityErr]    = useState("");
  const [cityMsg, setCityMsg]    = useState("");

  // Add member
  const [memForm, setMemForm] = useState({ name: "", phone: "", email: "", cityId: "" });
  const [memErr, setMemErr]   = useState("");
  const [memMsg, setMemMsg]   = useState("");
  const [memLoading, setMemL] = useState(false);

  // Profile pic crop
  const [profileRaw, setProfileRaw]      = useState(null);
  const [profileBlob, setProfileBlob]    = useState(null);
  const [profilePreview, setProfilePrev] = useState(null);
  const [showProfileCrop, setShowPCrop]  = useState(false);
  const profileFileRef                   = useRef(null);

  // Upload doc
  const [allMembers, setAllMembers]   = useState([]);
  const [selectedMemberId, setSelMem] = useState("");
  const [docType, setDocType]         = useState(DOC_TYPES[0]);
  const [docFile, setDocFile]         = useState(null);  // eslint-disable-line
  const [docBlob, setDocBlob]         = useState(null);
  const [docPreview, setDocPreview]   = useState(null);
  const [upErr, setUpErr]             = useState("");
  const [upMsg, setUpMsg]             = useState("");
  const [upLoading, setUpL]           = useState(false);
  const docFileRef                    = useRef(null);

  // Delete doc
  const [allDocs, setAllDocs]   = useState([]);
  const [docsLoading, setDocsL] = useState(true);
  const [delMsg, setDelMsg]     = useState("");
  const [delErr, setDelErr]     = useState("");

  // Delete member
  const [membersList, setMembersList] = useState([]);
  const [membersLoading, setMembersL] = useState(false);
  const [delMemMsg, setDelMemMsg]     = useState("");
  const [delMemErr, setDelMemErr]     = useState("");

  // Applications
  const [applications, setApplications]     = useState([]);
  const [appsLoading, setAppsLoading]       = useState(false);
  const [approvingApp, setApprovingApp]     = useState(null);
  const [approveCity, setApproveCity]       = useState("");
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveErr, setApproveErr]         = useState("");
  const [appMsg, setAppMsg]                 = useState("");
  const [appErr, setAppErr]                 = useState("");

  // ── Fetch on tab ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "overview")      fetchOverview();
    if (activeTab === "cities")        fetchCities();
    if (activeTab === "add-member")    fetchCitiesForForm();
    if (activeTab === "upload-doc")    fetchAllMembersFlat();
    if (activeTab === "delete-doc")    fetchAllDocs();
    if (activeTab === "del-member")    fetchMembersForDelete();
    if (activeTab === "applications")  fetchApplications();
    // eslint-disable-next-line
  }, [activeTab]);

  async function fetchOverview() {
    setOvL(true);
    try {
      const [mData, cData] = await Promise.all([membersAPI.getStats(), citiesAPI.getAll()]);
      setStats({ members: mData.total ?? mData.count ?? "—", cities: cData.count ?? "—" });
      const recent = await membersAPI.getRecent(5);
      setRecent(recent.members || []);
    } catch { /* silent */ }
    finally { setOvL(false); }
  }

  async function fetchCities() {
    setCitL(true);
    try { const d = await citiesAPI.getAll(); setCities(d.cities || []); }
    catch { /* ignore */ }
    finally { setCitL(false); }
  }

  async function fetchCitiesForForm() {
    if (cities.length > 0) return;
    try { const d = await citiesAPI.getAll(); setCities(d.cities || []); }
    catch { /* ignore */ }
  }

  async function fetchAllMembersFlat() {
    try {
      const res  = await fetch(`${BASE}/members?limit=500`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("ifmg_token")}` },
      });
      const data = await res.json();
      setAllMembers(data.members || []);
      if (!selectedMemberId && data.members?.length) setSelMem(data.members[0].id);
    } catch { /* ignore */ }
  }

  async function fetchAllDocs() {
    setDocsL(true); setDelMsg(""); setDelErr("");
    try { const d = await docsAPI.getAllDocs(); setAllDocs(d.docs || []); }
    catch { /* ignore */ }
    finally { setDocsL(false); }
  }

  async function fetchMembersForDelete() {
    setMembersL(true);
    try {
      const res  = await fetch(`${BASE}/members?limit=500`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("ifmg_token")}` },
      });
      const data = await res.json();
      setMembersList(data.members || []);
    } catch { /* ignore */ }
    finally { setMembersL(false); }
  }

  async function fetchApplications() {
    setAppsLoading(true); setAppMsg(""); setAppErr("");
    try {
      const res  = await fetch(`${BASE}/applications?status=pending`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("ifmg_token")}` },
      });
      const data = await res.json();
      setApplications(data.applications || []);
    } catch { setAppErr("Failed to load applications."); }
    finally { setAppsLoading(false); }
  }

  // ── Profile pic handlers ───────────────────────────────────────────────────
  function handleProfileFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setProfileRaw(reader.result); setShowPCrop(true); };
    reader.readAsDataURL(file);
  }

  function handleProfileCropDone(blob) {
    setProfileBlob(blob);
    setProfilePrev(URL.createObjectURL(blob));
    setShowPCrop(false);
    setProfileRaw(null);
  }

  // ── Doc file handler (no crop) ────────────────────────────────────────────
  function handleDocFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setDocBlob(file);
    setDocFile(file);
    if (file.type !== "application/pdf") {
      setDocPreview(URL.createObjectURL(file));
    } else {
      setDocPreview(null);
    }
  }

  // ── City actions ───────────────────────────────────────────────────────────
  async function handleAddCity() {
    const trimmed = newCity.trim();
    if (!trimmed) { setCityErr("City name cannot be empty."); return; }
    setCityErr(""); setCityMsg("");
    try {
      const data = await citiesAPI.create(trimmed);
      setCities(prev => [...prev, data.city].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCity("");
      setCityMsg(`"${data.city.name}" added successfully.`);
      setTimeout(() => setCityMsg(""), 3000);
    } catch (err) { setCityErr(err.message || "Failed to add city."); }
  }

  async function handleRemoveCity(city) {
    if (!window.confirm(`Remove "${city.name}"?`)) return;
    try {
      const data = await citiesAPI.remove(city.id);
      setCities(prev => prev.filter(c => c.id !== city.id));
      setCityMsg(data.message || `"${city.name}" removed.`);
      setTimeout(() => setCityMsg(""), 3000);
    } catch (err) { setCityErr(err.message || "Failed to remove city."); }
  }

  // ── Add member ─────────────────────────────────────────────────────────────
  async function handleAddMember(e) {
    e.preventDefault();
    setMemErr(""); setMemMsg("");
    const { name, phone, email, cityId } = memForm;
    if (!name || !phone || !cityId) { setMemErr("Name, phone, and city are required."); return; }
    setMemL(true);
    try {
      const fd = new FormData();
      fd.append("name", name); fd.append("phone", phone);
      fd.append("email", email); fd.append("cityId", cityId);
      if (profileBlob) fd.append("profilePic", profileBlob, "profile.jpg");
      const res  = await fetch(`${BASE}/members`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("ifmg_token")}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setMemMsg(`Member "${name}" registered successfully.`);
      setMemForm({ name: "", phone: "", email: "", cityId: "" });
      setProfileBlob(null); setProfilePrev(null);
      setTimeout(() => setMemMsg(""), 4000);
    } catch (err) { setMemErr(err.message || "Failed to register member."); }
    finally { setMemL(false); }
  }

  // ── Upload doc ─────────────────────────────────────────────────────────────
  async function handleUploadDoc(e) {
    e.preventDefault();
    setUpErr(""); setUpMsg("");
    if (!selectedMemberId) { setUpErr("Please select a member."); return; }
    if (!docBlob)           { setUpErr("Please choose a file."); return; }
    setUpL(true);
    try {
      const fd = new FormData();
      fd.append("file", docBlob, docBlob.name || "document.jpg");
      fd.append("docType", docType);
      const res  = await fetch(`${BASE}/documents/upload/${selectedMemberId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("ifmg_token")}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setUpMsg("Document uploaded successfully.");
      setDocBlob(null); setDocPreview(null); setDocFile(null);
      if (docFileRef.current) docFileRef.current.value = "";
      setTimeout(() => setUpMsg(""), 4000);
    } catch (err) { setUpErr(err.message || "Upload failed."); }
    finally { setUpL(false); }
  }

  // ── Delete doc ─────────────────────────────────────────────────────────────
  async function handleDeleteDoc(doc) {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    setDelMsg(""); setDelErr("");
    try {
      await docsAPI.deleteDoc(doc.memberId, doc.docId);
      setAllDocs(prev => prev.filter(d => d.docId !== doc.docId));
      setDelMsg("Document deleted."); setTimeout(() => setDelMsg(""), 3000);
    } catch (err) { setDelErr(err.message || "Failed to delete."); }
  }

  // ── Delete member ──────────────────────────────────────────────────────────
  async function handleDeleteMember(member) {
    if (!window.confirm(`Remove member "${member.name}"? This cannot be undone.`)) return;
    setDelMemMsg(""); setDelMemErr("");
    try {
      await membersAPI.deactivate(member.id);
      setMembersList(prev => prev.filter(m => m.id !== member.id));
      setDelMemMsg(`"${member.name}" removed.`); setTimeout(() => setDelMemMsg(""), 3000);
    } catch (err) { setDelMemErr(err.message || "Failed to remove member."); }
  }

  // ── Applications: approve ─────────────────────────────────────────────────
  async function handleApproveApp() {
    if (!approveCity) { setApproveErr("Please select a city."); return; }
    setApproveErr(""); setApproveLoading(true);
    try {
      const res  = await fetch(`${BASE}/applications/${approvingApp._id}/approve`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${localStorage.getItem("ifmg_token")}`,
        },
        body: JSON.stringify({ cityId: approveCity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setApplications(prev => prev.filter(a => a._id !== approvingApp._id));
      setAppMsg(`"${approvingApp.name}" approved and added as a member.`);
      setApprovingApp(null); setApproveCity("");
      setTimeout(() => setAppMsg(""), 4000);
    } catch (err) { setApproveErr(err.message || "Approval failed."); }
    finally { setApproveLoading(false); }
  }

  // ── Applications: reject ──────────────────────────────────────────────────
  async function handleRejectApp(app) {
    if (!window.confirm(`Reject application from "${app.name}"?`)) return;
    try {
      const res  = await fetch(`${BASE}/applications/${app._id}/reject`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${localStorage.getItem("ifmg_token")}`,
        },
        body: JSON.stringify({ reason: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setApplications(prev => prev.filter(a => a._id !== app._id));
      setAppMsg(`Application from "${app.name}" rejected.`);
      setTimeout(() => setAppMsg(""), 3000);
    } catch (err) { setAppErr(err.message || "Reject failed."); }
  }

  // ── Grouped cities ─────────────────────────────────────────────────────────
  const grouped = {};
  cities.forEach(c => {
    const l = c.name[0].toUpperCase();
    if (!grouped[l]) grouped[l] = [];
    grouped[l].push(c);
  });
  const letters = Object.keys(grouped).sort();

  const currentItemFull = NAV_ITEMS.find(i => i.id === activeTab);

  return (
    <div className="admin-wrap">

      {/* Profile crop modal */}
      {showProfileCrop && profileRaw && (
        <CropModal
          imageSrc={profileRaw}
          aspect={1}
          title="Crop Profile Picture"
          onDone={handleProfileCropDone}
          onCancel={() => { setShowPCrop(false); setProfileRaw(null); }}
        />
      )}

      {/* Approve application modal */}
      {approvingApp && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-box" style={{ maxWidth: 460, width: "95vw" }}>
            <div className="modal-top">
              <div className="modal-title">Approve Application</div>
            </div>
            <div style={{ padding: "1.25rem" }}>

              {/* Applicant summary */}
              <div style={{
                padding:      "1rem",
                background:   "var(--g50)",
                borderRadius: 10,
                marginBottom: "1.25rem",
                border:       "1px solid var(--g100)",
              }}>
                <div style={{ fontWeight: 700, fontSize: ".95rem", color: "var(--g800)" }}>
                  {approvingApp.name}
                </div>
                <div style={{ fontSize: ".82rem", color: "var(--g500)", marginTop: 3 }}>
                  {approvingApp.phone}{approvingApp.email ? ` · ${approvingApp.email}` : ""}
                </div>
                <div style={{ marginTop: ".75rem", display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
                  {(approvingApp.docs || []).length === 0 && (
                    <span style={{ fontSize: ".75rem", color: "var(--g400)" }}>No documents uploaded</span>
                  )}
                  {(approvingApp.docs || []).map(d => (
                    <span key={d.type} style={{
                      fontSize:     ".7rem",
                      padding:      "2px 8px",
                      borderRadius: 99,
                      background:   "rgba(22,163,74,0.1)",
                      color:        "#16a34a",
                      border:       "1px solid rgba(22,163,74,0.2)",
                      fontWeight:   600,
                    }}>
                      ✓ {d.type}
                    </span>
                  ))}
                </div>
              </div>

              {/* City selector */}
              <div className="form-row-a">
                <label className="form-lbl-a">Assign City to Member</label>
                <select
                  className="form-inp-a"
                  value={approveCity}
                  onChange={e => { setApproveCity(e.target.value); setApproveErr(""); }}
                >
                  <option value="">— Select city —</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {approveErr && (
                <div style={{
                  fontSize:     ".82rem",
                  color:        "#dc2626",
                  marginBottom: ".75rem",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          ".3rem",
                }}>
                  {Icons.alertCircle} {approveErr}
                </div>
              )}

              <div style={{ display: "flex", gap: ".75rem" }}>
                <button
                  className="btn-submit-a"
                  style={{ flex: 1 }}
                  onClick={handleApproveApp}
                  disabled={approveLoading}
                >
                  {approveLoading
                    ? <><span className="spin-icon">{Icons.loader}</span> Approving…</>
                    : <>{Icons.check} Approve &amp; Add Member</>
                  }
                </button>
                <button
                  className="btn-del"
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => { setApprovingApp(null); setApproveCity(""); setApproveErr(""); }}
                >
                  {Icons.x} Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE TOP BAR */}
      <div className="admin-mobile-bar">
        <div className="admin-mobile-title">
          {currentItemFull?.icon}
          {currentItemFull?.label || "Admin Panel"}
        </div>
        <button
          className={`admin-menu-btn${drawerOpen ? " open" : ""}`}
          onClick={() => setDrawer(v => !v)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {drawerOpen && <div className="admin-drawer-overlay open" onClick={() => setDrawer(false)} />}

      <div className={`admin-drawer${drawerOpen ? " open" : ""}`}>
        <div className="admin-drawer-top">
          <div className="admin-drawer-logo">
            <img src="/logo192.png" alt="IFMG" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain" }} />
            IFMG
          </div>
          <button className="admin-drawer-close" onClick={() => setDrawer(false)}>{Icons.x}</button>
        </div>
        <SidebarNav active={activeTab} onTabChange={onTabChange} onLogout={onLogout} onClose={() => setDrawer(false)} />
      </div>

      <aside className="admin-sidebar">
        <SidebarNav active={activeTab} onTabChange={onTabChange} onLogout={onLogout} />
      </aside>

      <div className="admin-main">
        <div className="admin-header">
          <div className="admin-title">{currentItemFull?.icon} {currentItemFull?.label || "Dashboard"}</div>
          <div className="admin-sub">India's First Movers Group Admin Panel &mdash; Live data</div>
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <>
            <div className="stats-row">
              {[
                { icon: Icons.users,    val: overviewLoading ? "…" : String(stats.members), lbl: "Total Members",  delta: "Live count"    },
                { icon: Icons.building, val: overviewLoading ? "…" : String(stats.cities),  lbl: "Cities Covered", delta: "Active cities" },
              ].map(s => (
                <div className="s-card" key={s.lbl}>
                  <div className="s-icon">{s.icon}</div>
                  <div className="s-val">{s.val}</div>
                  <div className="s-lbl">{s.lbl}</div>
                  <div className="s-delta">{s.delta}</div>
                </div>
              ))}
            </div>
            <div className="admin-grid">
              <div className="a-card">
                <div className="a-card-hdr"><span className="a-card-title">Recent Members</span></div>
                <div className="a-card-body">
                  {overviewLoading && <div style={{ color: "var(--g400)", fontSize: ".85rem" }}>Loading…</div>}
                  {!overviewLoading && recentMembers.length === 0 && (
                    <div style={{ color: "var(--g400)", fontSize: ".85rem" }}>No members yet.</div>
                  )}
                  {recentMembers.map(m => (
                    <div className="mini-member-row" key={m.id}>
                      {m.profilePicUrl
                        ? <img src={m.profilePicUrl} alt={m.name} className="mini-avatar" style={{ objectFit: "cover", borderRadius: "50%" }} />
                        : <div className="mini-avatar">{m.initials}</div>
                      }
                      <div style={{ flex: 1 }}>
                        <div className="mini-name">{m.name}</div>
                        <div className="mini-role">{m.city?.name || ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="a-card">
                <div className="a-card-hdr"><span className="a-card-title">Quick Actions</span></div>
                <div className="a-card-body" style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                  {[
                    [Icons.userPlus, "Applications",    "applications"],
                    [Icons.userPlus, "Add New Member",  "add-member"  ],
                    [Icons.upload,   "Upload Document", "upload-doc"  ],
                    [Icons.trash,    "Delete Document", "delete-doc"  ],
                    [Icons.users,    "Delete Member",   "del-member"  ],
                    [Icons.building, "Manage Cities",   "cities"      ],
                  ].map(([icon, label, id]) => (
                    <button key={id} className="qa-btn" onClick={() => onTabChange(id)}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── APPLICATIONS ── */}
        {activeTab === "applications" && (
          <div className="a-card" style={{ maxWidth: 620 }}>
            <div className="a-card-hdr">
              <span className="a-card-title">{Icons.userPlus} Pending Applications</span>
              {!appsLoading && (
                <span className="tag tag-or" style={{ fontSize: ".72rem", borderRadius: 100, padding: "3px 10px" }}>
                  {applications.length} pending
                </span>
              )}
            </div>
            <div style={{ padding: "0 1.25rem" }}>
              <Toast msg={appMsg} type="ok" />
              <Toast msg={appErr} type="err" />
            </div>
            <div style={{ padding: 0 }}>
              {appsLoading && (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--g400)" }}>Loading…</div>
              )}
              {!appsLoading && applications.length === 0 && (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--g400)", fontSize: ".88rem" }}>
                  No pending applications.
                </div>
              )}
              {applications.map(app => (
                <div
                  className="del-row"
                  key={app._id}
                  style={{ alignItems: "flex-start", padding: "1rem 1.25rem" }}
                >
                  <div className="del-info" style={{ flex: 1, alignItems: "flex-start" }}>
                    {/* Avatar */}
                    <div style={{
                      width:          44,
                      height:         44,
                      minWidth:       44,
                      borderRadius:   "50%",
                      background:     "linear-gradient(135deg,#e8570a,#c44608)",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      color:          "#fff",
                      fontWeight:     700,
                      fontSize:       "1rem",
                      flexShrink:     0,
                    }}>
                      {app.name?.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="del-name">{app.name}</div>
                      <div className="del-sub">
                        {app.phone}{app.email ? ` · ${app.email}` : ""}
                      </div>
                      {/* Uploaded doc badges */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: ".3rem", marginTop: ".5rem" }}>
                        {(app.docs || []).length === 0 && (
                          <span style={{ fontSize: ".72rem", color: "var(--g400)" }}>No documents uploaded</span>
                        )}
                        {(app.docs || []).map(d => (
                          <span key={d.type} style={{
                            fontSize:     ".68rem",
                            padding:      "2px 7px",
                            borderRadius: 99,
                            background:   "rgba(22,163,74,0.08)",
                            color:        "#16a34a",
                            border:       "1px solid rgba(22,163,74,0.18)",
                            fontWeight:   600,
                          }}>
                            ✓ {d.type}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: ".7rem", color: "var(--g400)", marginTop: ".4rem" }}>
                        Applied {new Date(app.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div style={{
                    display:       "flex",
                    flexDirection: "column",
                    gap:           ".4rem",
                    flexShrink:    0,
                    marginLeft:    ".75rem",
                  }}>
                    <button
                      className="btn-submit-a"
                      style={{ padding: ".38rem .85rem", fontSize: ".78rem" }}
                      onClick={() => {
                        setApprovingApp(app);
                        setApproveCity("");
                        setApproveErr("");
                        if (cities.length === 0) fetchCitiesForForm();
                      }}
                    >
                      {Icons.check} Approve
                    </button>
                    <button
                      className="btn-del"
                      style={{ justifyContent: "center", padding: ".35rem .7rem", fontSize: ".78rem" }}
                      onClick={() => handleRejectApp(app)}
                    >
                      {Icons.x} Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ADD MEMBER ── */}
        {activeTab === "add-member" && (
          <div className="a-card" style={{ maxWidth: 520 }}>
            <div className="a-card-hdr"><span className="a-card-title">New Member Registration</span></div>
            <div className="a-card-body">
              <Toast msg={memMsg} type="ok" />
              <Toast msg={memErr} type="err" />
              <form onSubmit={handleAddMember}>
                <div className="form-row-a">
                  <label className="form-lbl-a">Profile Picture</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: ".5rem" }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: "50%",
                      background: "var(--g100)", overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "2rem", color: "var(--g400)",
                      border: "2px solid var(--g200)", flexShrink: 0,
                    }}>
                      {profilePreview
                        ? <img src={profilePreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : Icons.users
                      }
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                      <button
                        type="button"
                        className="btn-submit-a"
                        style={{ padding: ".4rem .9rem", fontSize: ".82rem", marginBottom: 0 }}
                        onClick={() => profileFileRef.current?.click()}
                      >
                        {Icons.upload} Choose Photo
                      </button>
                      {profilePreview && (
                        <button
                          type="button"
                          className="btn-del"
                          style={{ justifyContent: "center", padding: ".3rem .7rem", fontSize: ".78rem" }}
                          onClick={() => { setProfileBlob(null); setProfilePrev(null); }}
                        >
                          {Icons.x} Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    ref={profileFileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleProfileFileChange}
                  />
                  <small style={{ color: "var(--g400)", fontSize: ".75rem" }}>JPG or PNG. Will be cropped to square.</small>
                </div>

                {[
                  ["Full Name",     "name",  "text",  "e.g. Rajesh Kumar"              ],
                  ["Phone Number",  "phone", "tel",   "e.g. +91 98765 43210"           ],
                  ["Email Address", "email", "email", "e.g. raj@email.com (optional)"  ],
                ].map(([lb, key, tp, ph]) => (
                  <div className="form-row-a" key={lb}>
                    <label className="form-lbl-a">{lb}</label>
                    <input
                      className="form-inp-a"
                      type={tp}
                      placeholder={ph}
                      value={memForm[key]}
                      onChange={e => setMemForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="form-row-a">
                  <label className="form-lbl-a">Assign City</label>
                  <select
                    className="form-inp-a"
                    value={memForm.cityId}
                    onChange={e => setMemForm(f => ({ ...f, cityId: e.target.value }))}
                  >
                    <option value="">— Select city —</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <button className="btn-submit-a" type="submit" disabled={memLoading}>
                  {memLoading
                    ? <><span className="spin-icon">{Icons.loader}</span> Registering…</>
                    : <>{Icons.check} Register Member</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── UPLOAD DOC ── */}
        {activeTab === "upload-doc" && (
          <div className="a-card" style={{ maxWidth: 520 }}>
            <div className="a-card-hdr"><span className="a-card-title">Upload Document</span></div>
            <div className="a-card-body">
              <Toast msg={upMsg} type="ok" />
              <Toast msg={upErr} type="err" />
              <form onSubmit={handleUploadDoc}>
                <div className="form-row-a">
                  <label className="form-lbl-a">Select Member</label>
                  <select className="form-inp-a" value={selectedMemberId} onChange={e => setSelMem(e.target.value)}>
                    <option value="">— Select member —</option>
                    {allMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.city?.name || ""})</option>
                    ))}
                  </select>
                </div>
                <div className="form-row-a">
                  <label className="form-lbl-a">Document Type</label>
                  <select className="form-inp-a" value={docType} onChange={e => setDocType(e.target.value)}>
                    {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-row-a">
                  <label className="form-lbl-a">Upload File</label>
                  {docPreview && (
                    <div style={{ marginBottom: ".75rem", position: "relative", display: "inline-block" }}>
                      <img
                        src={docPreview}
                        alt="doc preview"
                        style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, border: "1px solid var(--g200)", display: "block" }}
                      />
                      <button
                        type="button"
                        onClick={() => { setDocBlob(null); setDocPreview(null); if (docFileRef.current) docFileRef.current.value = ""; }}
                        style={{
                          position: "absolute", top: 6, right: 6,
                          background: "#ef4444", border: "none", borderRadius: "50%",
                          width: 24, height: 24, color: "#fff", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {Icons.x}
                      </button>
                    </div>
                  )}
                  {!docPreview && (
                    <div className="file-drop" onClick={() => docFileRef.current?.click()} style={{ cursor: "pointer" }}>
                      <div className="file-drop-icon">{Icons.upload}</div>
                      <div className="file-drop-txt">
                        {docBlob ? "PDF selected — ready to upload" : "Click to browse or drag & drop"}
                        <small>PDF, JPG, PNG — max 10 MB</small>
                      </div>
                    </div>
                  )}
                  <input
                    ref={docFileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    onChange={handleDocFileChange}
                  />
                </div>
                <button className="btn-submit-a" type="submit" disabled={upLoading}>
                  {upLoading
                    ? <><span className="spin-icon">{Icons.loader}</span> Uploading…</>
                    : <>{Icons.upload} Upload Document</>}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── DELETE DOC ── */}
        {activeTab === "delete-doc" && (
          <div className="a-card" style={{ maxWidth: 520 }}>
            <div className="a-card-hdr">
              <span className="a-card-title">Delete Document</span>
              {!docsLoading && (
                <span className="tag tag-or" style={{ fontSize: ".72rem", borderRadius: 100, padding: "3px 10px" }}>
                  {allDocs.length} doc{allDocs.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="a-card-body" style={{ padding: 0 }}>
              <div style={{ padding: "0 1.25rem" }}>
                <Toast msg={delMsg} type="ok" />
                <Toast msg={delErr} type="err" />
              </div>
              {docsLoading && <div style={{ padding: "2rem", textAlign: "center", color: "var(--g400)" }}>Loading…</div>}
              {!docsLoading && allDocs.length === 0 && (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--g400)", fontSize: ".88rem" }}>No documents found.</div>
              )}
              {allDocs.map(d => (
                <div className="del-row" key={d.docId}>
                  <div className="del-info">
                    <div className="del-doc-icon">{DOC_ICON_MAP[d.icon] || Icons.fileText}</div>
                    <div>
                      <div className="del-name">{d.name}</div>
                      <div className="del-sub">{d.sub}</div>
                    </div>
                  </div>
                  <button className="btn-del" onClick={() => handleDeleteDoc(d)}>{Icons.trash} Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DELETE MEMBER ── */}
        {activeTab === "del-member" && (
          <div className="a-card" style={{ maxWidth: 560 }}>
            <div className="a-card-hdr">
              <span className="a-card-title">Delete Member</span>
              {!membersLoading && (
                <span className="tag tag-or" style={{ fontSize: ".72rem", borderRadius: 100, padding: "3px 10px" }}>
                  {membersList.length} member{membersList.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="a-card-body" style={{ padding: 0 }}>
              <div style={{ padding: "0 1.25rem" }}>
                <Toast msg={delMemMsg} type="ok" />
                <Toast msg={delMemErr} type="err" />
              </div>
              {membersLoading && <div style={{ padding: "2rem", textAlign: "center", color: "var(--g400)" }}>Loading…</div>}
              {!membersLoading && membersList.length === 0 && (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--g400)", fontSize: ".88rem" }}>No members found.</div>
              )}
              {membersList.map(m => (
                <div className="del-row" key={m.id}>
                  <div className="del-info">
                    {m.profilePicUrl
                      ? <img src={m.profilePicUrl} alt={m.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      : <div className="del-doc-icon" style={{ borderRadius: "50%", background: "var(--g100)" }}>{Icons.users}</div>
                    }
                    <div>
                      <div className="del-name">{m.name}</div>
                      <div className="del-sub">{m.city?.name || ""} · {m.phone}</div>
                    </div>
                  </div>
                  <button className="btn-del" onClick={() => handleDeleteMember(m)}>{Icons.trash} Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MANAGE CITIES ── */}
        {activeTab === "cities" && (
          <div style={{ maxWidth: 600 }}>
            <div className="a-card" style={{ marginBottom: "1.25rem" }}>
              <div className="a-card-hdr">
                <span className="a-card-title">Add New City</span>
                <span className="tag tag-gr" style={{ fontSize: ".72rem", borderRadius: 100, padding: "3px 10px" }}>
                  {cities.length} total
                </span>
              </div>
              <div className="a-card-body">
                <Toast msg={cityMsg} type="ok" />
                <div className="form-row-a">
                  <label className="form-lbl-a">City Name</label>
                  <input
                    className={`form-inp-a${cityErr ? " err" : ""}`}
                    type="text"
                    placeholder="e.g. Surat"
                    value={newCity}
                    onChange={e => { setNewCity(e.target.value); setCityErr(""); }}
                    onKeyDown={e => e.key === "Enter" && handleAddCity()}
                  />
                  {cityErr && <div className="err-msg" style={{ marginTop: 5 }}>{Icons.alertCircle} {cityErr}</div>}
                </div>
                <button className="btn-submit-a" onClick={handleAddCity}>{Icons.mapPin} Add City</button>
              </div>
            </div>
            <div className="a-card">
              <div className="a-card-hdr"><span className="a-card-title">All Cities</span></div>
              <div className="a-card-body" style={{ padding: 0 }}>
                {citiesLoading && <div style={{ padding: "2rem", textAlign: "center", color: "var(--g400)" }}>Loading…</div>}
                {!citiesLoading && cities.length === 0 && (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--g400)", fontSize: ".88rem" }}>No cities added yet.</div>
                )}
                {letters.map(letter => (
                  <div key={letter}>
                    <div style={{
                      padding: ".4rem 1.25rem", fontSize: ".62rem", fontWeight: 800,
                      letterSpacing: ".12em", textTransform: "uppercase", color: "var(--g400)",
                      background: "var(--g50)", borderBottom: "1px solid var(--g100)",
                    }}>{letter}</div>
                    {grouped[letter].map(city => (
                      <div className="del-row" key={city.id}>
                        <div className="del-info">
                          <div className="del-doc-icon">{Icons.mapPin}</div>
                          <div>
                            <div className="del-name">{city.name}</div>
                            <div className="del-sub">
                              Packers and Movers in {city.name}
                              {city.memberCount > 0 && ` · ${city.memberCount} member${city.memberCount !== 1 ? "s" : ""}`}
                            </div>
                          </div>
                        </div>
                        <button className="btn-del" onClick={() => handleRemoveCity(city)}>{Icons.trash} Remove</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}