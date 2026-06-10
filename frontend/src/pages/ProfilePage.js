import { useRef, useEffect, useState } from "react";
import { Icons } from "../components/Icons";
import PageLoader from "../components/PageLoader";
import DocViewPage from "./DocViewPage";

function useAnimateIn(deps) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const items = ref.current.querySelectorAll(".anim");
    items.forEach((el, i) => {
      el.style.animationDelay = `${i * 0.06}s`;
      el.style.animationPlayState = "running";
    });
  }, deps); // eslint-disable-line
  return ref;
}

const DOC_ICONS = {
  id:       Icons.fileText,
  card:     Icons.creditCard,
  shield:   Icons.shield,
  car:      Icons.car,
  fileText: Icons.fileText,
};

// All uploadable doc types for member self-upload
const UPLOAD_FIELDS = [
  { docType: "Profile Photo",      label: "Profile Photo",       accept: "image/*",        icon: Icons.users    },
  { docType: "Aadhar Card Front",  label: "Aadhar Card (Front)", accept: "image/*,.pdf",   icon: Icons.fileText },
  { docType: "Aadhar Card Back",   label: "Aadhar Card (Back)",  accept: "image/*,.pdf",   icon: Icons.fileText },
  { docType: "PAN Card",           label: "PAN Card",            accept: "image/*,.pdf",   icon: Icons.creditCard },
  { docType: "GST Certificate",    label: "GST Certificate",     accept: "image/*,.pdf",   icon: Icons.shield   },
  { docType: "MSME Certificate",   label: "MSME Certificate",    accept: "image/*,.pdf",   icon: Icons.shield   },
  { docType: "Electricity Bill",   label: "Electricity Bill",    accept: "image/*,.pdf",   icon: Icons.fileText },
  { docType: "Office Photo",       label: "Office Photo",        accept: "image/*",        icon: Icons.building },
];

function isPdf(doc) {
  return doc?.fileUrl?.toLowerCase().includes(".pdf") ||
         doc?.mimeType === "application/pdf";
}

// Single upload row in the upload panel
function UploadRow({ field, existingDoc, memberId, onUploaded }) {
  const inputRef               = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docType", field.docType);

      const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const res  = await fetch(`${BASE}/documents/upload/${memberId}`, {
        method: "POST",
        body:   fd,
        // No auth header — members upload without admin token
        // If you require auth here, add: headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      onUploaded(field.docType, data.doc, data.profilePicUrl);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const uploaded = !!existingDoc;

  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      gap:            "1rem",
      padding:        ".85rem 1.25rem",
      borderBottom:   "1px solid var(--g100)",
      transition:     "background .15s",
    }}>
      {/* Icon */}
      <div style={{
        width:           38,
        height:          38,
        minWidth:        38,
        borderRadius:    8,
        background:      uploaded ? "rgba(22,163,74,0.08)" : "var(--orange-bg, rgba(232,87,10,0.08))",
        border:          `1px solid ${uploaded ? "rgba(22,163,74,0.18)" : "rgba(232,87,10,0.15)"}`,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        color:           uploaded ? "#16a34a" : "var(--orange, #e8570a)",
        flexShrink:      0,
        fontSize:        "1rem",
      }}>
        {uploaded ? Icons.check : field.icon}
      </div>

      {/* Label + status */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--g800, #1a1a1a)" }}>
          {field.label}
        </div>
        <div style={{ fontSize: ".75rem", marginTop: 2,
          color: uploaded ? "#16a34a" : "var(--g400)",
        }}>
          {uploaded ? "Uploaded" : "Not uploaded yet"}
        </div>
        {error && (
          <div style={{ fontSize: ".72rem", color: "#dc2626", marginTop: 2 }}>{error}</div>
        )}
      </div>

      {/* Upload / Replace button */}
      <button
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            ".35rem",
          padding:        ".38rem .85rem",
          fontSize:       ".78rem",
          fontWeight:     600,
          borderRadius:   7,
          border:         "none",
          cursor:         uploading ? "not-allowed" : "pointer",
          background:     uploaded
            ? "rgba(0,0,0,0.06)"
            : "linear-gradient(135deg,#e8570a,#c44608)",
          color:          uploaded ? "var(--g600)" : "#fff",
          flexShrink:     0,
          opacity:        uploading ? 0.7 : 1,
          transition:     "opacity .15s",
        }}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading
          ? <><span style={{ fontSize: ".75rem" }}>{Icons.loader}</span> Uploading…</>
          : uploaded
            ? <>{Icons.upload} Replace</>
            : <>{Icons.upload} Upload</>
        }
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={field.accept}
        style={{ display: "none" }}
        onChange={handleChange}
      />
    </div>
  );
}

