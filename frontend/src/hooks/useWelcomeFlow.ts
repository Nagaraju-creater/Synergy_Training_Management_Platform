import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { settingsService } from "@/services/settings.service";
import { usersService } from "@/services/users.service";

export function useWelcomeFlow() {
  const { user, setUser } = useAuthStore();
  const [behavior, setBehavior] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await settingsService.getSettings();
        setBehavior(settings.onboarding_behavior || "first_login_only");
      } catch (err) {
        setBehavior("first_login_only"); // default fallback
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Determine flow state
  let shouldShowFullOnboarding = false;
  let shouldShowWelcomeBack = false;

  if (user && behavior && !loading) {
    if (!user.onboarding_completed) {
      shouldShowFullOnboarding = true;
    } else if (!user.never_show_welcome_back && behavior !== "disabled" && behavior !== "first_login_only") {
      const daysThreshold = behavior === "30_days" ? 30 : behavior === "60_days" ? 60 : null;
      if (daysThreshold && user.last_login) {
        const lastLoginDate = new Date(user.last_login);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - lastLoginDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= daysThreshold) {
          shouldShowWelcomeBack = true;
        }
      }
    }
  }

  const completeFlow = useCallback(async (isFullOnboarding: boolean) => {
    if (!user) return;
    
    const updates: any = { never_show_welcome_back: true };
    if (isFullOnboarding) {
      updates.onboarding_completed = true;
    }

    // Update local state in one go
    setUser({ ...user, ...updates });

    // Single API call
    try {
      await usersService.updateMe(updates);
    } catch (err) {
      console.error("Failed to update welcome flow state", err);
    }
  }, [user, setUser]);

  return {
    shouldShowWelcome: shouldShowFullOnboarding || shouldShowWelcomeBack,
    isFirstLogin: shouldShowFullOnboarding,
    showWelcomeBackOnly: shouldShowWelcomeBack,
    completeFlow,
    userName: user?.full_name ?? "there",
    userRole: user?.role ?? "employee",
    isLoading: loading
  };
}
