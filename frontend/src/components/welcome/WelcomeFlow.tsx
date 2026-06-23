import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, TrendingUp, BookOpen, Zap,
  Trophy, ChevronLeft, X, Flame, Clock,
  CheckCircle, ArrowRight, Brain, Rocket, BarChart2,
  Layers, GraduationCap
} from "lucide-react";
import { useWelcomeFlow } from "@/hooks/useWelcomeFlow";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { analyticsService } from "@/services/analytics.service";
import type { EmployeeDashboardData } from "@/types";

// ─── Easing presets ──────────────────────────────────────────────────────────
const EASE_SPRING = [0.16, 1, 0.3, 1] as const;

// ─── Daily quotes ─────────────────────────────────────────────────────────────
const QUOTES = [
  { text: "Small learning steps create big career transformations.", author: "Learning Philosophy", sub: "Adopt the growth mindset" },
  { text: "Every skill you master is a door only you can open.", author: "Growth Mindset", sub: "Unlock your potential" },
  { text: "Invest in learning today. Lead the industry tomorrow.", author: "Career Wisdom", sub: "Build your future" },
  { text: "Knowledge compounds. Start growing yours now.", author: "Professional Dev", sub: "Consistent daily effort" },
];

// ─── Framer variants ─────────────────────────────────────────────────────────
const slideIn = {
  enter: (d: number) => ({ x: d > 0 ? "40%" : "-40%", opacity: 0, filter: "blur(8px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE_SPRING } },
  exit: (d: number) => ({ x: d > 0 ? "-20%" : "20%", opacity: 0, filter: "blur(6px)", transition: { duration: 0.6, ease: EASE_SPRING } }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_SPRING } },
};

const popIn = {
  hidden: { opacity: 0, scale: 0.85, filter: "blur(10px)" },
  show: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE_SPRING } },
};

// ─── Animated counter ────────────────────────────────────────────────────────
function useCounter(target: number, ms = 1100, run = false) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let cur = 0;
    const step = target / (ms / 16);
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setV(target); clearInterval(t); }
      else setV(Math.floor(cur));
    }, 16);
    return () => clearInterval(t);
  }, [target, ms, run]);
  return v;
}

// ─── Touch-swipe hook ────────────────────────────────────────────────────────
function useSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 50) dx < 0 ? onLeft() : onRight();
  };
  return { onTouchStart, onTouchEnd };
}

// ─── Enhanced Cinematic Environment ──────────────────────────────────────────
const STAR_COLORS = ["rgba(167,139,250,0.9)", "rgba(99,102,241,0.8)", "rgba(56,189,248,0.7)", "rgba(251,191,36,0.7)", "rgba(255,255,255,0.6)"];

function CinematicEnvironment() {
  const stars = useRef(
    Array.from({ length: 45 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      sz: Math.random() * 3.5 + 1, dur: Math.random() * 25 + 15,
      delay: Math.random() * -20,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#02030A]">
      {/* 3D Floor Anchor (Provides Grounding/Depth) */}
      <div className="absolute bottom-0 left-0 right-0 h-[45vh] opacity-[0.15]"
           style={{ perspective: "800px", background: "linear-gradient(to top, rgba(99,102,241,0.1), transparent)" }}>
        <div className="absolute inset-0"
             style={{
               transformOrigin: "bottom center",
               transform: "rotateX(75deg) scale(3.5)",
               backgroundImage: "linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)",
               backgroundSize: "40px 40px",
               backgroundPosition: "center bottom",
             }} />
      </div>

      {/* Atmospheric Fog */}
      <div className="absolute bottom-0 left-0 right-0 h-[35vh] bg-gradient-to-t from-[#02030A] via-[#02030A]/90 to-transparent z-0" />

      {/* Aurora Meshes */}
      <div className="anim-aurora absolute rounded-full opacity-60"
        style={{
          width: "120vw", height: "120vw", maxWidth: 1400, maxHeight: 1400,
          top: "-30%", left: "-20%",
          background: "radial-gradient(ellipse, rgba(109,40,217,0.3) 0%, rgba(79,70,229,0.1) 40%, transparent 70%)",
          filter: "blur(90px)",
        }} />
      <div className="anim-aurora-2 absolute rounded-full opacity-60"
        style={{
          width: "100vw", height: "100vw", maxWidth: 1200, maxHeight: 1200,
          bottom: "-20%", right: "-20%",
          background: "radial-gradient(ellipse, rgba(56,189,248,0.15) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)",
          filter: "blur(100px)",
        }} />

      {/* Floating Star Particles */}
      {stars.current.map((s) => (
        <div key={s.id} className="absolute rounded-full"
          style={{
            width: s.sz, height: s.sz, left: `${s.x}%`, top: `${s.y}%`,
            background: s.color, boxShadow: `0 0 ${s.sz * 4}px ${s.color}`,
            animation: `float ${s.dur}s linear ${s.delay}s infinite`,
          }} />
      ))}
    </div>
  );
}

// ─── Unified Progress & Navigation ───────────────────────────────────────────
function ProgressSystem({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 md:gap-3">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="relative h-1.5 w-6 md:w-12 rounded-full overflow-hidden bg-white/[0.08] shadow-inner">
          <motion.div 
            className="absolute inset-0 bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]"
            initial={{ x: "-100%" }}
            animate={{ x: step >= i ? "0%" : "-100%" }}
            transition={{ duration: 0.6, ease: EASE_SPRING }}
          />
        </div>
      ))}
    </div>
  );
}

