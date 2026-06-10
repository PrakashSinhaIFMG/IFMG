import { useState, useEffect } from "react";
import Navbar           from "./components/Navbar";
import BottomNav        from "./components/BottomNav";
import AdminLoginModal  from "./components/AdminLoginModal";
import AdminDashboard   from "./components/AdminDashboard";
import CitiesPage       from "./pages/CitiesPage";
import MembersPage      from "./pages/MembersPage";
import ProfilePage      from "./pages/ProfilePage";
import JoinPage         from "./pages/JoinPage";
import { authAPI, getToken, clearToken } from "./services/api";

export default function App() {
  // page: "cities" | "members" | "profile" | "admin" | "join"
  const [page,       setPage]      = useState("cities");
  const [showLogin,  setShowLogin] = useState(false);
  const [isAdmin,    setIsAdmin]   = useState(false);
  const [adminTab,   setAdminTab]  = useState("overview");

  const [selectedCity,   setCity]   = useState(null);
  const [selectedMember, setMember] = useState(null);

  // ── Restore admin session from stored JWT ──────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    authAPI.me()
      .then(() => { setIsAdmin(true); setPage("admin"); })
      .catch(() => { clearToken(); });
  }, []);

  // ── Auth handlers ──────────────────────────────────────────────────────────
  function handleLogin() {
    setIsAdmin(true);
    setShowLogin(false);
    setPage("admin");
    setAdminTab("overview");
  }

  function handleLogout() {
    clearToken();
    setIsAdmin(false);
    setPage("cities");
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────
  const goHome          = () => { setPage("cities"); setCity(null); setMember(null); };
  const goBackToCity    = () => { setPage("cities"); setCity(null); setMember(null); };
  const goBackToMembers = () => { setPage("members"); setMember(null); };

  const handleSelectCity = (city) => {
    setCity(city);
    setPage("members");
  };

  const handleSelectMember = (member) => {
    setMember(member);
    setPage("profile");
  };

  // ── Bottom nav ─────────────────────────────────────────────────────────────
  const handleBnNavigate = (id) => {
    if (id === "admin") { setShowLogin(true); return; }
    setPage(id);
  };

  // Hide navbar on admin and join pages
  const hideNavbar = page === "admin" || page === "join";

  return (
    <>
      {!hideNavbar && (
        <Navbar
          page={page}
          goHome={goHome}
          onAdminClick={() => setShowLogin(true)}
        />
      )}

      {showLogin && (
        <AdminLoginModal
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}

      {page === "cities" && (
        <CitiesPage
          onSelectCity={handleSelectCity}
          onJoin={() => setPage("join")}
        />
      )}

      {page === "join" && (
        <JoinPage onBack={() => setPage("cities")} />
      )}

      {page === "members" && selectedCity && (
        <MembersPage
          city={selectedCity}
          onBack={goBackToCity}
          onSelectMember={handleSelectMember}
        />
      )}

      {page === "profile" && selectedMember && selectedCity && (
        <ProfilePage
          member={selectedMember}
          city={selectedCity}
          onBack={goBackToMembers}
          onBackCity={goBackToCity}
          onMemberUpdate={(updated) => setMember(updated)}
        />
      )}

      {page === "admin" && isAdmin && (
        <AdminDashboard
          activeTab={adminTab}
          onTabChange={setAdminTab}
          onLogout={handleLogout}
        />
      )}

      <BottomNav
        page={page}
        adminTab={adminTab}
        onNavigate={handleBnNavigate}
        onAdminTab={setAdminTab}
      />
    </>
  );
}