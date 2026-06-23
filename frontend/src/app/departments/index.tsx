import { useState, useEffect } from "react";
import DesktopDepartmentsPage from "./DesktopDepartmentsPage";
import MobileDepartmentsPage from "./MobileDepartmentsPage";

export default function DepartmentsPage() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile ? <MobileDepartmentsPage /> : <DesktopDepartmentsPage />;
}
