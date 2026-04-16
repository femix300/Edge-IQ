import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const mobileNav = [
    { name: "Markets", route: "/markets", icon: "grid_view" },
    { name: "Terminal", route: "/terminal/latest", icon: "monitoring" },
    { name: "Data", route: "/quant-lab", icon: "analytics" },
    { name: "Wallet", route: "/vault", icon: "wallet" },
  ];

  return (
    <div className="flex min-h-screen bg-[#080d1a]">
      <Sidebar />
      <main className="flex-1 pb-20 transition-all md:ml-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[#434653]/30 bg-[#090e1b] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden shadow-[0_-8px_32px_0_rgba(0,0,0,0.5)]">
        {mobileNav.map((item) => {
          const isActive = location.pathname.startsWith(item.route) || (item.route === '/' && location.pathname === '/');
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.route)}
              className={`flex flex-col items-center gap-1 p-2 transition-colors cursor-pointer ${
                isActive ? "text-[#1a4db8]" : "text-[#8d909e] hover:text-[#dee2f5]"
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? "text-[#b3c5ff] theme-ignore" : ""}`}>
                {item.icon}
              </span>
              <span className={`font-mono text-[10px] uppercase font-bold tracking-wider ${isActive && "text-[#b3c5ff]"}`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardLayout;
