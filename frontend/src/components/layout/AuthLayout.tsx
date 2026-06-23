import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <Outlet />
    </main>
  );
}