function UnifiedActionBar({ step, isLast, onNext, onBack, onEnter }: { step: number; isLast: boolean; onNext: () => void; onBack: () => void; onEnter: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 px-6 py-6 md:px-12 md:py-8 border-t border-white/[0.04] bg-[#02030A]/60 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        
        {/* Back Button (Left Anchor) */}
        <div className="flex-1 flex justify-start">
          <AnimatePresence>
            {step > 0 && (
              <motion.button 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                onClick={onBack} 
                className="group flex items-center gap-2 text-indigo-300 hover:text-white transition-colors text-sm md:text-base font-semibold"
              >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
                <span className="hidden sm:inline">Back</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Feature Hint (Center Anchor - Mobile Only or Subtle Desktop) */}
        <div className="flex-1 flex justify-center text-center">
          <span className="text-indigo-400/50 text-[10px] sm:text-xs font-bold tracking-widest uppercase hidden md:block">
            Intelligent Platform
          </span>
        </div>

        {/* Next/Enter Button (Right Anchor) */}
        <div className="flex-1 flex justify-end">
          {!isLast ? (
            <motion.button 
              layoutId="primary-action"
              onClick={onNext} 
              className="group relative px-6 py-3 sm:px-8 sm:py-3.5 rounded-full bg-white text-[#02030A] font-black text-sm md:text-base hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center gap-2"
            >
              Next <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          ) : (
            <motion.button 
              layoutId="primary-action"
              onClick={onEnter} 
              className="group relative px-6 py-3 sm:px-10 sm:py-4 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 text-white font-black text-sm md:text-base hover:scale-[1.02] transition-all shadow-[0_0_40px_rgba(139,92,246,0.6)] flex items-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 bg-white/20 skew-x-[-20deg]" />
              <span className="relative z-10 flex items-center gap-2">
                Enter Hub <Rocket size={18} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.button>
          )}
        </div>
        
      </div>
    </div>
  );
}


// ─── SCREENS ──────────────────────────────────────────────────────────────────

function WelcomeScreen({ name, dept }: { name: string; dept?: string }) {
  const first = name.split(" ")[0];
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="w-full h-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-center px-6 lg:px-12 gap-10 lg:gap-20 pt-16 pb-24">
      
      {/* Left Text */}
      <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 lg:space-y-8 order-2 lg:order-1">
        <motion.div variants={fadeUp} className="space-y-3">
          <p className="text-violet-400 font-black uppercase tracking-[0.25em] text-xs lg:text-sm">Welcome Ecosystem</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-[4.5rem] font-black text-white leading-[1.1] tracking-tight">
            Welcome Back,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-300 to-blue-400">{first}.</span>
          </h1>
        </motion.div>
        
        <motion.p variants={fadeUp} className="text-indigo-200 text-base md:text-xl font-medium max-w-lg leading-relaxed">
          Your learning journey continues here. Discover new paths, track your growth, and unlock your ultimate potential.
        </motion.p>
        
        {dept && (
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-white/[0.03] border border-white/10 text-indigo-300 backdrop-blur-md">
            <Layers size={16} className="text-indigo-400" /> {dept} Team
          </motion.div>
        )}
      </div>

      {/* Right Visual Anchor */}
      <motion.div variants={popIn} className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end order-1 lg:order-2">
        <div className="relative w-48 h-48 md:w-72 md:h-72 xl:w-80 xl:h-80 flex items-center justify-center">
          <div className="w-32 h-32 md:w-48 md:h-48 xl:w-56 xl:h-56 rounded-[2.5rem] bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-[0_0_80px_rgba(139,92,246,0.6),0_0_140px_rgba(139,92,246,0.3)] z-10">
            <Sparkles className="w-16 h-16 md:w-24 md:h-24 text-white" />
          </div>
          <div className="absolute inset-0 rounded-full border border-violet-400/20 animate-spin" style={{ animationDuration: "14s" }} />
          <div className="absolute inset-[-30px] md:inset-[-50px] xl:inset-[-60px] rounded-full border border-indigo-400/10 animate-spin" style={{ animationDuration: "20s", animationDirection: "reverse" }} />
          <div className="absolute w-full h-full" style={{ animation: "orbit 8s linear infinite" }}>
            <span className="absolute w-2 h-2 md:w-3 md:h-3 rounded-full bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.9)] top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="absolute inset-0 rounded-full bg-violet-500/10 anim-pulse-glow blur-3xl -z-10" />
        </div>
      </motion.div>
    </motion.div>
  );
}

function WelcomeBackScreen({ name, data, onSkip }: { name: string; data: EmployeeDashboardData | null; onSkip: () => void }) {
  const first = name.split(" ")[0];
  const missedCount = data?.missed_courses_count || 0;
  const activeCount = data?.active_courses_count || 0;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="w-full h-full max-w-[1400px] mx-auto flex flex-col items-center justify-center px-6 lg:px-12 py-12">
      
      <motion.div variants={fadeUp} className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-violet-500 to-indigo-600 mb-2 shadow-[0_0_60px_rgba(139,92,246,0.4)]">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
          Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">{first}!</span>
        </h1>
        <p className="text-indigo-200 text-lg max-w-lg mx-auto">
          It's been a while. Here's what you missed.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full mb-12">
        <motion.div variants={popIn} className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center backdrop-blur-md">
          <Clock className="text-amber-400 mb-3" size={28} />
          <h3 className="text-3xl font-black text-white">{missedCount}</h3>
          <p className="text-white/60 text-sm font-semibold uppercase tracking-wider">Missed Courses</p>
        </motion.div>
        
        <motion.div variants={popIn} className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center backdrop-blur-md">
          <Rocket className="text-emerald-400 mb-3" size={28} />
          <h3 className="text-3xl font-black text-white">{activeCount}</h3>
          <p className="text-white/60 text-sm font-semibold uppercase tracking-wider">Active Trainings</p>
        </motion.div>
      </div>

      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4">
        <button 
          onClick={onSkip} 
          className="px-10 py-4 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 text-white font-black text-base hover:scale-[1.02] transition-all shadow-[0_0_40px_rgba(139,92,246,0.6)]"
        >
          Go to Dashboard
        </button>
      </motion.div>

    </motion.div>
  );
}

