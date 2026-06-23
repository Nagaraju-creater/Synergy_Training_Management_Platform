import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, ArrowRight, ArrowLeft,
  Mail, Lock, ShieldCheck, Zap, Check, Activity,
  BookOpen, Rocket, GraduationCap, Lightbulb, Award
} from "lucide-react";

import synergyLogo from "@/assets/synergy-logo.png";

import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/store/authStore";
import { analyticsService } from "@/services/analytics.service";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// ── Schemas ──────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});
const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type LoginData = z.infer<typeof loginSchema>;
type ForgotData = z.infer<typeof forgotSchema>;

// ── Slides ────────────────────────────────────────────────────────
const SLIDES = [
  {
    image: "/images/training_1.png",
    title: "Empower Your\nLearning Journey",
    subtitle: "Unlock your full potential with data-driven insights and personalized growth paths.",
    kpi: "94% Course Completion"
  },
  {
    image: "/images/growth_2.png",
    title: "Upskill.\nGrow. Lead.",
    subtitle: "Empowering workforce excellence through intelligent learning.",
    kpi: "3.5x Faster Onboarding"
  },
  {
    image: "/images/team_3.png",
    title: "Collaborative\nExcellence",
    subtitle: "Sync with your team and master new skills through shared knowledge.",
    kpi: "10k+ Learning Hours"
  },
  {
    image: "/images/analytics_4.png",
    title: "Data-Driven\nMastery",
    subtitle: "Track your progress with real-time analytics and predictive insights.",
    kpi: "Real-time Metrics"
  },
  {
    image: "/images/workshop_5.png",
    title: "Enterprise\nReadiness",
    subtitle: "Equip your organization with the tools needed for tomorrow's challenges.",
    kpi: "Global Scale"
  },
];

