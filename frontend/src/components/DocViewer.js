import { useEffect } from "react";
import ReactDOM from "react-dom";

function isPdf(doc) {
  return doc.fileUrl?.toLowerCase().includes(".pdf") ||
         doc.mimeType === "application/pdf";
}

export default function DocViewer({ doc, onClose }) {
  useEffect(() => {
    // Lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const overlay = (
    <div
      onClick={onClose}
      style={{
        position:        "fixed",
        top:             0,
        left:            0,
        width:           "100vw",
        height:          "100vh",
        zIndex:          2147483647,      /* max possible z-index */
        background:      "rgba(0,0,0,0.95)",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "stretch",
        justifyContent:  "flex-start",
      }}
    >
      {/* ── Header bar ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          padding:         "14px 20px",
          background:      "rgba(0,0,0,0.6)",
          borderBottom:    "1px solid rgba(255,255,255,0.1)",
          flexShrink:      0,
        }}
      >
        <span style={{ color: "#fff", fontWeight: 600, fontSize: "1rem", letterSpacing: ".01em" }}>
          {doc.type}
        </span>
        <button
          onClick={onClose}
          style={{
            background:   "rgba(255,255,255,0.14)",
            border:       "1px solid rgba(255,255,255,0.22)",
            borderRadius: "50%",
            width:        40,
            height:       40,
            color:        "#fff",
            cursor:       "pointer",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            fontSize:     "1.1rem",
            fontWeight:   700,
            lineHeight:   1,
            flexShrink:   0,
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Content — fills every remaining pixel ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          flex:            1,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          overflow:        "hidden",
          padding:         "20px",
          minHeight:       0,           /* critical for flex children */
        }}
      >
        {isPdf(doc) ? (
          <iframe
            src={doc.fileUrl}
            title={doc.type}
            style={{
              width:        "100%",
              height:       "100%",
              border:       "none",
              borderRadius: 10,
              background:   "#fff",
              display:      "block",
            }}
          />
        ) : (
          <img
            src={doc.fileUrl}
            alt={doc.type}
            style={{
              maxWidth:    "100%",
              maxHeight:   "100%",
              width:       "auto",
              height:      "auto",
              objectFit:   "contain",
              borderRadius: 10,
              boxShadow:   "0 8px 60px rgba(0,0,0,0.8)",
              display:     "block",
            }}
          />
        )}
      </div>

      {/* ── Tap-to-close hint ── */}
      <div
        style={{
          textAlign:  "center",
          color:      "rgba(255,255,255,0.3)",
          fontSize:   ".72rem",
          padding:    "10px",
          flexShrink: 0,
        }}
      >
        Tap outside or press Esc to close
      </div>
    </div>
  );

  // Portal — renders directly into document.body, bypassing ALL parent z-index/overflow
  return ReactDOM.createPortal(overlay, document.body);
}