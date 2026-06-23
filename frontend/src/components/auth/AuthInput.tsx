import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  isPassword?: boolean;
  rightElement?: ReactNode;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon, error, isPassword, rightElement, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-400 transition-colors duration-200 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            type={resolvedType}
            className={cn(
              "w-full h-[52px] rounded-2xl border bg-white/5 backdrop-blur-sm px-4 text-sm font-medium transition-all duration-200 outline-none",
              "border-white/10 text-white placeholder:text-slate-500",
              "hover:border-brand-500/30 hover:bg-white/[0.07]",
              "focus:border-brand-500/60 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]",
              icon && "pl-11",
              (isPassword || rightElement) && "pr-11",
              error && "border-red-500/50 focus:border-red-500/60 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]",
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-150"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          )}
          {rightElement && !isPassword && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2">{rightElement}</span>
          )}
        </div>
        {error && (
          <p className="text-[11px] text-red-400 font-semibold ml-1">{error}</p>
        )}
      </div>
    );
  },
);

AuthInput.displayName = "AuthInput";
export default AuthInput;
