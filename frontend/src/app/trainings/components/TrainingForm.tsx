import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { 
  Save, Send, BookOpen, Calendar, Clock, MapPin, 
  Users, CheckCircle,
  Shield, Globe, Laptop, FileText, Layout,
  Sparkles, User, GraduationCap, Building2,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { trainingsService } from "@/services/trainings.service";
import api from "@/lib/axios";
import type { Training, Department, PaginatedResponse } from "@/types";
import { cn } from "@/lib/utils";
import { format, parse, isAfter, isBefore } from "date-fns";
import { toast } from "@/components/ui/Toast";

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  training_type: z.enum(["INTERNAL", "EXTERNAL", "ONLINE", "WORKSHOP", "CERTIFICATION"]),
  delivery_mode: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]),
  start_date: z.string().min(1, "Start date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_date: z.string().min(1, "End date is required"),
  end_time: z.string().optional(),
  duration_hours: z.preprocess((v) => (v === "" ? 2 : Number(v)), z.number().min(0.5)),
  max_hours_allowed: z.preprocess((v) => (v === "" ? 2 : Number(v)), z.number().min(0.5)),
  enrollment_deadline: z.string().min(1, "Enrollment deadline date is required"),
  enrollment_deadline_time: z.string().optional().default("23:59"),
  venue: z.string().optional(),
  meeting_link: z.string().optional(),
  trainer_name: z.string().optional(),
  is_mandatory: z.boolean().default(false),
  is_global: z.boolean().default(false),
  max_participants: z.preprocess((v) => (v === "" ? 20 : Number(v)), z.number().min(1)),
  department_ids: z.array(z.string()).default([]),
  category_id: z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable().optional()),
}).refine(data => {
  if (data.delivery_mode === "ONLINE" && !data.meeting_link) return false;
  return true;
}, {
  message: "Meeting link is required for online trainings",
  path: ["meeting_link"]
}).refine(data => {
  if (data.delivery_mode === "IN_PERSON" && !data.venue) return false;
  return true;
}, {
  message: "Venue is required for in-person trainings",
  path: ["venue"]
}).refine(data => {
  if (!data.is_global && data.department_ids.length === 0) return false;
  return true;
}, {
  message: "Select at least one department or choose 'All Departments'",
  path: ["department_ids"]
}).refine(data => {
  try {
    const parseLocal = (dateStr: string, timeStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
    };

    const start = parseLocal(data.start_date, data.start_time || "00:00");
    const deadline = parseLocal(data.enrollment_deadline, data.enrollment_deadline_time || "23:59");

    if (isNaN(start.getTime()) || isNaN(deadline.getTime())) {
      return false;
    }
    return isBefore(deadline, start);
  } catch (e) {
    return false;
  }
}, {
  message: "Enrollment deadline must be before training start time",
  path: ["enrollment_deadline"]
});

type FormData = z.infer<typeof schema>;

interface TrainingFormProps {
  initialData?: Training | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const convertTo24Hour = (timeStr?: string | null) => {
  if (!timeStr) return "";
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  
  try {
    const parsed = parse(timeStr, "hh:mm a", new Date());
    if (!isNaN(parsed.getTime())) {
      return format(parsed, "HH:mm");
    }
  } catch (e) {}

  try {
    const parsed = parse(timeStr, "h:mm a", new Date());
    if (!isNaN(parsed.getTime())) {
      return format(parsed, "HH:mm");
    }
  } catch (e) {}

  return "09:00";
};

const convertTo12Hour = (timeStr?: string | null) => {
  if (!timeStr) return "09:00 AM";
  if (/^\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)$/i.test(timeStr)) {
    return timeStr;
  }

  try {
    const parsed = parse(timeStr, "HH:mm", new Date());
    if (!isNaN(parsed.getTime())) {
      return format(parsed, "hh:mm a");
    }
  } catch (e) {}

  return timeStr;
};

