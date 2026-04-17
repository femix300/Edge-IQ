import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { label: "Overview", path: "/", icon: "home" },
  { label: "Signals", path: "/signals", icon: "grid_view" },
  { label: "Backtester", path: "/backtester", icon: "analytics" },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <>
      <aside className="group hidden h-full w-20 flex-col border-r border-[#434653]/30 bg-[#090e1b] py-6 transition-all hover:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex">
        <div className="mb-6 flex w-full items-center gap-3 overflow-hidden px-6">
          <span className="material-symbols-outlined shrink-0 text-3xl text-[#1a4db8]">
            bolt
          </span>
          <span className="font-headline text-[2rem] font-bold tracking-tight text-[#b3c5ff] opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
            EdgeIQ
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-3">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={`flex items-center gap-4 rounded-xl px-3 py-3 transition-colors ${
                  isActive
                    ? "bg-[#1a4db8]/20 text-[#b3c5ff]"
                    : "text-[#8d909e] hover:bg-[#1a1f2d] hover:text-[#dee2f5]"
                }`}
              >
                <span className="material-symbols-outlined shrink-0 text-[22px]">
                  {item.icon}
                </span>
                <span className="text-sm font-bold uppercase tracking-[0.14em] opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto overflow-hidden border-t border-[#434653]/30 px-3 pt-4">
          <div className="rounded-2xl border border-[#1a4db8]/30 bg-[#1a4db8]/10 px-3 py-3 text-[#b3c5ff]">
            <div className="flex items-center justify-center gap-3 group-hover:justify-start">
              <span className="material-symbols-outlined shrink-0 text-[22px] text-[#b3c5ff]">
                psychiatry
              </span>
              <p className="hidden text-xs font-bold uppercase tracking-[0.16em] group-hover:block">
                Model A
              </p>
            </div>
            <p className="mt-2 hidden text-sm leading-6 text-[#c3c6d5] group-hover:block">
              Signals, research, and sizing guidance. Bayse still handles execution.
            </p>
          </div>
        </div>
      </aside>

      <div className="mb-5 rounded-none border border-[#434653]/30 bg-[#090e1b] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.24)] lg:hidden">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-[#1a4db8]">
            bolt
          </span>
          <span className="font-headline text-3xl font-bold tracking-tight text-[#b3c5ff]">
            EdgeIQ
          </span>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[#434653]/30 bg-[#090e1b] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_0_rgba(0,0,0,0.5)] rounded-none lg:hidden">
        {navItems.slice(0, 4).map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={`flex flex-col items-center gap-1 p-2 ${
                isActive ? "text-[#b3c5ff]" : "text-[#8d909e]"
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </>
  );
};

export default Sidebar;
