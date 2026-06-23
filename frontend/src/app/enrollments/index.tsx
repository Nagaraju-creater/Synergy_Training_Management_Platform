import { useState, useEffect } from "react";
import DesktopEnrollmentsPage from "./DesktopEnrollmentsPage";
import MobileEnrollmentsPage from "./MobileEnrollmentsPage";

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

export default function EnrollmentsPageRouter() {
  const { width } = useWindowSize();
  const isMobile = width < 1024;

  if (isMobile) {
    return <MobileEnrollmentsPage />;
  }
  return <DesktopEnrollmentsPage />;
}