function ImpactScreen() {
  const stats = [
    { val: "94%", label: "Course Completion Rate", icon: <CheckCircle size={24} />, grad: "from-emerald-500 to-teal-400", glow: "rgba(16,185,129,0.3)" },
    { val: "3.5×", label: "Faster Career Growth",  icon: <Rocket size={24} />,      grad: "from-violet-500 to-purple-400", glow: "rgba(139,92,246,0.3)" },
    { val: "10k+", label: "Learning Hours Logged", icon: <Clock size={24} />,        grad: "from-amber-500 to-orange-400", glow: "rgba(245,158,11,0.3)" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="w-full h-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-center px-6 lg:px-12 gap-10 lg:gap-20 pt-16 pb-24">
      
      {/* Left */}
      <div className="w-full lg:w-[45%] flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-400/20 text-teal-300 text-xs font-black uppercase tracking-widest">
          <TrendingUp size={14} /> Ecosystem Impact
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight max-w-md">
          Learning Builds <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-indigo-300 to-violet-300">Careers.</span>
        </motion.h2>
        <motion.p variants={fadeUp} className="text-indigo-200/80 text-base md:text-lg max-w-md leading-relaxed">
          Every completed module accelerates your trajectory. See how dedicated learning actively translates into measurable professional growth.
        </motion.p>
      </div>

      {/* Right Grid */}
      <div className="w-full lg:w-[55%] grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {stats.map((s, i) => (
          <motion.div key={s.label} variants={popIn}
            className={`relative rounded-3xl bg-white/[0.02] border border-white/[0.06] p-6 md:p-8 flex flex-col gap-3 overflow-hidden group hover:bg-white/[0.04] transition-colors backdrop-blur-md ${i === 2 ? 'md:col-span-2 md:flex-row md:items-center' : ''}`}
            style={{ boxShadow: `0 0 40px ${s.glow}` }}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-white shrink-0`}>
              {s.icon}
            </div>
            <div>
              <div className={`text-4xl md:text-5xl font-black bg-gradient-to-br ${s.grad} bg-clip-text text-transparent tracking-tight`}>
                {s.val}
              </div>
              <p className="text-sm md:text-base text-indigo-200 font-semibold mt-1">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function InsightsScreen({ data }: { data: EmployeeDashboardData | null }) {
  const active    = useCounter(data?.active_courses_count ?? 3, 1000, true);
  const completed = useCounter(data?.completed_courses_count ?? 12, 1200, true);
  const streak    = useCounter(data?.streak_days ?? 5, 900, true);
  const progress  = useCounter(Math.round(data?.overall_progress ?? 67), 1400, true);

  const cards = [
    { label: "Active Courses", val: active,    suffix: "",  icon: <BookOpen size={20} />, grad: "from-violet-500 to-indigo-500", glow: "rgba(139,92,246,0.3)" },
    { label: "Completed",      val: completed, suffix: "",  icon: <Trophy   size={20} />, grad: "from-emerald-500 to-teal-400", glow: "rgba(16,185,129,0.3)" },
    { label: "Day Streak",     val: streak,    suffix: "🔥", icon: <Flame   size={20} />, grad: "from-amber-500 to-orange-400", glow: "rgba(245,158,11,0.3)" },
    { label: "Platform Progress",val: progress,  suffix: "%", icon: <BarChart2 size={20}/>, grad: "from-pink-500 to-rose-400",    glow: "rgba(236,72,153,0.3)"  },
  ];

  const xp = data ? Math.min((data.completed_courses_count ?? 0) * 150, 2000) : 750;
  const xpPct = Math.round((xp / 2000) * 100);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="w-full h-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-center px-6 lg:px-12 gap-10 lg:gap-20 pt-16 pb-24">
      
      {/* Left */}
      <div className="w-full lg:w-[45%] flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
        <motion.div variants={fadeUp} className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-400/20 text-violet-300 text-xs font-black uppercase tracking-widest">
            <Brain size={14} /> Profile Snapshot
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight max-w-md">
            Your Progress<br/>at a Glance.
          </h2>
        </motion.div>

        {/* Structured XP Anchored Box */}
        <motion.div variants={fadeUp} className="w-full max-w-md bg-white/[0.02] border border-white/[0.06] p-6 rounded-3xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center gap-2 text-amber-300 text-sm font-bold uppercase tracking-wider">
              <Zap size={16} fill="currentColor" /> Platform XP
            </span>
            <span className="text-amber-300 text-lg font-black tabular-nums">{xp} / 2000</span>
          </div>
          <div className="h-3.5 rounded-full bg-white/5 overflow-hidden shadow-inner">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
              initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }} />
          </div>
          <p className="text-indigo-300/50 text-xs font-semibold text-right mt-2">{2000 - xp} XP to next milestone</p>
        </motion.div>
      </div>

      {/* Right Grid */}
      <div className="w-full lg:w-[55%] grid grid-cols-2 gap-3 lg:gap-5">
        {cards.map((c) => (
          <motion.div key={c.label} variants={popIn}
            className="relative rounded-3xl bg-white/[0.02] border border-white/[0.06] p-5 md:p-8 flex flex-col items-start gap-4 overflow-hidden group hover:bg-white/[0.04] transition-colors backdrop-blur-md"
            style={{ boxShadow: `0 0 30px ${c.glow}15` }}>
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-[1rem] bg-gradient-to-br ${c.grad} flex items-center justify-center text-white shadow-lg`}>
              {c.icon}
            </div>
            <div>
              <div className={`text-3xl md:text-5xl font-black bg-gradient-to-br ${c.grad} bg-clip-text text-transparent tabular-nums tracking-tight`}>
                {c.val}{c.suffix}
              </div>
              <p className="text-xs md:text-sm text-indigo-200/80 font-bold uppercase tracking-wider mt-1">{c.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function MotivationScreen() {
  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="w-full h-full flex flex-col items-center justify-center px-6 lg:px-12 text-center relative z-10 pt-16 pb-24">
      
      <motion.div variants={fadeUp} className="relative max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Giant Quote Anchor behind text */}
        <div className="absolute -top-12 md:-top-20 text-[8rem] md:text-[14rem] text-white/[0.03] font-serif leading-none select-none z-0">
          "
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/10 border border-amber-400/20 text-amber-300 text-xs font-black uppercase tracking-widest mb-8">
            <Zap size={14} fill="currentColor" /> Daily Inspiration
          </div>

          <blockquote className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight max-w-3xl">
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-indigo-50 to-indigo-200">
              {quote.text}
            </span>
          </blockquote>

          {/* Structured Divider/Footer for Quote */}
          <div className="mt-12 pt-8 border-t border-white/10 w-full max-w-lg flex flex-col items-center gap-2">
            <p className="text-violet-400 font-black uppercase tracking-[0.2em] text-sm">
              {quote.author}
            </p>
            <p className="text-indigo-300/70 text-sm font-medium">
              {quote.sub}
            </p>
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
}

function CTAScreen() {
  // Action is handled by the unified BottomActionSystem now, 
  // so this screen just focuses on visual culmination.
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="w-full h-full flex flex-col items-center justify-center px-6 lg:px-12 text-center relative z-10 pt-12 pb-32">
      
      <motion.div variants={popIn} className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center mb-12">
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] md:rounded-[3.5rem] bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-[0_0_100px_rgba(139,92,246,0.6),0_0_200px_rgba(139,92,246,0.2)] z-10">
          <Rocket className="w-16 h-16 md:w-24 md:h-24 text-white" />
        </div>
        <motion.div className="absolute inset-[10px] md:inset-[0px] rounded-[3rem] md:rounded-[4rem] border border-violet-400/30"
          animate={{ scale:[1,1.15,1], opacity:[0.3,0.8,0.3] }} transition={{ duration:3.5, repeat:Infinity, ease:"easeInOut" }} />
        <motion.div className="absolute inset-[-10px] md:inset-[-30px] rounded-[4rem] md:rounded-[5rem] border border-indigo-400/15"
          animate={{ scale:[1,1.2,1], opacity:[0.1,0.5,0.1] }} transition={{ duration:3.5, repeat:Infinity, ease:"easeInOut", delay:0.6 }} />
      </motion.div>

      <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-violet-500/10 border border-violet-400/20 text-violet-300 text-xs font-black uppercase tracking-widest mb-6">
        <GraduationCap size={16} /> Enterprise Ecosystem
      </motion.div>
      
      <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-6 max-w-3xl">
        You&apos;re All Set! 🎉
      </motion.h2>
      
      <motion.p variants={fadeUp} className="text-indigo-200/80 text-base md:text-xl font-medium max-w-2xl leading-relaxed">
        Your personalized dashboard is ready. Step into an intelligent environment designed specifically for your professional growth.
      </motion.p>
    </motion.div>
  );
}

// ─── MOBILE SCREENS ─────────────────────────────────────────────────────────────

function MobileCinematicEnvironment() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#02030A]">
      <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-violet-900/20 to-transparent" />
      <div className="absolute rounded-full opacity-30"
        style={{
          width: "150vw", height: "150vw",
          top: "-50%", left: "-25%",
          background: "radial-gradient(ellipse, rgba(109,40,217,0.3) 0%, rgba(79,70,229,0.1) 40%, transparent 70%)",
          filter: "blur(60px)",
        }} />
    </div>
  );
}

