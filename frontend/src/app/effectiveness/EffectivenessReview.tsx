import { useRef, useState, useEffect } from "react";
import { getAssetUrl } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Eraser, PenTool, Upload, ClipboardCheck, 
  Target, MessageSquare, ShieldCheck,
  CheckCircle2, AlertCircle,
  Sparkles, TrendingUp
} from "lucide-react";

import { effectivenessService } from "@/services/effectiveness.service";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { useMotivationalToast } from "@/components/ui/MotivationalToast";
import { Badge } from "@/components/ui/Badge";
import type { Effectiveness } from "@/types";

const schema = z.object({
  manager_comments: z.string().min(10, "Please provide constructive feedback"),
  manager_score: z.preprocess((v) => Number(v), z.number().min(0).max(100)),
  digital_signature_url: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  evaluation: Effectiveness;
  onSuccess?: () => void;
}

export default function EffectivenessReview({ evaluation, onSuccess }: Props) {
  const qc = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      manager_score: 85,
    },
  });

  const managerScore = watch("manager_score");

  // Initialize canvas size on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = 150;
      }
    }
  }, []);

  // ── Canvas Logic ─────────────────────────────────────────────────────────────
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureUrl(null);
    setValue("digital_signature_url", "");
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "signature.png", { type: "image/png" });
      try {
        const res = await effectivenessService.uploadSignature(file);
        const url = res.data.data?.url;
        if (url) {
          setSignatureUrl(url);
          setValue("digital_signature_url", url);
          toast("success", "Signature Authenticated");
        }
      } catch (err) {
        toast("error", "Signature system unavailable");
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await effectivenessService.uploadSignature(file);
      const url = res.data.data?.url;
      if (url) {
        setSignatureUrl(url);
        setValue("digital_signature_url", url);
        toast("success", "Digital Signature Linked");
      }
    } catch (err) {
      toast("error", "Failed to link signature");
    }
  };

  // ── Mutation ──────────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data: FormData) => effectivenessService.review(evaluation.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["effectiveness"] });
      toast("success", "Evaluation Certified", "The effectiveness review has been finalized.");
      useMotivationalToast.getState().showToast("Great job completing your training", "trophy");
      useMotivationalToast.getState().showToast("You're getting closer to your annual goal", "target");
      onSuccess?.();
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Evidence & Submissions (3 columns) */}
        <div className="lg:col-span-3 space-y-6">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600">
                 <ClipboardCheck size={18} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">Employee Feedback Summary</h3>
           </div>

           <div className="grid grid-cols-1 gap-4">
              <div className="p-6 rounded-3xl bg-card dark:bg-[#172036] border border-border/50 dark:border-white/5 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Sparkles size={40} />
                 </div>
                 <label className="text-[10px] text-brand-600 font-black uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <TrendingUp size={12} /> Impact Level: {evaluation.level}
                 </label>
                 <div className="space-y-4">
                    <div>
                       <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500" /> Key Learnings
                       </h4>
                       <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">"{evaluation.learnings_summary}"</p>
                    </div>
                    <div className="pt-4 border-t border-border/50">
                       <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
                          <Target size={14} className="text-brand-500" /> Planned Application
                       </h4>
                       <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">"{evaluation.work_application}"</p>
                    </div>
                 </div>
              </div>

              {evaluation.suggestions && (
                <div className="p-6 rounded-3xl bg-muted/20 border border-dashed border-border/80">
                   <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                      <MessageSquare size={14} className="text-indigo-500" /> Suggestions for Improvement
                   </h4>
                   <p className="text-sm text-slate-500 italic">"{evaluation.suggestions}"</p>
                </div>
              )}
           </div>
        </div>

        {/* Right: Analysis & Review (2 columns) */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
            <div className="p-8 rounded-3xl bg-card dark:bg-[#172036] border-2 border-brand-500/20 shadow-xl shadow-brand-500/5 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-brand-500" />
               
               <div className="space-y-6">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Effectiveness Score</label>
                        <Badge variant={managerScore >= 70 ? 'success' : 'warning'} className="font-black px-3 rounded-full">{managerScore}%</Badge>
                     </div>
                     <div className="flex gap-4 items-center">
                        <input 
                           type="range" 
                           min="0" 
                           max="100" 
                           step="5"
                           {...register("manager_score")}
                           className="flex-1 accent-brand-600 h-2 bg-muted rounded-full appearance-none cursor-pointer"
                        />
                        <Input 
                           type="number" 
                           {...register("manager_score")} 
                           className="w-20 h-10 text-center font-bold rounded-xl border-border/50"
                        />
                     </div>
                     <p className="text-[10px] text-muted-foreground leading-tight px-1">Estimate the overall improvement in on-the-job performance resulting from this training.</p>
                  </div>

                  <div className="space-y-2.5">
                     <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Manager Certification</label>
                     <Textarea 
                        {...register("manager_comments")} 
                        placeholder="Detail the observed changes in behavior or output..."
                        rows={5}
                        className="rounded-2xl border-border/50 focus:ring-brand-500 shadow-sm p-4 text-sm font-medium leading-relaxed bg-muted/5"
                        error={!!errors.manager_comments}
                     />
                  </div>
               </div>
            </div>

            {/* Signature Area */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                 <ShieldCheck size={14} className="text-emerald-600" /> Digital Certification
              </label>
              
              {signatureUrl ? (
                <div className="relative group border-2 border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-500/10 rounded-3xl p-6 flex items-center justify-center h-40 transition-all hover:bg-emerald-50/40 dark:hover:bg-emerald-500/20">
                  <img src={getAssetUrl(signatureUrl)} alt="Signature" className="max-h-full object-contain grayscale hover:grayscale-0 transition-all" />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/80 backdrop-blur shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => setSignatureUrl(null)}
                  >
                    <Eraser size={18} />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border dark:border-white/10 rounded-3xl bg-card dark:bg-[#172036] overflow-hidden transition-all focus-within:border-brand-500 shadow-sm">
                    <canvas
                      ref={canvasRef}
                      className="w-full cursor-crosshair bg-slate-50/30"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="p-3 border-t border-border flex items-center justify-between bg-muted/10">
                      <div className="flex gap-1.5">
                        <Button type="button" variant="ghost" size="sm" className="h-9 rounded-xl px-4 font-bold" onClick={clearCanvas}>
                          <Eraser size={14} className="mr-2" /> Reset
                        </Button>
                        <Button type="button" variant="secondary" size="sm" className="h-9 rounded-xl px-4 font-bold bg-slate-900 text-white hover:bg-slate-800" onClick={saveSignature} disabled={!hasSignature}>
                          <PenTool size={14} className="mr-2" /> Authenticate
                        </Button>
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        <div className="text-[10px] text-brand-600 font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-brand-50 p-2 rounded-lg transition-colors">
                          <Upload size={14} /> Upload PGP/PNG
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest border border-amber-100 dark:border-amber-500/20">
                     <AlertCircle size={14} /> This signature certifies the accuracy of the evaluation
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl font-black text-lg bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-100 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.98]" 
                isLoading={mutation.isPending}
                disabled={!signatureUrl && !mutation.isPending}
              >
                Complete Certification <ShieldCheck size={22} />
              </Button>
              <p className="text-center text-[10px] text-muted-foreground mt-4 font-medium uppercase tracking-widest">Authorized Review Session</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
