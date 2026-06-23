import { useState, useEffect } from "react";
import DesktopTrainingPlanPage from "./DesktopTrainingPlanPage";
import MobileTrainingPlanPage from "./MobileTrainingPlanPage";

export default function TrainingPlanPage() {
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

  return isMobile ? <MobileTrainingPlanPage /> : <DesktopTrainingPlanPage />;
}