// ── Panel animation variants ─────────────────────────────────────────────────
const panelVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0, filter: "blur(8px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0, filter: "blur(8px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

// ── Mascot Component ─────────────────────────────────────────────────────────
function Mascot({ state }: { state: "idle" | "email" | "password" }) {
  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (state === "idle") {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 200);
      }
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, [state]);

  const eyeX = state === "email" ? 3.5 : 0;
  const eyeY = state === "email" ? 3.5 : 0;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full animate-pulse pointer-events-none" />
      <svg width="72" height="72" viewBox="0 0 80 80" className="relative z-10 overflow-visible">
        {/* Antenna */}
        <path d="M40,25 L40,12" stroke="#6366F1" strokeWidth="3" strokeLinecap="round" />
        <motion.circle 
          cx="40" 
          cy="10" 
          r="4" 
          fill="#818CF8"
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        
        {/* Head */}
        <rect x="20" y="22" width="40" height="34" rx="10" fill="#FFFFFF" stroke="#6366F1" strokeWidth="2.5" />
        <rect x="24" y="26" width="32" height="26" rx="6" fill="#0F172A" />

        {/* Eyes Screen */}
        <g>
          {state === "password" ? null : (
            <>
              {/* Left Eye */}
              <motion.ellipse
                cx="34"
                cy="38"
                rx="3.5"
                ry={isBlinking ? 0.5 : 3.5}
                fill="#22D3EE"
                animate={{ x: eyeX, y: eyeY }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
              {/* Right Eye */}
              <motion.ellipse
                cx="46"
                cy="38"
                rx="3.5"
                ry={isBlinking ? 0.5 : 3.5}
                fill="#22D3EE"
                animate={{ x: eyeX, y: eyeY }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
            </>
          )}
        </g>
        
        {/* Mouth - smiling */}
        <motion.path
          d={state === "password" ? "M36,44 Q40,43 44,44" : "M36,43 Q40,47 44,43"}
          stroke="#22D3EE"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Neck */}
        <rect x="36" y="55" width="8" height="6" rx="2" fill="#94A3B8" />

        {/* Body */}
        <path d="M26,60 L54,60 C58,60 62,64 62,69 L62,75 L18,75 L18,69 C18,64 22,60 26,60 Z" fill="#FFFFFF" stroke="#6366F1" strokeWidth="2" />
        
        {/* Left Arm */}
        <motion.g
          animate={state === "password" ? {
            rotate: 130,
            x: 10,
            y: -14
          } : {
            rotate: 0,
            x: 0,
            y: 0
          }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          style={{ originX: "22px", originY: "64px" }}
        >
          <path d="M22,64 C16,68 12,74 16,78" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="78" r="4" fill="#818CF8" />
        </motion.g>

        {/* Right Arm */}
        <motion.g
          animate={
            state === "password"
              ? { rotate: -130, x: -10, y: -14 }
              : { rotate: [0, -40, -10, -40, -10, 0] }
          }
          transition={
            state === "password"
              ? { type: "spring", stiffness: 200, damping: 15 }
              : { duration: 2.2, ease: "easeInOut", delay: 0.5 }
          }
          style={{ originX: "58px", originY: "64px" }}
        >
          <path d="M58,64 C64,68 68,74 64,78" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="64" cy="78" r="4" fill="#818CF8" />
        </motion.g>
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "forgot" | "forgot-success">("login");
  const [direction, setDirection] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shake, setShake] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [isMobile, setIsMobile] = useState(false);
  const [mascotState, setMascotState] = useState<"idle" | "email" | "password">("idle");
  const [randomQuote, setRandomQuote] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const QUOTES = [
      "Every expert was once a beginner.",
      "Small learning steps create big career transformations.",
      "Knowledge compounds every day."
    ];
    setRandomQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        const x = Math.max(-15, Math.min(15, e.gamma / 2));
        const y = Math.max(-15, Math.min(15, (e.beta - 45) / 2));
        setTilt({ x, y });
      }
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX - window.innerWidth / 2) / 25;
    const y = (e.clientY - window.innerHeight / 2) / 25;
    setMousePos({ x, y });
  };

  const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  // Auto-slide
  useEffect(() => {
    const t = setInterval(() => setCurrentSlide((p) => (p + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const goTo = (next: typeof mode) => {
    setDirection(next === "login" ? -1 : 1);
    setServerError(null);
    setMode(next);
  };

  // Login form
  const {
    register: regLogin,
    handleSubmit: handleLogin,
    setValue,
    watch: watchLogin,
    formState: { errors: le, isSubmitting: loggingIn },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema), defaultValues: { rememberMe: false } });

  // Forgot form
  const {
    register: regForgot,
    handleSubmit: handleForgot,
    watch: watchForgot,
    formState: { errors: fe, isSubmitting: sending },
  } = useForm<ForgotData>({ resolver: zodResolver(forgotSchema) });

  const emailVal = watchLogin("email") || "";
  const passVal = watchLogin("password") || "";
  const forgotEmailVal = watchForgot("email") || "";

  const isEmailValid = z.string().email().safeParse(emailVal).success;
  const isForgotEmailValid = z.string().email().safeParse(forgotEmailVal).success;

  const isEmailActive = emailFocused || emailVal.length > 0;
  const isPassActive = passFocused || passVal.length > 0;
  const isForgotEmailActive = emailFocused || forgotEmailVal.length > 0;

  const onLogin = async (data: LoginData) => {
    setServerError(null);
    setShake(false);

    try {
      const res = await authService.login(
        { email: data.email.trim(), password: data.password.trim() },
        { timeout: 8_000 },
      );
      const authData = res.data.data;
      if (authData) {
        setAuth(authData.user, authData.access_token);
        const role = authData.user?.role?.toLowerCase();
        navigate("/welcome");
        if (role === "employee")
          queryClient.prefetchQuery({ queryKey: ["employee-dashboard"], queryFn: () => analyticsService.getEmployeeDashboard() });
        else if (role === "manager")
          queryClient.prefetchQuery({ queryKey: ["manager-dashboard"], queryFn: () => analyticsService.getManagerDashboard() });
        else if (role === "admin")
          queryClient.prefetchQuery({ queryKey: ["admin-dashboard"], queryFn: () => analyticsService.getAdminDashboard() });
      }
    } catch (err: any) {
      const isTimeout = err?.code === "ECONNABORTED" || err?.message?.includes("timeout");
      setServerError(
        isTimeout
          ? "Login is taking too long. Please check your connection and try again."
          : err?.response?.data?.detail || "Invalid credentials. Please verify your email and password.",
      );
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const onForgot = async (data: ForgotData) => {
    try {
      await authService.forgotPassword(data.email.trim());
      setMode("forgot-success");
    } catch {
      setServerError("Unable to send reset link. Please try again.");
    }
  };

  const renderMobileLogin = () => {
    const px = tilt.x !== 0 ? tilt.x : mousePos.x;
    const py = tilt.y !== 0 ? tilt.y : mousePos.y;

    const floatingVariants = (yDelta: number, rotateDelta: number, duration: number, delay: number) => ({
      animate: {
        y: [0, yDelta, 0],
        rotate: [0, rotateDelta, -rotateDelta, 0],
        transition: {
          duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay
        }
      }
    });

    const emailRegister = regLogin("email");
    const passwordRegister = regLogin("password");
    const forgotEmailRegister = regForgot("email");

    return (
      <div 
        onMouseMove={handleMouseMove}
        className="h-screen min-h-screen max-h-screen w-full flex flex-col justify-between px-6 py-6 overflow-hidden relative select-none bg-[#F8FAFC]"
      >
        <style>{`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-8px) rotate(2deg); }
          }
          @keyframes ripple-effect {
            from { transform: translate(-50%, -50%) scale(0); opacity: 0.4; }
            to { transform: translate(-50%, -50%) scale(4.5); opacity: 0; }
          }
          .animate-ripple {
            animation: ripple-effect 0.65s ease-out forwards;
          }
          @keyframes aurora-1 {
            0%, 100% { transform: translate(0px, 0px) scale(1); }
            50% { transform: translate(30px, -20px) scale(1.2); }
          }
          @keyframes aurora-2 {
            0%, 100% { transform: translate(0px, 0px) scale(1.15); }
            50% { transform: translate(-30px, 30px) scale(0.85); }
          }
          @keyframes aurora-3 {
            0%, 100% { transform: translate(0px, 0px) scale(0.95); }
            50% { transform: translate(25px, 20px) scale(1.1); }
          }
          .animate-aurora-1 { animation: aurora-1 12s ease-in-out infinite; }
          .animate-aurora-2 { animation: aurora-2 15s ease-in-out infinite; }
          .animate-aurora-3 { animation: aurora-3 10s ease-in-out infinite; }
        `}</style>

        {/* Aurora Background Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-300/20 blur-[90px] animate-aurora-1" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[320px] h-[320px] rounded-full bg-purple-300/15 blur-[100px] animate-aurora-2" />
          <div className="absolute top-[30%] left-[20%] w-[250px] h-[250px] rounded-full bg-cyan-300/15 blur-[80px] animate-aurora-3" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 via-white/80 to-slate-100/90" />
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-indigo-500"
              style={{
                width: Math.random() * 2 + 1 + "px",
                height: Math.random() * 2 + 1 + "px",
                top: Math.random() * 100 + "%",
                left: Math.random() * 100 + "%",
                opacity: Math.random() * 0.15 + 0.05,
                animation: `float-slow ${Math.random() * 8 + 8}s linear infinite`,
                animationDelay: `-${Math.random() * 8}s`,
                boxShadow: "0 0 8px 1px rgba(99, 102, 241, 0.15)"
              }}
            />
          ))}
        </div>

        {/* Brand Area */}
        <div className="relative z-10 flex justify-center pt-2">
          <div className="flex items-center gap-2 bg-slate-900/5 border border-slate-900/10 backdrop-blur-md px-3 py-1 rounded-full">
            <img src={synergyLogo} alt="Synergy Logo" className="w-5 h-5 object-contain" />
            <span className="text-[10px] font-black text-slate-800 tracking-widest uppercase">
              Synergy Learning
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-sm w-full mx-auto xs:space-y-4 space-y-3">
          
          {/* Hero section */}
          <div className="relative w-full h-[100px] flex items-center justify-center">
            
            {/* Floating Learning Objects */}
            {/* Book */}
            <motion.div
              variants={floatingVariants(-6, 8, 4.2, 0.1)}
              animate="animate"
              style={{ x: px * 0.3, y: py * 0.3 }}
              className="absolute top-0 left-6 w-8 h-8 rounded-lg flex items-center justify-center bg-white/60 border border-slate-200/80 shadow-sm backdrop-blur-md"
            >
              <BookOpen size={15} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            </motion.div>

            {/* Rocket */}
            <motion.div
              variants={floatingVariants(-8, -6, 4.8, 0.3)}
              animate="animate"
              style={{ x: px * 0.5, y: py * 0.5 }}
              className="absolute top-0 right-6 w-8 h-8 rounded-lg flex items-center justify-center bg-white/60 border border-slate-200/80 shadow-sm backdrop-blur-md"
            >
              <Rocket size={15} className="text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
            </motion.div>

            {/* Graduation Cap */}
            <motion.div
              variants={floatingVariants(-5, -8, 3.8, 0.5)}
              animate="animate"
              style={{ x: px * -0.4, y: py * -0.4 }}
              className="absolute top-10 left-1 w-8 h-8 rounded-lg flex items-center justify-center bg-white/60 border border-slate-200/80 shadow-sm backdrop-blur-md"
            >
              <GraduationCap size={15} className="text-emerald-600 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </motion.div>

            {/* Lightbulb */}
            <motion.div
              variants={floatingVariants(-7, 6, 4.6, 0.2)}
              animate="animate"
              style={{ x: px * -0.2, y: py * -0.2 }}
              className="absolute top-10 right-1 w-8 h-8 rounded-lg flex items-center justify-center bg-white/60 border border-slate-200/80 shadow-sm backdrop-blur-md"
            >
              <Lightbulb size={15} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(253,224,71,0.4)]" />
            </motion.div>

            {/* Award Badge */}
            <motion.div
              variants={floatingVariants(-4, 10, 4.0, 0.4)}
              animate="animate"
              style={{ x: px * 0.6, y: py * 0.6 }}
              className="absolute -bottom-2 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/60 border border-slate-200/80 shadow-sm backdrop-blur-md"
            >
              <Award size={15} className="text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
            </motion.div>

            {/* Central Mascot */}
            <Mascot state={mascotState} />
          </div>

          {/* Welcome Area */}
          <div className="text-center space-y-0.5">
            <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-2">
              <span>👋</span> Welcome Back
            </h2>
            <h3 className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Continue Your Learning Journey
            </h3>
            <p className="text-[10px] font-semibold text-slate-500 max-w-[280px] mx-auto leading-normal">
              Track progress, unlock skills, and grow your career.
            </p>
          </div>

          {/* Glassmorphic Form Card */}
          <motion.div
            layout
            className={cn(
              "bg-white/70 border border-white/80 backdrop-blur-md rounded-[24px] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]",
              shake && "animate-auth-shake"
            )}
          >
            <AnimatePresence mode="wait">
              {/* Login State */}
              {mode === "login" && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Server error */}
                  {serverError && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-[10px] font-semibold"
                    >
                      <Zap size={12} className="shrink-0 text-red-500" />
                      <span>{serverError}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleLogin(onLogin)} className="space-y-4" noValidate>
                    {/* Email Field */}
                    <div className="relative flex flex-col justify-center">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                      <input
                        {...emailRegister}
                        type="email"
                        onFocus={() => {
                          setEmailFocused(true);
                          setMascotState("email");
                        }}
                        onBlur={(e) => {
                          emailRegister.onBlur(e);
                          setEmailFocused(false);
                          setMascotState("idle");
                        }}
                        className={cn(
                          "w-full pt-5 pb-1.5 pl-11 pr-4 h-[50px] rounded-2xl bg-slate-50/80 border border-slate-200/80 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 text-sm",
                          le.email && "border-red-400 focus:ring-red-400/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]",
                          !le.email && isEmailValid && "border-emerald-400/60 focus:ring-emerald-400/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                        )}
                      />
                      <label
                        className={cn(
                          "absolute left-11 transition-all duration-300 pointer-events-none select-none",
                          isEmailActive 
                            ? "top-1.5 text-[9px] uppercase tracking-wider font-bold text-indigo-600" 
                            : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
                        )}
                      >
                        Work Email
                      </label>
                    </div>
                    {le.email && <p className="text-[10px] text-red-500 font-semibold mt-0.5 ml-2 flex items-center gap-1"><Zap size={10}/> {le.email.message}</p>}

                    {/* Password Field */}
                    <div className="relative flex flex-col justify-center">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                      <input
                        {...passwordRegister}
                        type={showPassword ? "text" : "password"}
                        onFocus={() => {
                          setPassFocused(true);
                          setMascotState("password");
                        }}
                        onBlur={(e) => {
                          passwordRegister.onBlur(e);
                          setPassFocused(false);
                          setMascotState("idle");
                        }}
                        className={cn(
                          "w-full pt-5 pb-1.5 pl-11 pr-10 h-[50px] rounded-2xl bg-slate-50/80 border border-slate-200/80 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 text-sm",
                          le.password && "border-red-400 focus:ring-red-400/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]"
                        )}
                      />
                      <label
                        className={cn(
                          "absolute left-11 transition-all duration-300 pointer-events-none select-none",
                          isPassActive 
                            ? "top-1.5 text-[9px] uppercase tracking-wider font-bold text-indigo-600" 
                            : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
                        )}
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        <motion.div
                          key={showPassword ? "eye-off" : "eye-on"}
                          initial={{ rotate: -30, opacity: 0.5 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </motion.div>
                      </button>
                    </div>
                    {le.password && <p className="text-[10px] text-red-500 font-semibold mt-0.5 ml-2 flex items-center gap-1"><Zap size={10}/> {le.password.message}</p>}

                    {/* Remember me + Forgot password link */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button 
                        type="button" 
                        onClick={() => { setRememberMe((v) => !v); setValue("rememberMe", !rememberMe); }}
                        className="flex items-center gap-2 group cursor-pointer"
                      >
                        <div className={cn(
                          "w-[18px] h-[18px] rounded-md border flex items-center justify-center transition-all duration-300",
                          rememberMe ? "bg-indigo-600 border-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.25)]" : "border-slate-300 bg-white"
                        )}>
                          {rememberMe && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="font-semibold text-slate-600 group-hover:text-slate-800 select-none">Remember me</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => goTo("forgot")}
                        className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addRipple}
                      type="submit"
                      disabled={loggingIn}
                      className="w-full h-[48px] mt-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-brand-500 to-purple-600 text-white font-black text-sm shadow-[0_6px_20px_rgba(99,102,241,0.25)] relative overflow-hidden flex items-center justify-center"
                    >
                      {ripples.map((ripple) => (
                        <span
                          key={ripple.id}
                          className="absolute bg-white/30 rounded-full animate-ripple pointer-events-none"
                          style={{
                            top: ripple.y,
                            left: ripple.x,
                            width: 100,
                            height: 100,
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      ))}
                      <span className="relative flex items-center justify-center gap-2">
                        {loggingIn ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Authenticating...
                          </>
                        ) : (
                          <>
                            Sign in to Dashboard <ArrowRight size={16} />
                          </>
                        )}
                      </span>
                    </motion.button>
                  </form>
                </motion.div>
              )}

              {/* Forgot Password State */}
              {mode === "forgot" && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {serverError && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-[10px] font-semibold"
                    >
                      <Zap size={12} className="shrink-0 text-red-500" />
                      <span>{serverError}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleForgot(onForgot)} className="space-y-4" noValidate>
                    {/* Email Field */}
                    <div className="relative flex flex-col justify-center">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                      <input
                        {...forgotEmailRegister}
                        type="email"
                        onFocus={() => {
                          setEmailFocused(true);
                          setMascotState("email");
                        }}
                        onBlur={(e) => {
                          forgotEmailRegister.onBlur(e);
                          setEmailFocused(false);
                          setMascotState("idle");
                        }}
                        className={cn(
                          "w-full pt-5 pb-1.5 pl-11 pr-4 h-[50px] rounded-2xl bg-slate-50/80 border border-slate-200/80 text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 text-sm",
                          fe.email && "border-red-400 focus:ring-red-400/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]",
                          !fe.email && isForgotEmailValid && "border-emerald-400/60 focus:ring-emerald-400/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                        )}
                      />
                      <label
                        className={cn(
                          "absolute left-11 transition-all duration-300 pointer-events-none select-none",
                          isForgotEmailActive 
                            ? "top-1.5 text-[9px] uppercase tracking-wider font-bold text-indigo-600" 
                            : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
                        )}
                      >
                        Work Email
                      </label>
                    </div>
                    {fe.email && <p className="text-[10px] text-red-500 font-semibold mt-0.5 ml-2 flex items-center gap-1"><Zap size={10}/> {fe.email.message}</p>}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addRipple}
                      type="submit"
                      disabled={sending}
                      className="w-full h-[48px] mt-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-brand-500 to-purple-600 text-white font-black text-sm shadow-[0_6px_20px_rgba(99,102,241,0.25)] relative overflow-hidden flex items-center justify-center"
                    >
                      {ripples.map((ripple) => (
                        <span
                          key={ripple.id}
                          className="absolute bg-white/30 rounded-full animate-ripple pointer-events-none"
                          style={{
                            top: ripple.y,
                            left: ripple.x,
                            width: 100,
                            height: 100,
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      ))}
                      <span className="relative flex items-center justify-center gap-2">
                        {sending ? "Sending Link..." : "Send Recovery Link"}
                      </span>
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => goTo("login")}
                      className="flex items-center justify-center gap-2 w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors pt-2"
                    >
                      <ArrowLeft size={14} /> Back to login
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Success State */}
              {mode === "forgot-success" && (
                <motion.div
                  key="forgot-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4 py-2"
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                    <Mail className="text-indigo-600 w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800">Check your inbox</h4>
                    <p className="text-slate-500 text-[11px] leading-relaxed max-w-[240px] mx-auto font-medium">
                      A secure recovery link has been sent to your email. It will expire in 30 minutes.
                    </p>
                  </div>
                  <button
                    onClick={() => goTo("login")}
                    className="w-full h-[46px] rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft size={14} /> Return to Login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Motivation Quote Area */}
          <div className="h-[28px] flex items-center justify-center px-4">
            <span className="text-[10px] text-center text-slate-500 font-medium italic">
              "{randomQuote}"
            </span>
          </div>
        </div>

        {/* Footer Trust Badges Strip */}
        <div className="relative z-10 flex justify-center items-center gap-2 pt-2 pb-1">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/50 border border-slate-200/80 text-[9px] font-bold tracking-wider uppercase text-slate-600 shadow-sm">
            🔒 Secure Login
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/50 border border-slate-200/80 text-[9px] font-bold tracking-wider uppercase text-slate-600 shadow-sm">
            🎓 Learning Platform
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/50 border border-slate-200/80 text-[9px] font-bold tracking-wider uppercase text-slate-600 shadow-sm">
            ⚡ Fast Access
          </span>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return renderMobileLogin();
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#080B1A] relative overflow-hidden">
      {/* Premium Cinematic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.25),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.2),transparent_40%)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-[#080B1A] to-purple-950/40" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.02] mix-blend-overlay" />
      </div>

      {/* Floating Particles (CSS only for performance) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              opacity: Math.random() * 0.4 + 0.15,
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `-${Math.random() * 10}s`,
              boxShadow: "0 0 10px 2px rgba(129, 140, 248, 0.4)"
            }}
          />
        ))}
      </div>

      {/* ── Main Container ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative z-10 w-full lg:w-[1200px] xl:w-[1300px] flex overflow-hidden min-h-[100vh] lg:min-h-0 lg:h-[720px] lg:rounded-3xl",
          "shadow-[0_0_100px_rgba(99,102,241,0.25),0_0_0_1px_rgba(255,255,255,0.08)]",
          "bg-white/5 backdrop-blur-3xl",
          shake && "animate-auth-shake",
        )}
      >
        {/* ── LEFT: Cinematic Slideshow ──────────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col bg-[#0b0f24]">
          {/* Slide images */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: 1.05 }}
                transition={{ duration: 10, ease: "linear" }}
                className="absolute inset-0"
              >
                <img
                  src={SLIDES[currentSlide].image}
                  alt={SLIDES[currentSlide].title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {/* Soft ambient lighting & text legibility gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/30 via-transparent to-transparent" />
                <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(99,102,241,0.3)] pointer-events-none" />
                <div className="absolute inset-0 bg-brand-500/10 mix-blend-overlay" />
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Top Brand Area */}
          <div className="absolute top-10 left-10 z-20">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xl border border-white/30 p-2 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.4)]">
                <img src={synergyLogo} alt="Synergy Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[22px] font-black text-white tracking-tight leading-none drop-shadow-md">
                  Training Management
                </span>
                <span className="text-[13px] font-bold text-brand-300 tracking-widest uppercase mt-1">
                  System
                </span>
              </div>
            </motion.div>
          </div>

          {/* Slide content */}
          <div className="absolute bottom-12 left-10 right-10 z-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-xl"
              >
                {/* Optional KPI */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/20 backdrop-blur-md border border-brand-400/30 mb-6 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  <Activity size={14} className="text-brand-400" />
                  <span className="text-xs font-bold tracking-wide text-white">{SLIDES[currentSlide].kpi}</span>
                </motion.div>

                <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tight whitespace-pre-line mb-4 drop-shadow-2xl">
                  {SLIDES[currentSlide].title}
                </h2>
                <p className="text-indigo-200/90 text-lg leading-relaxed max-w-md font-medium">
                  {SLIDES[currentSlide].subtitle}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Premium Animated Progress Dots */}
            <div className="flex gap-3 mt-10 items-center">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    "relative h-1.5 rounded-full overflow-hidden transition-all duration-700 ease-out",
                    currentSlide === i ? "w-16 bg-white/30" : "w-3 bg-white/30 hover:bg-white/60",
                  )}
                >
                  {currentSlide === i && (
                    <motion.div
                      className="absolute top-0 left-0 bottom-0 bg-brand-400 shadow-[0_0_15px_rgba(129,140,248,0.9)]"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 6, ease: "linear" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Subtle lighting layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-transparent to-purple-500/20 pointer-events-none mix-blend-screen" />
        </div>

        {/* ── RIGHT: Glassmorphic Form Panel ───────────────────── */}
        <div className="w-full lg:w-[45%] flex flex-col relative overflow-hidden bg-gradient-to-br from-indigo-600 via-brand-600 to-violet-600 border-l border-white/20 shadow-[-20px_0_50px_rgba(0,0,0,0.3)]">
          {/* Decorative Orbs */}
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full bg-white/20 blur-[100px] -top-32 -right-32 pointer-events-none"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[300px] h-[300px] rounded-full bg-violet-300/30 blur-[90px] bottom-0 -left-20 pointer-events-none"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          <div className="lg:hidden flex items-center gap-4 pt-12 px-8">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 p-2 flex items-center justify-center">
              <img src={synergyLogo} alt="Synergy Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-black text-white tracking-tight leading-none drop-shadow-md">
                Training Management
              </span>
            </div>
          </div>

          <div className="relative z-10 flex flex-col justify-center h-full px-8 sm:px-16 py-12 lg:py-0">
            <AnimatePresence mode="wait" custom={direction}>

              {/* ── LOGIN FORM ──────────────────────────────────────────── */}
              {mode === "login" && (
                <motion.div key="login" custom={direction} variants={panelVariants} initial="enter" animate="center" exit="exit" className="space-y-8 w-full max-w-[380px] mx-auto lg:mx-0">
                  <div className="space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Welcome back</h1>
                    <p className="text-indigo-100 text-sm font-medium">Log in to your enterprise learning portal</p>
                  </div>

                  <AnimatePresence>
                    {serverError && (
                      <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-md shadow-lg shadow-red-500/5">
                        <Zap size={16} className="shrink-0 text-red-400 animate-pulse" />
                        <span className="text-red-200 text-xs font-semibold leading-relaxed">{serverError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleLogin(onLogin)} className="space-y-5" noValidate>
                    {/* Email */}
                    <div className="space-y-2 relative group/input">
                      <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-100 group-focus-within/input:text-white transition-colors">Work Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200 group-focus-within/input:text-white transition-colors pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="name@company.com"
                          className={cn(
                            "h-[56px] pl-11 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-indigo-200 focus:bg-white/15 focus:ring-2 focus:ring-white/40 focus:border-white/50 hover:border-white/30 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300",
                            le.email && "border-red-300 focus:ring-red-300 focus:border-red-300"
                          )}
                          {...regLogin("email")}
                        />
                      </div>
                      {le.email && <p className="text-[11px] text-red-200 font-medium ml-1 flex items-center gap-1"><Zap size={10}/> {le.email.message}</p>}
                    </div>

                    {/* Password */}
                    <div className="space-y-2 relative group/input">
                      <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-100 group-focus-within/input:text-white transition-colors">Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200 group-focus-within/input:text-white transition-colors pointer-events-none" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••"
                          className={cn(
                            "h-[56px] pl-11 pr-12 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-indigo-200 focus:bg-white/15 focus:ring-2 focus:ring-white/40 focus:border-white/50 hover:border-white/30 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300",
                            le.password && "border-red-300 focus:ring-red-300 focus:border-red-300"
                          )}
                          {...regLogin("password")}
                        />
                        <button type="button" onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200 hover:text-white transition-colors" tabIndex={-1}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {le.password && <p className="text-[11px] text-red-200 font-medium ml-1 flex items-center gap-1"><Zap size={10}/> {le.password.message}</p>}
                    </div>

                    {/* Remember me + forgot link */}
                    <div className="flex items-center justify-between pt-2">
                      <button type="button" onClick={() => { setRememberMe((v) => !v); setValue("rememberMe", !rememberMe); }}
                        className="flex items-center gap-3 group cursor-pointer">
                        <div className={cn("w-[22px] h-[22px] rounded-lg border flex items-center justify-center transition-all duration-300",
                          rememberMe ? "bg-white border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]" : "border-white/40 bg-white/5 group-hover:border-white/70")}>
                          {rememberMe && <Check size={14} className="text-brand-600" strokeWidth={3} />}
                        </div>
                        <span className="text-sm font-medium text-indigo-100 group-hover:text-white transition-colors select-none">Remember me</span>
                      </button>
                      <button type="button" onClick={() => goTo("forgot")}
                        className="text-sm font-bold text-white hover:text-indigo-100 transition-colors hover:underline underline-offset-4">
                        Forgot password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      isLoading={loggingIn}
                      className="w-full h-[56px] mt-4 rounded-2xl bg-white text-brand-600 font-black text-[15px] hover:bg-indigo-50 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.3)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay" />
                      <span className="relative flex items-center justify-center gap-2">
                        {loggingIn ? "Authenticating..." : "Sign in to Dashboard"} 
                        {!loggingIn && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                      </span>
                    </Button>
                  </form>

                  {/* Trust/Security Section */}
                  <div className="flex flex-col gap-4 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-white/70"/>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">SOC2 Compliant</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Lock size={14} className="text-white/70"/>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">End-to-End Encrypted</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── FORGOT PASSWORD ─────────────────────────────────────── */}
              {mode === "forgot" && (
                <motion.div key="forgot" custom={direction} variants={panelVariants} initial="enter" animate="center" exit="exit" className="space-y-8 w-full max-w-[380px] mx-auto lg:mx-0">
                  <div className="space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Reset password</h1>
                    <p className="text-indigo-100 text-sm font-medium">Enter your email and we'll send a secure recovery link.</p>
                  </div>

                  <AnimatePresence>
                    {serverError && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                         className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-md shadow-lg shadow-red-500/5">
                        <Zap size={16} className="shrink-0 text-red-400 animate-pulse" />
                        <span className="text-red-200 text-xs font-semibold leading-relaxed">{serverError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleForgot(onForgot)} className="space-y-5" noValidate>
                    <div className="space-y-2 relative group/input">
                      <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-100 group-focus-within/input:text-white transition-colors">Work Email</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200 group-focus-within/input:text-white transition-colors pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="name@company.com"
                          className={cn(
                            "h-[56px] pl-11 rounded-2xl bg-white/10 border-white/20 text-white placeholder:text-indigo-200 focus:bg-white/15 focus:ring-2 focus:ring-white/40 focus:border-white/50 hover:border-white/30 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300",
                            fe.email && "border-red-300 focus:ring-red-300 focus:border-red-300"
                          )}
                          {...regForgot("email")}
                        />
                      </div>
                      {fe.email && <p className="text-[11px] text-red-200 font-medium ml-1 flex items-center gap-1"><Zap size={10}/> {fe.email.message}</p>}
                    </div>

                    <Button
                      type="submit"
                      isLoading={sending}
                      className="w-full h-[56px] mt-4 rounded-2xl bg-white text-brand-600 font-black text-[15px] hover:bg-indigo-50 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.3)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay" />
                      <span className="relative">Send Recovery Link</span>
                    </Button>
                  </form>

                  <button onClick={() => goTo("login")}
                    className="flex items-center justify-center gap-2 w-full text-sm font-bold text-white hover:text-indigo-100 transition-colors group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />Back to login
                  </button>
                </motion.div>
              )}

              {/* ── SUCCESS STATE ────────────────────────────────────────── */}
              {mode === "forgot-success" && (
                <motion.div key="success" custom={direction} variants={panelVariants} initial="enter" animate="center" exit="exit" className="space-y-8 w-full max-w-[380px] mx-auto lg:mx-0 text-center lg:text-left">
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 20 }}
                    className="w-20 h-20 mx-auto lg:mx-0 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                    <Mail className="text-brand-400 w-10 h-10" />
                  </motion.div>
                  <div className="space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Check your inbox</h1>
                    <p className="text-indigo-100 text-[15px] leading-relaxed font-medium">A secure recovery link has been sent to your email address. It will expire in 30 minutes.</p>
                  </div>
                  <Button onClick={() => goTo("login")}
                    className="w-full h-[56px] rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-[15px] hover:bg-white/10 shadow-none transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />Return to Login
                  </Button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