const FormSection = ({ title, icon: Icon, children, description }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-sm overflow-hidden"
  >
    <div className="p-6 border-b border-[#EEF2FF] dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{title}</h3>
          {description && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
    <div className="p-6 space-y-6">
      {children}
    </div>
  </motion.div>
);

export function TrainingForm({ initialData, onSubmit, onCancel, isLoading }: TrainingFormProps) {
  const [activeTab, setActiveTab] = useState("edit"); // edit | preview
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      training_type: "INTERNAL",
      delivery_mode: "ONLINE",
      duration_hours: 2,
      max_hours_allowed: 2,
      is_mandatory: false,
      is_global: false,
      max_participants: 20,
      department_ids: [],
      enrollment_deadline_time: "23:59",
      start_time: "09:00",
    }
  });

  const formData = useWatch({ control });
  const deliveryMode = watch("delivery_mode");
  const isGlobal = watch("is_global");

  // Auto-calculate duration
  useEffect(() => {
    if (formData.start_date && formData.start_time && formData.end_date && formData.end_time) {
      try {
        const start = new Date(`${formData.start_date}T${formData.start_time}`);
        const end = new Date(`${formData.end_date}T${formData.end_time}`);
        if (isAfter(end, start)) {
          const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          setValue("duration_hours", parseFloat(diff.toFixed(1)));
          setValue("max_hours_allowed", parseFloat(diff.toFixed(1)));
        }
      } catch (e) {}
    }
  }, [formData.start_date, formData.start_time, formData.end_date, formData.end_time, setValue]);

  const parseLocalDate = useCallback((d: string) => {
    if (!d) return new Date();
    if (d.includes('T')) {
      const [datePart, timePart] = d.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0);
    }
    const [year, month, day] = d.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }, []);

  useEffect(() => {
    if (initialData) {
      const startTime24 = convertTo24Hour(initialData.start_time);
      
      // Calculate end time from start time and duration hours if possible
      let calculatedEndTime = "";
      if (startTime24 && initialData.duration_hours) {
        try {
          const [h, m] = startTime24.split(":").map(Number);
          const totalMins = h * 60 + m + Math.round(initialData.duration_hours * 60);
          const endH = Math.floor(totalMins / 60) % 24;
          const endM = totalMins % 60;
          calculatedEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
        } catch (e) {}
      }

      reset({
        ...initialData,
        training_type: (initialData.training_type?.toUpperCase() ?? "INTERNAL") as any,
        delivery_mode: (initialData.delivery_mode?.toUpperCase() ?? "ONLINE") as any,
        start_date: initialData.start_date ? format(parseLocalDate(initialData.start_date), "yyyy-MM-dd") : "",
        start_time: startTime24 || "09:00",
        end_date: initialData.end_date ? format(parseLocalDate(initialData.end_date), "yyyy-MM-dd") : "",
        end_time: calculatedEndTime,
        enrollment_deadline: initialData.enrollment_deadline ? format(parseLocalDate(initialData.enrollment_deadline), "yyyy-MM-dd") : "",
        enrollment_deadline_time: initialData.enrollment_deadline ? format(parseLocalDate(initialData.enrollment_deadline), "HH:mm") : "23:59",
        is_global: initialData.is_global || false,
        department_ids: initialData.departments ? initialData.departments.map((d: any) => d.id) : [],
        category_id: initialData.category_id || "",
      });
    }
  }, [initialData, reset, parseLocalDate]);

  const { data: depts } = useQuery({
    queryKey: ["departments-all"],
    queryFn: () => api.get<PaginatedResponse<Department>>("/departments/", { params: { per_page: 100 } }),
    select: (res) => res.data.data,
  });

  const { data: categories } = useQuery({
    queryKey: ["training-categories"],
    queryFn: () => trainingsService.listCategories(),
    select: (res) => res.data.data,
  });

  const handleSaveDraft = handleSubmit((data) => {
    const formattedData = {
      ...data,
      status: "DRAFT",
      // Send deadline_time as-is (HH:mm 24h from <input type="time">) — backend handles it
      enrollment_deadline_time: data.enrollment_deadline_time || "23:59",
      start_time: convertTo12Hour(data.start_time),
      end_time: data.end_time ? convertTo12Hour(data.end_time) : undefined,
    };
    onSubmit(formattedData);
  }, (errors) => {
    const firstErrorKey = Object.keys(errors)[0] as keyof typeof errors;
    const errorMessage = errors[firstErrorKey]?.message || "Please check all required fields.";
    toast("error", "Validation Failed", `${errorMessage}`);
  });

  const handlePublish = handleSubmit((data) => {
    const formattedData = {
      ...data,
      status: "SCHEDULED",
      // Send deadline_time as-is (HH:mm 24h from <input type="time">) — backend handles it
      enrollment_deadline_time: data.enrollment_deadline_time || "23:59",
      start_time: convertTo12Hour(data.start_time),
      end_time: data.end_time ? convertTo12Hour(data.end_time) : undefined,
    };
    onSubmit(formattedData);
  }, (errors) => {
    const firstErrorKey = Object.keys(errors)[0] as keyof typeof errors;
    const errorMessage = errors[firstErrorKey]?.message || "Please check all required fields.";
    toast("error", "Validation Failed", `${errorMessage}`);
  });

  const fieldLabel = "text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 block";
  const inputClass = "bg-slate-50/50 dark:bg-white/[0.03] border-[#EEF2FF] dark:border-white/5 focus:ring-2 focus:ring-brand-500/20 transition-all rounded-xl h-12 text-sm font-bold";

  return (
    <div className="flex flex-col h-full bg-[#F5F7FB] dark:bg-[#0B1020]">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#172036] border-b border-[#EEF2FF] dark:border-white/5 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {initialData ? "Refine Training" : "New Training Program"}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Designing Excellence</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
          <button 
            onClick={() => setActiveTab("edit")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === "edit" ? "bg-white dark:bg-white/10 text-brand-600 dark:text-brand-400 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Layout size={14} /> Designer
          </button>
          <button 
            onClick={() => setActiveTab("preview")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === "preview" ? "bg-white dark:bg-white/10 text-brand-600 dark:text-brand-400 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Eye size={14} /> Preview
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {activeTab === "edit" ? (
            <motion.form 
              key="edit-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-5xl mx-auto space-y-8 pb-32"
            >
              {/* --- 1. Basic Info --- */}
              <FormSection title="Core Information" icon={BookOpen} description="The foundation of your program">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className={fieldLabel}>Training Title</label>
                    <div className="relative">
                      <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <Input {...register("title")} className={cn(inputClass, "pl-12")} placeholder="e.g. Strategic Management & Leadership" error={!!errors.title} />
                    </div>
                    {errors.title && <p className="text-[10px] text-destructive font-bold mt-1.5 uppercase tracking-widest">{errors.title.message}</p>}
                  </div>
                  
                  <div>
                    <label className={fieldLabel}>Category</label>
                    <Select {...register("category_id")} className={inputClass} error={!!errors.category_id}>
                      <option value="">Select Category</option>
                      {categories?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className={fieldLabel}>Training Type</label>
                    <Select {...register("training_type")} className={inputClass}>
                      <option value="INTERNAL">Internal Program</option>
                      <option value="EXTERNAL">External Seminar</option>
                      <option value="ONLINE">Self-Paced Online</option>
                      <option value="WORKSHOP">Interactive Workshop</option>
                      <option value="CERTIFICATION">Professional Certification</option>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={fieldLabel}>Executive Summary</label>
                    <Textarea {...register("description")} className="bg-slate-50/50 dark:bg-white/[0.03] border-[#EEF2FF] dark:border-white/5 rounded-[20px] text-sm font-medium p-4 focus:ring-2 focus:ring-brand-500/20 transition-all min-h-[120px]" placeholder="Outline the learning objectives and key outcomes..." />
                  </div>
                </div>
              </FormSection>

              {/* --- 2. Schedule --- */}
              <FormSection title="Schedule & Timing" icon={Clock} description="When and how long">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2">
                    <label className={fieldLabel}>Start Date</label>
                    <Input {...register("start_date")} type="date" className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={fieldLabel}>Start Time</label>
                    <Input {...register("start_time")} type="time" className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={fieldLabel}>End Date</label>
                    <Input {...register("end_date")} type="date" className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={fieldLabel}>End Time</label>
                    <Input {...register("end_time")} type="time" className={inputClass} error={!!errors.end_time} />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className={fieldLabel}>Calculated Duration (Hrs)</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <Input {...register("duration_hours")} type="number" step="0.1" className={cn(inputClass, "pl-12 bg-slate-100/50 dark:bg-white/5 cursor-not-allowed")} readOnly />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className={fieldLabel}>Max Hours Allowed</label>
                    <Input {...register("max_hours_allowed")} type="number" step="0.1" className={inputClass} />
                  </div>
                </div>
              </FormSection>

              {/* --- 3. Enrollment --- */}
              <FormSection title="Enrollment Configuration" icon={Users} description="Eligibility and deadlines">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={fieldLabel}>Enrollment Deadline Date</label>
                    <Input {...register("enrollment_deadline")} type="date" className={inputClass} error={!!errors.enrollment_deadline} />
                    {errors.enrollment_deadline && <p className="text-[10px] text-destructive font-bold mt-1.5 uppercase tracking-widest">{errors.enrollment_deadline.message}</p>}
                  </div>
                  <div>
                    <label className={fieldLabel}>Enrollment Deadline Time</label>
                    <Input {...register("enrollment_deadline_time")} type="time" className={inputClass} />
                  </div>
                  
                  <div>
                    <label className={fieldLabel}>Seat Limit</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <Input {...register("max_participants")} type="number" className={cn(inputClass, "pl-12")} />
                    </div>
                  </div>

                  <div className="flex items-end pb-2">
                     <label className="relative inline-flex items-center cursor-pointer group">
                        <input type="checkbox" {...register("is_mandatory")} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-white/10 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600 rounded-full shadow-inner"></div>
                        <span className="ml-3 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 group-hover:text-brand-600 transition-colors">Mark as Mandatory</span>
                     </label>
                  </div>
                </div>
              </FormSection>

              {/* --- 4. Delivery --- */}
              <FormSection title="Delivery Details" icon={MapPin} description="Where and how">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className={fieldLabel}>Delivery Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      {["ONLINE", "IN_PERSON", "HYBRID"].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setValue("delivery_mode", mode as any)}
                          className={cn(
                            "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex flex-col items-center gap-2",
                            deliveryMode === mode 
                              ? "bg-brand-500/10 border-brand-500/50 text-brand-600 shadow-sm" 
                              : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          {mode === "ONLINE" && <Globe size={18} />}
                          {mode === "IN_PERSON" && <Building2 size={18} />}
                          {mode === "HYBRID" && <Laptop size={18} />}
                          {mode.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {deliveryMode !== "ONLINE" && (
                    <div className="md:col-span-2">
                      <label className={fieldLabel}>Venue Address / Room</label>
                      <Input {...register("venue")} placeholder="e.g. Innovation Hub, Room 101" className={inputClass} error={!!errors.venue} />
                    </div>
                  )}

                  {deliveryMode !== "IN_PERSON" && (
                    <div className="md:col-span-2">
                      <label className={fieldLabel}>Meeting Link</label>
                      <Input {...register("meeting_link")} placeholder="e.g. https://meet.google.com/abc-defg-hij" className={inputClass} error={!!errors.meeting_link} />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className={fieldLabel}>Primary Trainer / Expert</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <Input {...register("trainer_name")} placeholder="Dr. Sarah Wilson" className={cn(inputClass, "pl-12")} />
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* --- 5. Eligibility --- */}
              <FormSection title="Eligibility & Access" icon={Shield} description="Who can join">
                <div className="space-y-6">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-[#EEF2FF] dark:border-white/10">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" {...register("is_global")} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-white/10 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600 rounded-full shadow-inner"></div>
                      <span className="ml-3 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Available to All Departments</span>
                    </label>
                  </div>

                  {!isGlobal && (
                    <div className="space-y-4">
                      <label className={fieldLabel}>Target Departments</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {depts?.map(d => (
                          <div 
                            key={d.id} 
                            onClick={() => {
                              const current = watch("department_ids");
                              if (current.includes(d.id)) {
                                setValue("department_ids", current.filter(id => id !== d.id));
                              } else {
                                setValue("department_ids", [...current, d.id]);
                              }
                            }}
                            className={cn(
                              "px-4 py-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-between group",
                              watch("department_ids").includes(d.id)
                                ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-600 shadow-sm"
                                : "bg-white dark:bg-white/5 border-[#EEF2FF] dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                            )}
                          >
                            <span className="truncate">{d.name}</span>
                            {watch("department_ids").includes(d.id) && <CheckCircle size={14} />}
                          </div>
                        ))}
                      </div>
                      {errors.department_ids && <p className="text-[10px] text-destructive font-bold uppercase tracking-widest">{errors.department_ids.message}</p>}
                    </div>
                  )}
                </div>
              </FormSection>
            </motion.form>
          ) : (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto pb-32"
            >
               <div className="bg-white dark:bg-[#172036] rounded-[32px] border border-[#EEF2FF] dark:border-white/5 shadow-2xl overflow-hidden">
                  <div className="aspect-[21/9] bg-gradient-to-br from-brand-600 via-indigo-600 to-indigo-900 p-12 flex flex-col justify-end relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                        <Sparkles className="absolute top-10 right-10 w-32 h-32" />
                        <Globe className="absolute -bottom-10 -left-10 w-64 h-64" />
                     </div>
                     <div className="relative z-10 space-y-4">
                        <div className="flex gap-2">
                           <Badge className="bg-white/20 text-white border-none backdrop-blur-md font-black uppercase text-[9px] tracking-widest px-3">
                              {formData.training_type || "INTERNAL"}
                           </Badge>
                           <Badge className="bg-emerald-400/20 text-emerald-100 border-none backdrop-blur-md font-black uppercase text-[9px] tracking-widest px-3">
                              {formData.delivery_mode || "ONLINE"}
                           </Badge>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tighter max-w-2xl leading-none">
                           {formData.title || "Untitled Training Program"}
                        </h1>
                     </div>
                  </div>
                  
                  <div className="p-8 lg:p-12">
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-7 space-y-8">
                           <div className="space-y-4">
                              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                 <FileText size={14} className="text-brand-500" /> About the Program
                              </h3>
                              <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-relaxed">
                                 {formData.description || "No description provided yet."}
                              </p>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-6 py-8 border-y border-slate-50 dark:border-white/5">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                    <User size={20} />
                                 </div>
                                 <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trainer</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white">{formData.trainer_name || "Internal Expert"}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                    <Users size={20} />
                                 </div>
                                 <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Max Seats</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white">{formData.max_participants || 0} Learners</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                        
                        <div className="lg:col-span-5 space-y-6">
                           <div className="bg-slate-50 dark:bg-white/5 rounded-[28px] p-6 border border-[#EEF2FF] dark:border-white/10 space-y-6">
                              <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</span>
                                    <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[9px] uppercase">
                                       <Clock size={10} /> Live Soon
                                    </div>
                                 </div>
                                 
                                 <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                       <Calendar size={16} className="text-brand-500" />
                                       <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                          {formData.start_date ? format(parseLocalDate(formData.start_date), "dd MMMM yyyy") : "TBD"}
                                       </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <Clock size={16} className="text-brand-500" />
                                       <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                          {formData.start_time || "TBD"} (Local Time)
                                       </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <MapPin size={16} className="text-brand-500" />
                                       <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                          {formData.delivery_mode === "ONLINE" ? "Virtual Link" : formData.venue || "Location TBD"}
                                       </span>
                                    </div>
                                 </div>
                              </div>
                              
                              <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Enrollment Status</span>
                                    <span className="text-rose-500">Closing Soon</span>
                                 </div>
                                 <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-rose-500/20">
                                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Deadline</p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white">
                                       {formData.enrollment_deadline ? format(parseLocalDate(formData.enrollment_deadline), "dd MMM") : "TBD"} @ {formData.enrollment_deadline_time || "11:59 PM"}
                                    </p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Action Footer */}
      <div className="px-8 py-6 bg-white dark:bg-[#172036] border-t border-[#EEF2FF] dark:border-white/5 flex items-center justify-between sticky bottom-0 z-30 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.02)]">
        <Button variant="outline" type="button" onClick={onCancel} className="bg-transparent border-slate-200 dark:border-white/10 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-white/5">
           Dismiss Changes
        </Button>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            type="button"
            onClick={handleSaveDraft}
            isLoading={isLoading}
            className="h-12 px-6 rounded-2xl bg-white dark:bg-white/5 border-slate-400 dark:border-white/20 text-slate-900 dark:text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-sm hover:shadow-md transition-all gap-2"
          >
            <Save size={16} className="text-brand-500" />
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={handlePublish}
            isLoading={isLoading}
            className="h-12 px-8 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-brand-500/20 transition-all gap-2"
          >
            <Send size={16} />
            {initialData ? "Sync & Update" : "Launch Program"}
          </Button>
        </div>
      </div>
    </div>
  );
}
