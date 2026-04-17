import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,#15326b_0%,rgba(21,50,107,0.22)_18%,transparent_45%),linear-gradient(180deg,#06101f_0%,#08111b_55%,#050b13_100%)]" />
      <Sidebar />
      <main className="min-h-screen overflow-x-hidden px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:ml-20 lg:px-8 lg:pb-10 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
