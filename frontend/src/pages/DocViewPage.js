import { Icons } from "../components/Icons";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

function isPdf(url) {
  return url?.toLowerCase().includes(".pdf");
}

export default function DocViewPage({ doc, onBack }) {
  // doc = { type, fileUrl, mimeType, date }
  const url = doc?.fileUrl;
  const pdf  = isPdf(url) || doc?.mimeType === "application/pdf";

  return (
    <div style={{
      position:       "fixed",
      top:            0, left: 0, right: 0, bottom: 0,
      background:     "#111",
      display:        "flex",
      flexDirection:  "column",
      zIndex:         9999,
    }}>

      {/* ── Top bar ── */}
      <div style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-between",
        padding:         "12px 16px",
        background:      "#1a1a1a",
        borderBottom:    "1px solid #333",
        flexShrink:      0,
      }}>
        <button
          onClick={onBack}
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            8,
            background:     "rgba(255,255,255,0.1)",
            border:         "1px solid rgba(255,255,255,0.15)",
            borderRadius:   8,
            color:          "#fff",
            padding:        "8px 14px",
            cursor:         "pointer",
            fontSize:       ".85rem",
            fontWeight:     600,
          }}
        >
          {Icons.chevronLeft} Back
        </button>

        <span style={{
          color:      "#fff",
          fontWeight: 700,
          fontSize:   ".95rem",
          flex:       1,
          textAlign:  "center",
          padding:    "0 12px",
        }}>
          {doc?.type || "Document"}
        </span>

        {/* Spacer to balance the back button */}
        <div style={{ width: 80 }} />
      </div>

      {/* ── Document area — takes all remaining height ── */}
      <div style={{
        flex:           1,
        overflow:       "hidden",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     "#111",
      }}>
        {!url ? (
          <div style={{ color: "#888", fontSize: "1rem" }}>
            No document available.
          </div>
        ) : pdf ? (
          /* PDF — full iframe */
          <iframe
            src={url}
            title={doc?.type}
            style={{
              width:      "100%",
              height:     "100%",
              border:     "none",
              background: "#fff",
              display:    "block",
            }}
          />
) : (
  /* Image with zoom */
  <div style={{
    width: "100%",
    height: "100%",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}>
    <TransformWrapper>
      <TransformComponent>
        <img
          src={url}
          alt={doc?.type}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        />
      </TransformComponent>
    </TransformWrapper>
  </div>
)}
      </div>

      {/* ── Bottom info bar ── */}
      <div style={{
        padding:      "10px 16px",
        background:   "#1a1a1a",
        borderTop:    "1px solid #333",
        flexShrink:   0,
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
      }}>
        <span style={{ color: "#888", fontSize: ".75rem" }}>
          {doc?.date ? `Uploaded ${doc.date}` : ""}
        </span>
        <span style={{ color: "#555", fontSize: ".72rem" }}>
          Tap Back to return
        </span>
      </div>
    </div>
  );
}