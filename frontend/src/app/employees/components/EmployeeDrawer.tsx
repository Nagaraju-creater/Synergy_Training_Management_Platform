import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Upload, User, Mail, Briefcase, Sparkles, UserPlus, Info } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { FormWrapper } from "@/components/ui/FormWrapper";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { employeesService } from "@/services/employees.service";
import api from "@/lib/axios";
import type { Employee, Department, PaginatedResponse } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getAssetUrl } from "@/lib/utils";

const schema = z.object({
  employee_code: z.string().min(1, "Employee code is required"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  location: z.string().optional(),
  designation: z.string().optional(),
  department_id: z.string().optional(),
  sub_department: z.string().optional(),
  manager_id: z.string().optional(),
  legal_entity: z.string().optional(),
  date_of_joining: z.string().optional(),
  status: z.enum(["active", "on_leave", "terminated"]),
});

type FormData = z.infer<typeof schema>;

interface EmployeeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

export function EmployeeDrawer({ open, onOpenChange, employee }: EmployeeDrawerProps) {
  const qc = useQueryClient();
  const isEditing = !!employee;

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Departments for Select
  const { data: depts } = useQuery({
    queryKey: ["departments-all"],
    queryFn: () => api.get<PaginatedResponse<Department>>("/departments/", { params: { per_page: 100 } }),
    select: (res) => res.data.data,
    enabled: open,
  });

  // Employees for Manager Select
  const { data: managers } = useQuery({
    queryKey: ["managers-all"],
    queryFn: () => employeesService.getManagers(),
    select: (res) => (res.data.data || []).filter(e => e.id !== employee?.id),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      if (employee) {
        reset({
          ...employee,
          department_id: employee.department_id || "",
          sub_department: employee.sub_department || "",
          manager_id: employee.manager_id || "",
          phone: employee.phone || "",
          location: employee.location || "",
          designation: employee.designation || "",
          legal_entity: employee.legal_entity || "",
          date_of_joining: employee.date_of_joining ? employee.date_of_joining.split("T")[0] : "",
        });
        setAvatarPreview(employee.profile_image_url || null);
      } else {
        reset({ status: "active" });
        setAvatarPreview(null);
      }
      setAvatarFile(null);
    }
  }, [open, employee, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };


  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        department_id: data.department_id || null,
        sub_department: data.sub_department || null,
        manager_id: data.manager_id || null,
        date_of_joining: data.date_of_joining || null,
        phone: data.phone || null,
        location: data.location || null,
        legal_entity: data.legal_entity || null,
        designation: data.designation || null,
      };

      let savedEmployee: Employee;
      if (isEditing && employee?.id) {
        const res = await employeesService.update(employee.id, payload);
        savedEmployee = res.data.data!;
        toast("success", "Employee Updated", "Employee record has been successfully updated.");
      } else {
        const res = await employeesService.create(payload);
        savedEmployee = res.data.data!;
        toast("success", "Employee Created", "A new employee record has been added.");
      }

      if (avatarFile && savedEmployee) {
        await employeesService.uploadAvatar(savedEmployee.id, avatarFile);
        toast("success", "Avatar Uploaded", "Profile image has been saved.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employees-all"] });
      qc.invalidateQueries({ queryKey: ["analytics-summary"] });
      qc.invalidateQueries({ queryKey: ["analytics-charts"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      let msg = error.response?.data?.message || error.response?.data?.detail || "An unexpected error occurred.";
      if (Array.isArray(msg)) {
        msg = msg.map((m: any) => `${m.field}: ${m.message}`).join(", ");
      } else if (typeof msg !== 'string') {
        msg = JSON.stringify(msg);
      }
      toast("error", "Failed to save", msg);
    }
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 border-none shadow-2xl bg-[#F8FAFC] dark:bg-[#0B1020]">
        
        {/* Header Section */}
        <div className="bg-slate-900 p-10 text-white relative">
           <div className="absolute top-0 right-0 p-10 opacity-10">
              <UserPlus size={140} />
           </div>
           <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-brand-400 text-[11px] font-black uppercase tracking-widest mb-6">
                 <Sparkles size={14} /> Organization Builder
              </div>
              <SheetHeader className="text-left space-y-2">
                <SheetTitle className="text-3xl font-black tracking-tight text-white">
                  {isEditing ? "Edit Employee Profile" : "Add New Employee"}
                </SheetTitle>
                <SheetDescription className="text-slate-400 text-lg font-medium">
                  {isEditing ? "Update credentials and professional details." : "Initialize a new employee record within the organization."}
                </SheetDescription>
              </SheetHeader>
           </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-10 space-y-12 pb-32">
            
            {/* Profile Hero Setup */}
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 rounded-[32px] bg-white dark:bg-[#172036] border border-slate-100 dark:border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
               <div className="relative group cursor-pointer overflow-hidden rounded-[32px] border-4 border-slate-50 dark:border-slate-800 w-32 h-32 bg-slate-100 dark:bg-white/5 flex flex-col items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 ring-1 ring-slate-200/50">
                  <AnimatePresence mode="wait">
                    {avatarPreview ? (
                      <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full relative">
                        <img src={getAssetUrl(avatarPreview)} alt="Avatar" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-black uppercase tracking-widest gap-2 backdrop-blur-[2px]">
                          <Upload size={20} />
                          <span>Change</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-400 flex flex-col items-center gap-2">
                        <Upload size={32} strokeWidth={2.5} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Upload Photo</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
               </div>
               <div className="flex-1 text-center md:text-left">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">Employee Profile Identity</h4>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed">
                    Personalize the profile with a professional headshot. This image will be used across dashboards and team catalogs.
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                     <span className="text-[10px] font-black uppercase tracking-widest text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">JPG/PNG</span>
                     <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">MAX 5MB</span>
                  </div>
               </div>
            </div>

            {/* Core Identification */}
            <Section title="Primary Identification" icon={User} color="brand">
              <FormWrapper columns={2} className="gap-6">
                <Field label="Employee Code *" error={errors.employee_code?.message}>
                  <Input {...register("employee_code")} placeholder="e.g. EMP-1024" disabled={isEditing} className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" />
                </Field>
                <Field label="System Status *" error={errors.status?.message}>
                  <Select {...register("status")} className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white font-bold">
                    <option value="active">Active Service</option>
                    <option value="on_leave">Sabbatical / Leave</option>
                    <option value="terminated">Inactive / Exited</option>
                  </Select>
                </Field>
                <Field label="First Name *" error={errors.first_name?.message}>
                  <Input {...register("first_name")} placeholder="John" className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" />
                </Field>
                <Field label="Last Name *" error={errors.last_name?.message}>
                  <Input {...register("last_name")} placeholder="Doe" className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" />
                </Field>
              </FormWrapper>
            </Section>

            {/* Professional Setup */}
            <Section title="Professional Context" icon={Briefcase} color="indigo">
              <FormWrapper columns={2} className="gap-6">
                <Field label="Designation / Role" error={errors.designation?.message}>
                  <Input {...register("designation")} placeholder="Senior Product Designer" className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" />
                </Field>
                <Field label="Date of Joining" error={errors.date_of_joining?.message}>
                  <Input {...register("date_of_joining")} type="date" className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" />
                </Field>
                <Field label="Primary Department" error={errors.department_id?.message}>
                  <Select {...register("department_id")} className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white">
                    <option value="">Unassigned</option>
                    {depts?.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Sub-Department / Team" error={errors.sub_department?.message}>
                  <Input {...register("sub_department")} placeholder="Experience Design" className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" />
                </Field>
                <Field label="Legal Entity" error={errors.legal_entity?.message}>
                  <Input {...register("legal_entity")} placeholder="Global Tech Holdings" className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" />
                </Field>
                <Field label="Reporting Manager" error={errors.manager_id?.message}>
                  <Select {...register("manager_id")} className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white">
                    <option value="">Self Managed / No Manager</option>
                    {managers?.map((m) => (
                      <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                    ))}
                  </Select>
                </Field>
              </FormWrapper>
            </Section>

            {/* Communication & Location */}
            <Section title="Communication Sync" icon={Mail} color="emerald">
              <FormWrapper columns={2} className="gap-6">
                <div className="col-span-2">
                  <Field label="Official Corporate Email *" error={errors.email?.message}>
                    <Input {...register("email")} type="email" placeholder="john.doe@company.com" className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" />
                  </Field>
                </div>
                <Field label="Contact Phone" error={errors.phone?.message}>
                  <Input {...register("phone")} placeholder="+1 (555) 000-0000" className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" />
                </Field>
                <Field label="Base Workplace Location" error={errors.location?.message}>
                  <Input {...register("location")} placeholder="Remote / Headquarters" className="h-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" />
                </Field>
              </FormWrapper>
            </Section>

            {/* Tooltip / Helper */}
            <div className="bg-indigo-50 dark:bg-indigo-500/5 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-500/10 flex gap-4">
               <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                  <Info size={20} />
               </div>
               <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-800 dark:text-white">Quick Note</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                    Mandatory fields are marked with an asterisk (*). Ensure the email address is unique as it's the primary account identifier for SSO and login.
                  </p>
               </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="fixed bottom-0 right-0 left-0 sm:left-auto sm:w-[calc(100%-0px)] max-w-2xl bg-white/80 dark:bg-[#172036]/80 backdrop-blur-xl p-8 border-t border-slate-100 dark:border-white/5 flex gap-4 z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-[11px] text-slate-400 hover:text-slate-800 hover:bg-slate-50">
              Discard Changes
            </Button>
            <Button type="submit" isLoading={mutation.isPending} className="flex-[2] rounded-2xl h-14 font-black uppercase tracking-widest text-[11px] bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-600/20">
               {isEditing ? "Synchronize Record" : "Finalize Registration"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, icon: Icon, children, color }: any) {
  const colors: any = {
    brand: "bg-brand-50 text-brand-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-white/10", colors[color])}>
           <Icon size={20} strokeWidth={2.5} />
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
        <div className="h-px bg-slate-100 dark:bg-white/5 flex-1 ml-2" />
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, error }: any) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-brand-500">
        {label}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[10px] font-bold text-red-500 mt-1 ml-1 uppercase tracking-tighter">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
