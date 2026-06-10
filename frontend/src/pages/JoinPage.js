import { useState, useRef } from "react";
import { Icons } from "../components/Icons";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const UPLOAD_FIELDS = [
  { docType: "Profile Photo",      label: "Profile Photo",       accept: "image/*",      required: true  },
  { docType: "Aadhar Card Front",  label: "Aadhar Card (Front)", accept: "image/*,.pdf", required: true  },
  { docType: "Aadhar Card Back",   label: "Aadhar Card (Back)",  accept: "image/*,.pdf", required: true  },
  { docType: "PAN Card",           label: "PAN Card",            accept: "image/*,.pdf", required: false },
  { docType: "GST Certificate",    label: "GST Certificate",     accept: "image/*,.pdf", required: false },
  { docType: "MSME Certificate",   label: "MSME Certificate",    accept: "image/*,.pdf", required: false },
  { docType: "Electricity Bill",   label: "Electricity Bill",    accept: "image/*,.pdf", required: false },
  { docType: "Office Photo",       label: "Office Photo",        accept: "image/*",      required: false },
];

// ── Single doc upload row ─────────────────────────────────────────────────────
function DocUploadRow({ field, applicationId, uploaded, onUploaded }) {
  const inputRef              = useRef(null);
  const [uploading, setUpl]   = useState(false);
  const [error, setError]     = useState("");

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setUpl(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docType", field.docType);
      const res  = await fetch(`${BASE}/applications/${applicationId}/upload`, {
        method: "POST",
        body:   fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      onUploaded(field.docType, data.doc);
    } catch (err) {
      setError(err.message || "Upload failed. Try again.");
    } finally {
      setUpl(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          "1rem",
      padding:      ".8rem 0",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Status dot */}
      <div style={{
        width:          36,
        height:         36,
        minWidth:       36,
        borderRadius:   8,
        background:     uploaded ? "rgba(22,163,74,0.12)" : "rgba(232,87,10,0.08)",
        border:         `1px solid ${uploaded ? "rgba(22,163,74,0.25)" : "rgba(232,87,10,0.2)"}`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        color:          uploaded ? "#4ade80" : "#e8570a",
        fontSize:       ".9rem",
        flexShrink:     0,
        transition:     "all .2s",
      }}>
        {uploaded ? Icons.check : Icons.fileText}
      </div>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:   ".88rem",
          fontWeight: 600,
          color:      uploaded ? "#e2e8f0" : "#cbd5e1",
          display:    "flex",
          alignItems: "center",
          gap:        ".4rem",
        }}>
          {field.label}
          {field.required && (
            <span style={{ color: "#f87171", fontSize: ".7rem", fontWeight: 700 }}>required</span>
          )}
        </div>
        {error && (
          <div style={{ fontSize: ".72rem", color: "#f87171", marginTop: 2 }}>{error}</div>
        )}
        {uploaded && (
          <div style={{ fontSize: ".72rem", color: "#4ade80", marginTop: 2 }}>Uploaded ✓</div>
        )}
      </div>

      {/* Button */}
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        disabled={uploading}
        style={{
          padding:      ".38rem .9rem",
          fontSize:     ".78rem",
          fontWeight:   700,
          borderRadius: 8,
          border:       "none",
          cursor:       uploading ? "not-allowed" : "pointer",
          background:   uploaded
            ? "rgba(255,255,255,0.08)"
            : "linear-gradient(135deg,#e8570a,#c44608)",
          color:        uploaded ? "#94a3b8" : "#fff",
          flexShrink:   0,
          opacity:      uploading ? 0.6 : 1,
          transition:   "all .2s",
          display:      "flex",
          alignItems:   "center",
          gap:          ".3rem",
        }}
      >
        {uploading
          ? "Uploading…"
          : uploaded ? <>{Icons.upload} Replace</> : <>{Icons.upload} Upload</>
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

// ── Main JoinPage ─────────────────────────────────────────────────────────────
export default function JoinPage({ onBack }) {
  // Step 1 = personal info, Step 2 = doc uploads, Step 3 = success
  const [step, setStep]             = useState(1);
  const [form, setForm]             = useState({ name: "", phone: "", email: "" });
  const [formErr, setFormErr]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applicationId, setAppId]   = useState(null);
  const [uploadedDocs, setUploaded] = useState({}); // docType → doc object
  const [finalizing, setFinalizing] = useState(false);

  // ── Step 1: submit basic info ──────────────────────────────────────────────
  async function handleInfoSubmit(e) {
    e.preventDefault();
    setFormErr("");
    const { name, phone } = form;
    if (!name.trim() || !phone.trim()) {
      setFormErr("Name and phone number are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res  = await fetch(`${BASE}/applications`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit");
      setAppId(data.applicationId);
      setStep(2);
    } catch (err) {
      setFormErr(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step 2: finalize after uploads ────────────────────────────────────────
  function handleDocUploaded(docType, doc) {
    setUploaded(prev => ({ ...prev, [docType]: doc }));
  }

  function handleFinalize() {
    // Check required docs uploaded
    const missing = UPLOAD_FIELDS
      .filter(f => f.required && !uploadedDocs[f.docType])
      .map(f => f.label);
    if (missing.length > 0) {
      alert(`Please upload required documents: ${missing.join(", ")}`);
      return;
    }
    setStep(3);
  }

  const uploadedCount = Object.keys(uploadedDocs).length;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:      "100vh",
      background:     "linear-gradient(135deg, #0f0f1a 0%, #1a0a00 100%)",
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "flex-start",
      padding:        "2rem 1rem 4rem",
    }}>

      {/* Top bar */}
      <div style={{
        width:          "100%",
        maxWidth:       560,
        display:        "flex",
        alignItems:     "center",
        marginBottom:   "2rem",
      }}>
        <button
          onClick={onBack}
          style={{
            display:      "flex",
            alignItems:   "center",
            gap:          6,
            background:   "rgba(255,255,255,0.06)",
            border:       "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color:        "#94a3b8",
            padding:      "8px 14px",
            cursor:       "pointer",
            fontSize:     ".82rem",
            fontWeight:   600,
          }}
        >
          {Icons.chevronLeft} Back
        </button>
      </div>

      {/* Card */}
      <div style={{
        width:        "100%",
        maxWidth:     560,
        background:   "rgba(255,255,255,0.035)",
        border:       "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        overflow:     "hidden",
        boxShadow:    "0 24px 80px rgba(0,0,0,0.5)",
      }}>

        {/* Header */}
        <div style={{
          padding:    "2rem 2rem 1.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(232,87,10,0.05)",
        }}>
          <div style={{ marginBottom: "1rem" }}>
            <img
              src="/logo192.png"
              alt="IFMG"
              style={{
                width:        64,
                height:       64,
                borderRadius: 14,
                objectFit:    "contain",
                display:      "block",
              }}
            />
          </div>
          <h2 style={{
            margin:     0,
            fontSize:   "1.4rem",
            fontWeight: 800,
            color:      "#f1f5f9",
            fontFamily: "'DM Serif Display', serif",
          }}>
            Join IFMG Network
          </h2>
          <p style={{ margin: ".4rem 0 0", fontSize: ".85rem", color: "#64748b" }}>
            India's First Movers Group — verified professionals
          </p>

          {/* Step indicators */}
          {step < 3 && (
            <div style={{ display: "flex", gap: ".5rem", marginTop: "1.25rem" }}>
              {["Your Details", "Upload Documents", "Done"].map((label, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    height:       3,
                    borderRadius: 99,
                    background:   i + 1 <= step
                      ? "linear-gradient(90deg,#e8570a,#f97316)"
                      : "rgba(255,255,255,0.08)",
                    marginBottom: ".35rem",
                    transition:   "background .3s",
                  }} />
                  <span style={{
                    fontSize:   ".65rem",
                    fontWeight: 600,
                    color:      i + 1 <= step ? "#e8570a" : "#475569",
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── STEP 1: Personal info ── */}
        {step === 1 && (
          <form onSubmit={handleInfoSubmit} style={{ padding: "1.75rem 2rem" }}>
            {formErr && (
              <div style={{
                padding:      ".7rem 1rem",
                borderRadius: 8,
                background:   "rgba(239,68,68,0.1)",
                border:       "1px solid rgba(239,68,68,0.2)",
                color:        "#f87171",
                fontSize:     ".82rem",
                marginBottom: "1.25rem",
                display:      "flex",
                alignItems:   "center",
                gap:          ".4rem",
              }}>
                {Icons.alertCircle} {formErr}
              </div>
            )}

            {[
              { key: "name",  label: "Full Name",     type: "text",  placeholder: "e.g. Rajesh Kumar",          required: true  },
              { key: "phone", label: "Phone Number",  type: "tel",   placeholder: "e.g. +91 98765 43210",       required: true  },
              { key: "email", label: "Email Address", type: "email", placeholder: "e.g. raj@email.com (optional)", required: false },
            ].map(({ key, label, type, placeholder, required }) => (
              <div key={key} style={{ marginBottom: "1.1rem" }}>
                <label style={{
                  display:      "block",
                  fontSize:     ".78rem",
                  fontWeight:   700,
                  color:        "#94a3b8",
                  marginBottom: ".4rem",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}>
                  {label} {required && <span style={{ color: "#f87171" }}>*</span>}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{
                    width:        "100%",
                    padding:      ".7rem 1rem",
                    background:   "rgba(255,255,255,0.05)",
                    border:       "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    color:        "#f1f5f9",
                    fontSize:     ".9rem",
                    outline:      "none",
                    boxSizing:    "border-box",
                    transition:   "border-color .2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(232,87,10,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width:        "100%",
                padding:      ".85rem",
                background:   "linear-gradient(135deg,#e8570a,#c44608)",
                border:       "none",
                borderRadius: 10,
                color:        "#fff",
                fontSize:     ".95rem",
                fontWeight:   700,
                cursor:       submitting ? "not-allowed" : "pointer",
                opacity:      submitting ? 0.7 : 1,
                marginTop:    ".5rem",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                gap:          ".5rem",
                boxShadow:    "0 4px 20px rgba(232,87,10,0.3)",
              }}
            >
              {submitting ? "Please wait…" : <>Continue {Icons.chevronRight}</>}
            </button>
          </form>
        )}

        {/* ── STEP 2: Document uploads ── */}
        {step === 2 && (
          <div style={{ padding: "1.75rem 2rem" }}>
            <div style={{
              display:      "flex",
              alignItems:   "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
            }}>
              <div>
                <div style={{ fontSize: ".95rem", fontWeight: 700, color: "#e2e8f0" }}>
                  Upload Your Documents
                </div>
                <div style={{ fontSize: ".78rem", color: "#64748b", marginTop: 2 }}>
                  Files are securely stored. Admins review before approval.
                </div>
              </div>
              <div style={{
                fontSize:     ".75rem",
                fontWeight:   700,
                color:        uploadedCount >= 3 ? "#4ade80" : "#e8570a",
                background:   uploadedCount >= 3 ? "rgba(74,222,128,0.1)" : "rgba(232,87,10,0.1)",
                border:       `1px solid ${uploadedCount >= 3 ? "rgba(74,222,128,0.2)" : "rgba(232,87,10,0.2)"}`,
                borderRadius: 99,
                padding:      "3px 10px",
                flexShrink:   0,
              }}>
                {uploadedCount}/{UPLOAD_FIELDS.length}
              </div>
            </div>

            {UPLOAD_FIELDS.map(field => (
              <DocUploadRow
                key={field.docType}
                field={field}
                applicationId={applicationId}
                uploaded={!!uploadedDocs[field.docType]}
                onUploaded={handleDocUploaded}
              />
            ))}

            <button
              type="button"
              onClick={handleFinalize}
              disabled={finalizing}
              style={{
                width:        "100%",
                padding:      ".85rem",
                background:   "linear-gradient(135deg,#e8570a,#c44608)",
                border:       "none",
                borderRadius: 10,
                color:        "#fff",
                fontSize:     ".95rem",
                fontWeight:   700,
                cursor:       "pointer",
                marginTop:    "1.5rem",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                gap:          ".5rem",
                boxShadow:    "0 4px 20px rgba(232,87,10,0.3)",
              }}
            >
              {Icons.check} Submit Application
            </button>
            <p style={{
              textAlign: "center",
              fontSize:  ".72rem",
              color:     "#475569",
              marginTop: ".75rem",
            }}>
              You can submit with only the required documents. Optional ones can be added later.
            </p>
          </div>
        )}

        {/* ── STEP 3: Success ── */}
        {step === 3 && (
          <div style={{
            padding:   "3rem 2rem",
            textAlign: "center",
          }}>
            <div style={{
              width:          72,
              height:         72,
              borderRadius:   "50%",
              background:     "rgba(74,222,128,0.1)",
              border:         "2px solid rgba(74,222,128,0.25)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              margin:         "0 auto 1.5rem",
              fontSize:       "2rem",
            }}>
              ✅
            </div>
            <h3 style={{
              margin:     "0 0 .6rem",
              fontSize:   "1.3rem",
              fontWeight: 800,
              color:      "#f1f5f9",
              fontFamily: "'DM Serif Display', serif",
            }}>
              Application Submitted!
            </h3>
            <p style={{ color: "#64748b", fontSize: ".88rem", lineHeight: 1.6, margin: "0 0 2rem" }}>
              Your application is under review. Our team will verify your documents and
              add you to the network soon. We'll contact you on <strong style={{ color: "#94a3b8" }}>{form.phone}</strong>.
            </p>
            <button
              onClick={onBack}
              style={{
                padding:      ".7rem 2rem",
                background:   "rgba(255,255,255,0.06)",
                border:       "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                color:        "#94a3b8",
                fontSize:     ".88rem",
                fontWeight:   600,
                cursor:       "pointer",
              }}
            >
              {Icons.chevronLeft} Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}