export default function ProfilePage({ member, city, onBack, onBackCity, onMemberUpdate }) {
  const ref = useAnimateIn([member.id]);
  const [loading, setLoading]   = useState(true);
  const [viewDoc, setViewDoc]   = useState(null);
  // Local docs state so uploads reflect immediately
  const [docs, setDocs]         = useState(member.docs || []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, [member.id]);

  // Keep docs in sync if member prop changes
  useEffect(() => {
    setDocs(member.docs || []);
  }, [member.docs]);

  const cityName = typeof city === "object" ? city.name : city;

  const INFO_ROWS = [
    { icon: Icons.mapPin, lbl: "City",         val: cityName      },
    { icon: Icons.phone,  lbl: "Phone",         val: member.phone  },
    { icon: Icons.check,  lbl: "Member Since",  val: member.joined },
  ];

  // Called when a new doc is uploaded from the upload panel
  function handleUploaded(newDoc, profilePicUrl) {
    setDocs(prev => {
      const exists = prev.findIndex(d => d.type === newDoc.type);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = newDoc;
        return updated;
      }
      return [...prev, newDoc];
    });
    // Propagate profile pic change up to parent so MembersPage + avatar update everywhere
    if (newDoc.type === "Profile Photo" && profilePicUrl && onMemberUpdate) {
      onMemberUpdate({ ...member, profilePicUrl });
    }
  }

  // Build a quick lookup: docType → existing doc
  const docsByType = {};
  docs.forEach(d => { docsByType[d.type] = d; });

  // ── Doc viewer ───────────────────────────────────────────────────────────────
  if (viewDoc) {
    return <DocViewPage doc={viewDoc} onBack={() => setViewDoc(null)} />;
  }

  // ── Profile page ─────────────────────────────────────────────────────────────
  return (
    <>
      {loading && <PageLoader />}

      <div className="page">
        <div className="inner-page" ref={ref}>

          {/* Breadcrumb */}
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
            <button className="back-btn anim" onClick={onBackCity}>
              {Icons.chevronLeft} All Cities
            </button>
            <button className="back-btn anim" onClick={onBack}>
              {Icons.chevronLeft} {cityName} Members
            </button>
          </div>

          <div className="profile-layout">

            {/* ── Sidebar ── */}
            <div className="profile-sidebar">
              <div className="profile-card anim" style={{ animationDelay: ".08s" }}>
                <div className="profile-card-top">

                  {/* Avatar — shows profile pic if uploaded */}
                  <div style={{
                    width:          90,
                    height:         90,
                    borderRadius:   "50%",
                    overflow:       "hidden",
                    margin:         "0 auto 1rem",
                    border:         "3px solid rgba(255,255,255,0.18)",
                    background:     "linear-gradient(135deg,#e8570a,#c44608)",
                    flexShrink:     0,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                  }}>
                    {/* Show latest profile pic (from docs or member.profilePicUrl) */}
                    {(docsByType["Profile Photo"]?.fileUrl || member.profilePicUrl)
                      ? <img
                          src={docsByType["Profile Photo"]?.fileUrl || member.profilePicUrl}
                          alt={member.name}
                          style={{
                            width:          "100%",
                            height:         "100%",
                            objectFit:      "cover",
                            objectPosition: "center top",
                            display:        "block",
                          }}
                        />
                      : <span style={{
                          fontFamily: "'DM Serif Display',serif",
                          fontSize:   "1.8rem",
                          color:      "#fff",
                          lineHeight: 1,
                        }}>
                          {member.initials}
                        </span>
                    }
                  </div>

                  <div className="p-name">{member.name}</div>
                  <div className="p-status-dot">Active Member</div>
                </div>

                <div className="p-info-list">
                  {INFO_ROWS.map(({ icon, lbl, val }) => (
                    <div className="p-info-row" key={lbl}>
                      <span className="p-info-lbl">{icon} {lbl}</span>
                      <span className="p-info-val">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", flex: 1, minWidth: 0 }}>

              {/* ── Documents viewer panel ── */}
              <div className="docs-panel anim" style={{ animationDelay: ".14s" }}>
                <div className="docs-panel-hdr">
                  <span className="docs-panel-title">{Icons.fileText} Documents</span>
                  <span className="docs-verified-count">
                    {docs.length} doc{docs.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {docs.length === 0 && (
                  <div style={{
                    padding: "3rem", textAlign: "center",
                    color: "var(--g400)", fontSize: ".88rem",
                  }}>
                    No documents uploaded yet.
                  </div>
                )}

                {docs.map((doc, i) => (
                  <div
                    className="doc-row anim"
                    key={doc.id}
                    style={{ animationDelay: `${0.2 + i * 0.07}s` }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width:          44,
                      height:         44,
                      minWidth:       44,
                      borderRadius:   8,
                      overflow:       "hidden",
                      flexShrink:     0,
                      background:     "var(--orange-bg)",
                      border:         "1px solid rgba(232,87,10,0.15)",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                    }}>
                      {doc.fileUrl && !isPdf(doc)
                        ? <img
                            src={doc.fileUrl}
                            alt={doc.type}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        : <span style={{ color: "var(--orange)", display: "flex", alignItems: "center" }}>
                            {DOC_ICONS[doc.icon] || Icons.fileText}
                          </span>
                      }
                    </div>

                    <div className="doc-meta">
                      <div className="doc-title">{doc.type}</div>
                      <div className="doc-date">Uploaded {doc.date}</div>
                    </div>

                    <div className="doc-btns">
                      <button
                        className="btn-d btn-d-view"
                        disabled={!doc.fileUrl}
                        onClick={() => setViewDoc(doc)}
                      >
                        {Icons.eye}&nbsp;View
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Upload documents panel ── */}
              <div
                className="docs-panel anim"
                style={{ animationDelay: ".2s" }}
              >
                <div className="docs-panel-hdr">
                  <span className="docs-panel-title">{Icons.upload} Upload Documents</span>
                  <span className="docs-verified-count">
                    {docs.length}/{UPLOAD_FIELDS.length} uploaded
                  </span>
                </div>

                <div style={{
                  padding: ".6rem 1.25rem",
                  background: "rgba(232,87,10,0.04)",
                  borderBottom: "1px solid var(--g100)",
                }}>
                  <p style={{
                    fontSize: ".78rem",
                    color: "var(--g500, #6b6b6b)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    Upload clear photos or PDF scans. Files are securely stored and only visible to IFMG admins.
                  </p>
                </div>

                {UPLOAD_FIELDS.map(field => (
                  <UploadRow
                    key={field.docType}
                    field={field}
                    existingDoc={docsByType[field.docType]}
                    memberId={member.id}
                    onUploaded={(docType, doc, picUrl) => handleUploaded(doc, picUrl)}
                  />
                ))}
              </div>

            </div>
          </div>
        </div>

        <footer className="footer">
          &copy; 2026 <strong>India's First Movers Group</strong>
        </footer>
      </div>
    </>
  );
}