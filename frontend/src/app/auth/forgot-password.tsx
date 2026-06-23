import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { motion } from "framer-motion";

import { authService } from "@/services/auth.service";
import { toast } from "@/components/ui/Toast";
import { Input } from "@/components/forms/FormField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import synergyLogo from "@/assets/synergy-logo.png";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await authService.forgotPassword(data.email);
      setSubmitted(true);
    } catch (error) {
      toast("error", "Error", "Failed to send reset link. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
           <img src={synergyLogo} alt="Synergy Logo" className="h-14 w-auto object-contain mb-4 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
           <h1 className="text-2xl font-black text-white tracking-tighter">Synergy</h1>
           <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mt-1">Training Management System</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-10 shadow-2xl">
          {submitted ? (
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                 <Mail className="text-emerald-500 w-8 h-8" />
              </div>
              <div>
                <p className="text-xl font-bold text-white mb-2">Check your email</p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  If that email is registered, we've sent a password reset link to your inbox.
                </p>
              </div>
              <Link 
                to="/login" 
                className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-brand-500 hover:text-brand-400 transition-colors pt-4"
              >
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Forgot password?</h2>
                <p className="text-slate-400 text-sm mt-2">
                  Enter your verified work email and we'll send a secure reset link.
                </p>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Work Email</label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    error={!!errors.email}
                    className="h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:ring-brand-500 rounded-2xl px-5"
                    {...register("email")}
                  />
                  {errors.email && <p className="text-[10px] text-red-400 mt-1 ml-1 font-bold">{errors.email.message}</p>}
                </div>

                <SubmitButton 
                  type="submit" 
                  isLoading={isSubmitting} 
                  className="w-full h-14 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white font-black text-base shadow-2xl shadow-brand-500/20 transition-all"
                >
                  Send reset link
                </SubmitButton>

                <p className="text-center">
                  <Link 
                    to="/login" 
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={12} /> Back to login
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
