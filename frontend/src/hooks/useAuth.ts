import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { setAuth, logout } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (payload: any) => authService.login(payload),
    onSuccess: async (res) => {
      // Backend response structure: { success: true, data: { access_token, user, ... } }
      const authData = res.data.data;
      if (authData) {
        setAuth(authData.user, authData.access_token);
        navigate("/dashboard");
      }
    },
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return {
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout: handleLogout,
  };
}
