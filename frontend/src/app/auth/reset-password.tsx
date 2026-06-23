import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { authService } from "@/services/auth.service";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import synergyLogo from "@/assets/synergy-logo.png";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setServerError("Reset token is missing or invalid.");
      return;
    }
    
    setServerError(null);
    try {
      await authService.resetPassword({
        token,
        new_password: data.password,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setServerError((err as any)?.response?.data?.detail || "Failed to reset password. The link may have expired.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] animate-pulse" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
           <img src={synergyLogo} alt="Synergy Logo" className="h-16 w-auto object-contain mb-4 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
           <h1 className="text-3xl font-black text-white tracking-tighter">Synergy</h1>
           <p className="text-xs font-black uppercase text-indigo-400 tracking-widest mt-1">Training Management System</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 lg:p-14 shadow-2xl">
          {!token ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                 <AlertCircle className="text-red-500 w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white mb-2">Invalid Session</h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                  The password reset link is missing or malformed. Please request a new link from the login page.
                </p>
              </div>
              <Link to="/login" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-500 hover:text-brand-400 transition-colors pt-4">
                 Return to base ←
              </Link>
            </div>
          ) : submitted ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                 <CheckCircle2 className="text-emerald-500 w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white mb-2">Password Secured</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Your credentials have been successfully updated. You can now use your new password to access the platform.
                </p>
              </div>
              <Link to="/login" className="inline-flex items-center gap-2 h-14 px-8 rounded-2xl bg-brand-500 text-white font-black text-sm uppercase tracking-widest hover:bg-brand-400 transition-all shadow-xl shadow-brand-500/20">
                Proceed to Login <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-black text-white tracking-tight">Security Update</h2>
                <p className="text-slate-400 text-base mt-2">
                  Create a new secure password for your Synergy account.
                </p>
              </div>

              {serverError && (
                <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 text-center">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">New Secure Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-brand-500 rounded-2xl px-5"
                      {...register("password")}
                    />
                    {errors.password && <p className="text-[10px] text-red-400 mt-1 ml-1 font-bold">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirm Security Key</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-brand-500 rounded-2xl px-5"
                      {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && <p className="text-[10px] text-red-400 mt-1 ml-1 font-bold">{errors.confirmPassword.message}</p>}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  isLoading={isSubmitting} 
                  className="w-full h-14 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white font-black text-base shadow-2xl shadow-brand-500/20 transition-all flex items-center justify-center gap-2 group"
                >
                  <ShieldCheck size={20} className="group-hover:scale-110 transition-transform" /> Update Credentials
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
