import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
// Mapping of route segments to display names
const ROUTE_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  trainings: "Trainings",
  enrollments: "Enrollments",
  nominations: "Nominations",
  effectiveness: "Effectiveness",
  employees: "Employees",
  departments: "Departments",
  reports: "Reports",
  settings: "Settings",

  reviews: "Reviews",
  "team-progress": "Team Progress",
};

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 list-none m-0 p-0">
        <li>
          <Link 
            to="/dashboard" 
            className="flex items-center justify-center w-6 h-6 rounded-md text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all duration-300"
          >
            <Home size={14} strokeWidth={2.5} />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = ROUTE_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <React.Fragment key={href}>
              <li className="flex items-center">
                <ChevronRight size={13} strokeWidth={3} className="text-slate-300 dark:text-slate-700" />
              </li>
              <li>
                {isLast ? (
                  <span className="text-[13px] font-bold text-slate-900 dark:text-white tracking-tight px-1 truncate max-w-[150px] drop-shadow-sm">
                    {label}
                  </span>
                ) : (
                  <Link
                    to={href}
                    className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[150px] px-1"
                  >
                    {label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
