import { Icons } from "./Icons";

// Home/public pages: only Home + Admin
const HOME_TABS = [
  { id: "cities", icon: Icons.home,  label: "Home"  },
  { id: "admin",  icon: Icons.lock,  label: "Admin" },
];

// Admin page tabs — mirrors the sidebar
const ADMIN_TABS = [
  { id: "overview",    icon: Icons.barChart,  label: "Overview"  },
  { id: "add-member",  icon: Icons.userPlus,  label: "Add"       },
  { id: "upload-doc",  icon: Icons.upload,    label: "Upload"    },
  { id: "delete-doc",  icon: Icons.trash,     label: "Delete"    },
  { id: "cities",      icon: Icons.building,  label: "Cities"    },
];

export default function BottomNav({ page, adminTab, onNavigate, onAdminTab }) {
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (!isPWA) return null;

  const isAdminPage = page === "admin";

  if (isAdminPage) {
    return (
      <nav className="bottom-nav">
        {ADMIN_TABS.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`bn-item${adminTab === id ? " act" : ""}`}
            onClick={() => onAdminTab(id)}
          >
            <span className="bn-icon">{icon}</span>
            <span className="bn-label">{label}</span>
          </button>
        ))}
      </nav>
    );
  }

  // Home / Members / Profile pages — show only 2 tabs
  return (
    <nav className="bottom-nav">
      {HOME_TABS.map(({ id, icon, label }) => {
        const isActive = page === id || (id === "cities" && (page === "members" || page === "profile"));
        return (
          <button
            key={id}
            className={`bn-item${isActive ? " act" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <span className="bn-icon">{icon}</span>
            <span className="bn-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}