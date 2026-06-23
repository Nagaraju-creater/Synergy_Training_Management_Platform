import { useState, useEffect } from "react";
import DesktopEmployeesPage from "./DesktopEmployeesPage";
import MobileEmployeesPage from "./MobileEmployeesPage";

export default function EmployeesPage() {
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

  return isMobile ? <MobileEmployeesPage /> : <DesktopEmployeesPage />;
}