function MobileWelcomeScreen({ name }: { name: string }) {
  const first = name.split(" ")[0];
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="w-full h-full flex flex-col items-center justify-center px-6 text-center space-y-6 pt-12 pb-24 z-10">
      <motion.div variants={popIn} className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-lg mb-4">
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>
      <motion.div variants={fadeUp} className="space-y-2">
        <h1 className="text-3xl font-black text-white leading-tight">
          Welcome Back,<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">{first}.</span>
        </h1>
      </motion.div>
      <motion.p variants={fadeUp} className="text-indigo-200/80 text-sm max-w-xs leading-relaxed">
        Your learning journey continues here. Discover new paths and track your growth.
      </motion.p>
    </motion.div>
  );
}

function MobileProgressOverview({ data }: { data: EmployeeDashboardData | null }) {
  const active    = useCounter(data?.active_courses_count ?? 3, 1000, true);
  const streak    = useCounter(data?.streak_days ?? 5, 900, true);
  const completed = useCounter(data?.completed_courses_count ?? 12, 1200, true);
  const progress  = useCounter(Math.round(data?.overall_progress ?? 67), 1400, true);

  const stats = [
    { label: "Active",    val: active,    suffix: "",  icon: <BookOpen size={16} />, grad: "from-violet-500 to-indigo-500" },
    { label: "Streak",    val: streak,    suffix: "🔥", icon: <Flame   size={16} />, grad: "from-amber-500 to-orange-400" },
    { label: "Done",      val: completed, suffix: "",  icon: <Trophy   size={16} />, grad: "from-emerald-500 to-teal-400" },
    { label: "Progress",  val: progress,  suffix: "%", icon: <BarChart2 size={16}/>, grad: "from-pink-500 to-rose-400"  },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="w-full h-full flex flex-col items-center justify-center px-6 pt-10 pb-24 z-10">
      <motion.div variants={fadeUp} className="text-center mb-8">
        <h2 className="text-3xl font-black text-white leading-tight">Your Progress</h2>
        <p className="text-indigo-200/80 text-sm mt-2">Quick snapshot of your achievements.</p>
      </motion.div>
      <div className="w-full grid grid-cols-2 gap-3 max-w-sm mx-auto">
        {stats.map((s) => (
          <motion.div key={s.label} variants={popIn}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4 flex flex-col items-start gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.grad} flex items-center justify-center text-white`}>
              {s.icon}
            </div>
            <div>
              <div className={`text-2xl font-black bg-gradient-to-br ${s.grad} bg-clip-text text-transparent`}>
                {s.val}{s.suffix}
              </div>
              <p className="text-[10px] text-indigo-200/80 font-bold uppercase mt-0.5">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function MobileReadyScreen() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      className="w-full h-full flex flex-col items-center justify-center px-6 text-center z-10 pt-10 pb-24">
      <motion.div variants={popIn} className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg mb-6">
        <Rocket className="w-10 h-10 text-white" />
      </motion.div>
      <motion.h2 variants={fadeUp} className="text-3xl font-black text-white leading-tight mb-3">
        You're All Set! 🎉
      </motion.h2>
      <motion.p variants={fadeUp} className="text-indigo-200/80 text-sm max-w-[280px] leading-relaxed mx-auto">
        Step into an intelligent environment designed for your professional growth.
      </motion.p>
    </motion.div>
  );
}

function MobileActionBar({ step, isLast, onNext, onBack, onEnter }: { step: number; isLast: boolean; onNext: () => void; onBack: () => void; onEnter: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 p-4 border-t border-white/[0.04] bg-[#02030A]/80 backdrop-blur-xl flex items-center justify-between">
      <div className="w-[80px]">
        {step > 0 && (
          <button onClick={onBack} className="flex items-center gap-1 text-indigo-300 text-sm font-semibold p-2">
            <ChevronLeft size={16} /> Back
          </button>
        )}
      </div>
      
      <div className="flex-1 flex justify-center">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${step === i ? 'w-4 bg-violet-400' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>
      </div>

      <div className="w-[120px] flex justify-end">
        {!isLast ? (
          <button onClick={onNext} className="px-5 py-2.5 rounded-full bg-white text-[#02030A] font-bold text-sm flex items-center gap-1">
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button onClick={onEnter} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 text-white font-bold text-sm flex items-center gap-1">
            Enter <Rocket size={14} />
          </button>
        )}
      </div>
    </div>
  );
}


// ─── MAIN WELCOME FLOW ORCHESTRATOR ───────────────────────────────────────────
export default function WelcomeFlow() {
  const navigate  = useNavigate();
  const { userName, userRole, completeFlow, shouldShowWelcome, showWelcomeBackOnly, isLoading } = useWelcomeFlow();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [step, setStep]         = useState(0);
  const [direction, setDir]     = useState(1);
  const [dashData, setDashData] = useState<EmployeeDashboardData | null>(null);

  const isEmployee  = userRole === "employee";
  const TOTAL_STEPS = showWelcomeBackOnly ? 1 : (isMobile ? 3 : (isEmployee ? 5 : 4));

  useEffect(() => {
    if (!isLoading && !shouldShowWelcome) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, shouldShowWelcome, navigate]);

  useEffect(() => {
    if (isEmployee) {
      analyticsService.getEmployeeDashboard().then((r) => setDashData(r.data.data)).catch(() => null);
    }
  }, [isEmployee]);

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= TOTAL_STEPS) return;
    setDir(next > step ? 1 : -1);
    setStep(next);
  }, [step, TOTAL_STEPS]);

  const skip = useCallback(async () => {
    await completeFlow(!showWelcomeBackOnly);
    navigate("/dashboard", { replace: true });
  }, [completeFlow, showWelcomeBackOnly, navigate]);

  const swipe = useSwipe(
    () => goTo(step + 1),
    () => goTo(step - 1),
  );

  const renderScreen = () => {
    if (showWelcomeBackOnly) {
      return <WelcomeBackScreen name={userName} data={dashData} onSkip={skip} />;
    }

    if (isMobile) {
      if (step === 0) return <MobileWelcomeScreen name={userName} />;
      if (step === 1) return <MobileProgressOverview data={dashData} />;
      if (step === 2) return <MobileReadyScreen />;
      return <MobileReadyScreen />;
    }

    if (step === 0) return <WelcomeScreen name={userName} />;
    if (step === 1) return <ImpactScreen />;
    if (step === 2 && isEmployee) return <InsightsScreen data={dashData} />;
    const mStep = isEmployee ? 3 : 2;
    const cStep = isEmployee ? 4 : 3;
    if (step === mStep) return <MotivationScreen />;
    if (step === cStep) return <CTAScreen />;
    return <MotivationScreen />;
  };

  const isLast = step === TOTAL_STEPS - 1;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        if (!isLast) goTo(step + 1);
        else if (e.key === "Enter" || e.key === " ") skip();
      } else if (e.key === "ArrowLeft") {
        if (step > 0) goTo(step - 1);
      } else if (e.key === "Escape") {
        skip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, isLast, goTo, skip]);

  if (isLoading || !shouldShowWelcome) return null;

  return (
    <div
      className="fixed inset-0 z-[100] w-screen h-screen flex flex-col overflow-hidden bg-[#02030A] text-white"
      {...swipe}
    >
      {/* Background with 3D Depth anchoring */}
      {isMobile ? <MobileCinematicEnvironment /> : <CinematicEnvironment />}

      {/* Top Header / Progress */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-6 md:py-8 max-w-[1400px] mx-auto w-full">
        {!isMobile && !showWelcomeBackOnly && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
            <ProgressSystem step={step} total={TOTAL_STEPS} />
          </motion.div>
        )}

        {!showWelcomeBackOnly && (
          <motion.button initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
            onClick={skip}
            className={`flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md text-white/60 text-xs md:text-sm font-bold hover:bg-white/[0.08] hover:text-white transition-all ${isMobile ? "ml-auto" : ""}`}>
            <X size={14} /> Skip
          </motion.button>
        )}
      </div>

      {/* Main Fullscreen Slide Content */}
      <div className="flex-1 relative w-full h-full">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div key={step} custom={direction} variants={slideIn}
            initial="enter" animate="center" exit="exit"
            className="absolute inset-0 w-full h-full flex flex-col"
            style={{ willChange:"transform, opacity, filter" }}>
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Unified Bottom Navigation & Action System */}
      {!showWelcomeBackOnly && (
        isMobile ? (
          <MobileActionBar 
            step={step} 
            isLast={isLast} 
            onNext={() => goTo(step + 1)} 
            onBack={() => goTo(step - 1)} 
            onEnter={skip} 
          />
        ) : (
          <UnifiedActionBar 
            step={step} 
            isLast={isLast} 
            onNext={() => goTo(step + 1)} 
            onBack={() => goTo(step - 1)} 
            onEnter={skip} 
          />
        )
      )}
    </div>
  );
}
