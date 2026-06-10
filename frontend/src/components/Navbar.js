import { useState, useEffect } from "react";
import { Icons } from "./Icons";

export default function Navbar({ page, goHome, onAdminClick }) {
  const [sh, setSh]                   = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [deferredPrompt, setPrompt]   = useState(null);
  const [installState, setInstall]    = useState("hidden");

  useEffect(() => {
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isPWA) return;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setInstall("prompt");
    };
    window.addEventListener("beforeinstallprompt", handler);

    const fallback = setTimeout(() => {
      setInstall(prev => prev === "hidden" ? "manual" : prev);
    }, 3000);

    window.addEventListener("appinstalled", () => {
      setInstall("hidden");
      setPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    const handle = () => setSh(window.scrollY > 8);
    window.addEventListener("scroll", handle);
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [page]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstall("hidden");
        setPrompt(null);
      }
    } else {
      alert(
        "To install this app:\n\n" +
        "Android Chrome: Tap the 3-dot menu → \"Add to Home Screen\"\n\n" +
        "iOS Safari: Tap the Share button → \"Add to Home Screen\"\n\n" +
        "Desktop Chrome: Click the install icon (⊕) in the address bar"
      );
    }
  };

  const handleAdminClick = () => {
    setMenuOpen(false);
    onAdminClick();
  };

  const showBtn = installState !== "hidden";

  return (
    <>
      <nav className={`nav${sh ? " sh" : ""}`}>
        <div className="nav-in">
          <button className="logo" onClick={goHome}>
            {/* IFMG logo image instead of truck icon */}
            <img
              src="/logo192.png"
              alt="IFMG"
              style={{
                width:        36,
                height:       36,
                borderRadius: 8,
                objectFit:    "contain",
                flexShrink:   0,
              }}
            />
            <span className="logo-text">India's First<span>Movers Group</span></span>
          </button>

          <div className="nav-right">
            <button
              className={`nav-link${page === "cities" ? " act" : ""}`}
              onClick={goHome}
            >
              {Icons.home} Home
            </button>
            <button className="nav-btn-outline" onClick={handleAdminClick}>
              {Icons.lock} Admin Login
            </button>
            {showBtn && (
              <button className="install-btn visible" onClick={handleInstall}>
                {Icons.download} Install App
              </button>
            )}
            <button className="nav-cta">
              {Icons.phone} Call Now
            </button>
          </div>

          <button
            className={`nav-hamburger${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-menu open">
          <button
            className={`mobile-menu-link${page === "cities" ? " act" : ""}`}
            onClick={() => { goHome(); setMenuOpen(false); }}
          >
            {Icons.home} Home
          </button>
          <button className="mobile-menu-link" onClick={handleAdminClick}>
            {Icons.lock} Admin Login
          </button>
          <div className="mobile-divider" />
          {showBtn && (
            <button className="mobile-install-btn" onClick={handleInstall}>
              {Icons.download} Install App
            </button>
          )}
          <button className="mobile-cta">
            {Icons.phone} Call Now
          </button>
        </div>
      )}
    </>
  );
}