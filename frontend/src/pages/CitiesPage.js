import { useRef, useEffect, useState } from "react";
import { Icons } from "../components/Icons";
import PageLoader from "../components/PageLoader";
import { citiesAPI } from "../services/api";

function useAnimateIn(deps) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const items = ref.current.querySelectorAll(".anim");
    items.forEach((el, i) => {
      el.style.animationDelay = `${i * 0.04}s`;
      el.style.animationPlayState = "running";
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export default function CitiesPage({ onSelectCity, onJoin }) {
  const [q, setQ]             = useState("");
  const [cities, setCities]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    citiesAPI.getAll()
      .then(data => { if (!cancelled) setCities(data.cities || []); })
      .catch(err  => { if (!cancelled) setError(err.message || "Failed to load cities."); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = q.trim()
    ? cities.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
    : cities;

  const grouped = {};
  filtered.forEach(c => {
    const l = c.name[0].toUpperCase();
    if (!grouped[l]) grouped[l] = [];
    grouped[l].push(c);
  });
  const letters = Object.keys(grouped).sort();
  const ref = useAnimateIn([q, cities]);

  return (
    <>
      {loading && <PageLoader />}
      <div className="page">
        <div className="page-body">

          {/* Hero */}
          <div className="hero-strip">
            <div className="hero-glow" />
            <div className="hero-line" />
            <div className="hero-tag">
              <span className="hero-tag-dot" />
              Verified Network
            </div>
            <h1 className="hero-h1">
              Our <em>Associate Members</em><br />Across India
            </h1>
            <p className="hero-sub">
              Select your city to browse verified packers &amp; movers ready to serve you.
            </p>
            <div className="hero-count">
              <strong>{cities.length}</strong> cities
              <span className="hero-divider" />
              <strong>500+</strong> verified members
            </div>

            {/* Search */}
            <div className="search-wrap">
              <div className="search-box">
                <span className="search-icon">{Icons.search}</span>
                <input
                  className="search-input"
                  placeholder="Search your city…"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                />
                {q && (
                  <button className="search-clear" onClick={() => setQ("")} aria-label="Clear">
                    {Icons.x}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Join CTA banner */}
          <div style={{
            margin:   "0 auto 2rem",
            maxWidth: 900,
            padding:  "0 1rem",
          }}>
            <div style={{
              background:     "linear-gradient(135deg, rgba(232,87,10,0.12) 0%, rgba(196,70,8,0.06) 100%)",
              border:         "1px solid rgba(232,87,10,0.2)",
              borderRadius:   16,
              padding:        "1.5rem 2rem",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              gap:            "1.5rem",
              flexWrap:       "wrap",
            }}>
              <div>
                <div style={{
                  fontSize:     "1.05rem",
                  fontWeight:   800,
                  color:        "var(--g800, #1a1a1a)",
                  marginBottom: ".3rem",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          ".5rem",
                }}>
                  <img src="/logo192.png" alt="IFMG" style={{ width: 22, height: 22, borderRadius: 4, objectFit: "contain", verticalAlign: "middle" }} /> Want to join IFMG Network?
                </div>
                <div style={{
                  fontSize:   ".85rem",
                  color:      "var(--g500, #6b7280)",
                  lineHeight: 1.5,
                }}>
                  Register as a verified packer &amp; mover. Submit your details and documents for admin approval.
                </div>
              </div>
              <button
                onClick={onJoin}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  gap:            ".5rem",
                  padding:        ".7rem 1.5rem",
                  background:     "linear-gradient(135deg,#e8570a,#c44608)",
                  border:         "none",
                  borderRadius:   10,
                  color:          "#fff",
                  fontSize:       ".9rem",
                  fontWeight:     700,
                  cursor:         "pointer",
                  flexShrink:     0,
                  boxShadow:      "0 4px 18px rgba(232,87,10,0.3)",
                  whiteSpace:     "nowrap",
                  transition:     "transform .15s, box-shadow .15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(232,87,10,0.4)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 18px rgba(232,87,10,0.3)";
                }}
              >
                {Icons.userPlus} Join Now
              </button>
            </div>
          </div>

          {/* Error state */}
          {error && !loading && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--g400)" }}>
              <div style={{ fontSize: "2rem", marginBottom: ".5rem" }}>⚠️</div>
              <div>{error}</div>
              <button
                className="btn-submit-a"
                style={{ marginTop: "1rem", maxWidth: 180 }}
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}

          {/* Cities grid */}
          {!error && (
            <div className="cities-wrap" ref={ref}>
              {!loading && letters.length === 0 && (
                <div className="no-results">
                  <div className="nr-icon">{Icons.search}</div>
                  <div className="nr-text">
                    {q
                      ? <>No cities found for &ldquo;<strong>{q}</strong>&rdquo;</>
                      : "No cities available yet."}
                  </div>
                </div>
              )}
              {letters.map(letter => (
                <div className="alpha-group" key={letter}>
                  <div className="alpha-label">{letter}</div>
                  <div className="cities-grid">
                    {grouped[letter].map(city => (
                      <div
                        className="city-item anim"
                        key={city.id}
                        onClick={() => onSelectCity(city)}
                      >
                        <div className="city-icon">{Icons.mapPin}</div>
                        <div className="city-name">Packers and Movers in {city.name}</div>
                        <span className="city-arrow">{Icons.chevronRight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="footer">
          &copy; 2026 <strong>India's First Movers Group</strong> &mdash; India&apos;s Premium Relocation Partner
        </footer>
      </div>
    </>
  );
}