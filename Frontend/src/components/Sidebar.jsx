import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLight, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const menuItems = [
    { name: "Home", path: "/", icon: "home" },
    { name: "Markets", path: "/markets", icon: "grid_view" },
    { name: "Analysis", path: "/terminal/latest", icon: "monitoring" },
    { name: "Data", path: "/quant-lab", icon: "analytics" },
    { name: "Wallet", path: "/vault", icon: "wallet" },
  ];

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-full w-20 flex-col items-center border-r border-[#434653]/30 bg-[#090e1b] py-6 transition-all hover:w-64 group sm:w-20 md:flex hidden">
      {/* Logo */}
      <div className="mb-6 flex w-full items-center justify-center gap-3 px-6 overflow-hidden">
        <span className="material-symbols-outlined text-3xl text-[#1a4db8] shrink-0 theme-ignore">
          bolt
        </span>
        <span className="font-headline text-xl font-bold text-[#b3c5ff] opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
          EdgeIQ
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex w-full flex-1 flex-col gap-2 px-3 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        {menuItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`flex w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-3 transition-colors ${
                isActive
                  ? "bg-[#1a4db8]/20 text-[#b3c5ff]"
                  : "text-[#8d909e] hover:bg-[#1a1f2d] hover:text-[#dee2f5]"
              }`}
            >
              <span
                className={`material-symbols-outlined shrink-0 ${isActive && "theme-ignore"}`}
              >
                {item.icon}
              </span>
              <span className="font-mono text-sm font-semibold uppercase opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Settings & Theme */}
      <div className="mt-auto flex w-full flex-col gap-2 px-3 overflow-hidden border-t border-[#434653]/30 pt-4">
        <button
          onClick={() => navigate("/pricing")}
          className="flex w-full cursor-pointer items-center gap-4 rounded-xl bg-[#1a4db8]/10 px-3 py-2.5 text-[#b3c5ff] border border-[#1a4db8]/30 transition-colors hover:bg-[#1a4db8] hover:text-white group-hover:justify-start justify-center"
        >
          <span className="material-symbols-outlined shrink-0 text-[#b3c5ff] group-hover:text-inherit">
            workspace_premium
          </span>
          <span className="font-mono text-sm font-bold uppercase opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
            Upgrade Plan
          </span>
        </button>

        <button
          onClick={toggleTheme}
          className="flex w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-2.5 text-[#8d909e] transition-colors hover:bg-[#1a1f2d] hover:text-[#dee2f5]"
        >
          <span className="material-symbols-outlined shrink-0">
            {isLight ? "dark_mode" : "light_mode"}
          </span>
          <span className="font-mono text-sm font-semibold uppercase opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
            {isLight ? "Dark Mode" : "Light Mode"}
          </span>
        </button>

        <button className="flex w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-2.5 text-[#8d909e] transition-colors hover:bg-[#1a1f2d] hover:text-[#dee2f5]">
          <span className="material-symbols-outlined shrink-0">settings</span>
          <span className="font-mono text-sm font-semibold uppercase opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
            Settings
          </span>
        </button>

        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="flex w-full cursor-pointer items-center gap-4 rounded-xl px-3 py-2.5 text-[#ffb4ab] transition-colors hover:bg-[#1a1f2d] hover:text-red-400"
        >
          <span className="material-symbols-outlined shrink-0">logout</span>
          <span className="font-mono text-sm font-semibold uppercase opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
