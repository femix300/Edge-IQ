import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { logoutFirebase } from "@/lib/firebase";
import { useState, useEffect, Component, type ReactNode } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: any) { console.error("[ErrorBoundary]", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-20 gap-4">
          <p className="text-[#ff4757] text-sm">Something went wrong loading this page.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = "/markets"; }}
            className="px-4 py-2 bg-[#00d4ff] text-[#0a0e17] rounded-lg text-sm font-bold"
          >
            Go to Markets
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useAuthStore } from "@/stores";
import {
  Radar,
  Grid3X3,
  FlaskConical,
  Wallet,
  Target,
  Settings,
  Menu,
  X,
  Zap,
  Home,
  User,
  LogOut,
} from "lucide-react";

const navItems = [
  { name: "Home", route: "/home", icon: Home },
  { name: "Markets", route: "/markets", icon: Grid3X3 },
  { name: "Signals", route: "/signals", icon: Zap },
  { name: "Portfolio", route: "/portfolio", icon: Wallet },
  { name: "Backtest", route: "/backtest", icon: FlaskConical },
  { name: "Calibration", route: "/calibration", icon: Target },
  { name: "Settings", route: "/settings", icon: Settings },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [_profileOpen, _setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      
    } else {
      
    }
    return () => {  };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    try { await logoutFirebase(); } catch {}
    localStorage.removeItem("edgeiq_firebase_token");
    logout();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen bg-[#0a0e17]">
      {/* Sidebar — width transitions between collapsed (w-14) and expanded (w-56) */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 bg-[#0a0e17] border-r border-[#0a0e17] h-screen sticky top-0 transition-all duration-300 overflow-hidden ${sidebarOpen ? "w-56" : "w-14"}`}>
        {/* Header row */}
        <div className="flex items-center justify-between px-3 py-4 min-h-[60px] border-b border-[#0a0e17]">
          {sidebarOpen ? (
            <>
              <button onClick={() => { navigate("/home"); setSidebarOpen(false); }} className="w-8 h-8 rounded-lg bg-[#00d4ff] flex items-center justify-center hover:bg-[#00d4ff]/80 transition-colors flex-shrink-0">
                <Radar className="w-5 h-5 text-[#0a0e17]" />
              </button>
              <span className="font-bold text-[#dee2f5] flex-1 ml-3 whitespace-nowrap">EdgeIQ</span>
              <button onClick={() => setSidebarOpen(false)} className="text-[#5a6070] hover:text-[#dee2f5] transition-colors flex-shrink-0">
                <Menu className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="mx-auto text-[#5a6070] hover:text-[#dee2f5] transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nav items — only visible when expanded */}
        {sidebarOpen && (
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overscroll-contain">
            {navItems.map((item) => {
              const isActive = location.pathname === item.route || location.pathname.startsWith(`${item.route}/`);
              const Icon = item.icon;
              return (
                <button
                  key={item.route}
                  onClick={() => { navigate(item.route); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all justify-start ${
                    isActive ? "bg-[#00d4ff]/10 text-[#00d4ff]" : "text-[#8b92a8] hover:text-[#dee2f5] hover:bg-[#1a2030]"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{item.name}</span>
                </button>
              );
            })}
          </nav>
        )}
        {!sidebarOpen && <div className="flex-1" />}

        {/* Footer — only visible when expanded */}
        {sidebarOpen && (
          <div className="px-2 py-4 border-t border-[#1a2030] space-y-1">
            <button
              onClick={() => { navigate("/profile"); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-[#8b92a8] hover:text-[#dee2f5] hover:bg-[#1a2030] transition-all justify-start"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-[#ff4757] hover:bg-[#ff4757]/10 transition-all justify-start"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Sign Out</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse-dot flex-shrink-0" />
              <span className="text-xs text-[#8b92a8] whitespace-nowrap">Live Data</span>
            </div>
          </div>
        )}
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0f1420] border-b border-[#1a2030] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#00d4ff] flex items-center justify-center">
            <Radar className="w-4 h-4 text-[#0a0e17]" />
          </div>
          <span className="font-bold text-[#dee2f5]">EdgeIQ</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <button onClick={() => navigate("/profile")} className="w-7 h-7 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-[#00d4ff]" />
            </button>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-[#dee2f5]">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#0a0e17]/95 pt-16">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.route;
              const Icon = item.icon;
              return (
                <button
                  key={item.route}
                  onClick={() => { navigate(item.route); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${isActive ? "bg-[#00d4ff]/10 text-[#00d4ff]" : "text-[#8b92a8]"}`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </button>
              );
            })}
            <div className="border-t border-[#1a2030] pt-2 mt-2">
              <button onClick={() => { navigate("/profile"); setMobileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[#8b92a8]">
                <User className="w-5 h-5" />
                Profile
              </button>
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[#ff4757]">
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1 pt-14 md:pt-0 min-h-screen overflow-x-hidden">
        <div className="p-4 md:p-8 max-w-[1440px] mx-auto">
          <ErrorBoundary key={location.pathname}><Outlet /></ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
