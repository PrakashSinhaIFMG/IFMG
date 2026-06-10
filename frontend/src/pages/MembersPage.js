import { useRef, useEffect, useState } from "react";
import { Icons } from "../components/Icons";
import PageLoader from "../components/PageLoader";
import { membersAPI } from "../services/api";

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

export default function MembersPage({ city, onBack, onSelectMember }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const ref = useAnimateIn([city.id, members]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    membersAPI.getByCityId(city.id)
      .then(data => { if (!cancelled) setMembers(data.members || []); })
      .catch(err  => { if (!cancelled) setError(err.message || "Failed to load members."); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [city.id]);

  return (
    <>
      {loading && <PageLoader />}
      <div className="page">
        <div className="inner-page" ref={ref}>
          <button className="back-btn anim" onClick={onBack}>
            {Icons.chevronLeft} Back to Cities
          </button>

          <div className="page-hdr anim">
            <div className="page-hdr-top">
              <div>
                <h2>Packers &amp; Movers in <span>{city.name}</span></h2>
                <p>Verified professionals ready to serve you</p>
              </div>
              {!loading && (
                <div className="member-count-badge">
                  {members.length} Member{members.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>

          {error && !loading && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--g400)" }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && members.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--g400)", fontSize: ".95rem" }}>
              No members in {city.name} yet.
            </div>
          )}

          {!error && members.length > 0 && (
            <div className="members-grid">
              {members.map((m, i) => (
                <div
                  className="member-card anim"
                  key={m.id}
                  style={{ animationDelay: `${0.1 + i * 0.09}s` }}
                  onClick={() => onSelectMember(m)}
                >
                  <div className="mc-top">

                    {/* Avatar — always 52×52 circle, inline styles win over CSS class */}
                    <div style={{
                      width: 52, height: 52, minWidth: 52,
                      borderRadius: "50%",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: m.profilePicUrl
                        ? "transparent"
                        : "linear-gradient(135deg,#e8570a,#c44608)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(232,87,10,0.28)",
                      border: "2px solid rgba(232,87,10,0.15)",
                    }}>
                      {m.profilePicUrl
                        ? <img
                            src={m.profilePicUrl}
                            alt={m.name}
                            style={{
                              width: "100%", height: "100%",
                              objectFit: "cover",
                              objectPosition: "center top",
                              display: "block",
                            }}
                          />
                        : <span style={{
                            fontFamily: "'DM Serif Display',serif",
                            fontSize: "1rem", color: "#fff", fontWeight: 700,
                          }}>
                            {m.initials}
                          </span>
                      }
                    </div>

                    <div>
                      <div className="mc-name">{m.name}</div>
                      <div className="mc-role">{m.phone}</div>
                    </div>
                  </div>

                  <div className="mc-tags">
                    <span className="tag tag-gr">{Icons.check} Verified</span>
                    <span className="tag tag-sl">{Icons.mapPin} {city.name}</span>
                  </div>

                  <div className="mc-footer">
                    <span style={{ fontSize: ".75rem", color: "var(--g400)" }} />
                    <button
                      className="btn-view-profile"
                      onClick={e => { e.stopPropagation(); onSelectMember(m); }}
                    >
                      View Profile {Icons.chevronRight}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <footer className="footer">&copy; 2026 <strong>India's First Movers Group</strong></footer>
      </div>
    </>
  );
}