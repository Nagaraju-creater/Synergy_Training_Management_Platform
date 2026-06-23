import { User, Mail, Phone, MapPin, Calendar, Building, Hash, Edit3, ShieldCheck, MapPinned, Briefcase } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Employee } from "@/types";
import { formatDate } from "@/utils/formatters";
import { motion } from "framer-motion";
import { getAssetUrl } from "@/lib/utils";

interface EmployeeDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onEdit: (employee: Employee) => void;
}

export function EmployeeDetailDrawer({ open, onOpenChange, employee, onEdit }: EmployeeDetailDrawerProps) {
  if (!employee) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 border-none shadow-2xl bg-[#F8FAFC] dark:bg-[#0B1020]">
        {/* Header / Hero Section */}
        <div className="relative overflow-hidden bg-white dark:bg-[#172036] pt-16 pb-8 px-8 border-b border-slate-100 dark:border-white/5 shadow-sm">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="absolute top-4 right-4 z-10">
            <Button variant="outline" size="sm" onClick={() => onEdit(employee)} className="rounded-xl h-9 px-4 font-bold border-slate-200 text-slate-700 bg-white shadow-sm hover:shadow-md transition-all gap-2">
              <Edit3 size={14} />
              Edit Profile
            </Button>
          </div>
          
          <div className="flex flex-col items-center text-center relative z-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-28 h-28 rounded-[32px] border-4 border-white dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-white/5 flex items-center justify-center shadow-xl mb-6 ring-1 ring-slate-200/50 dark:ring-white/5"
            >
              {employee.profile_image_url ? (
                <img src={getAssetUrl(employee.profile_image_url)} alt={employee.first_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-slate-400 uppercase">{employee.first_name.charAt(0)}{employee.last_name.charAt(0)}</span>
              )}
            </motion.div>
            
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {employee.first_name} {employee.last_name}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[11px] font-black uppercase tracking-widest mt-2 border border-brand-100 dark:border-brand-500/20">
              {employee.designation || "Employee"}
            </div>
            
            <div className="mt-4 flex items-center gap-2">
               <Badge variant={employee.status === "active" ? "success" : employee.status === "on_leave" ? "warning" : "secondary"} className="h-6 px-3 rounded-full font-black uppercase tracking-widest text-[9px] border-none shadow-sm">
                {(employee.status || "active").replace("_", " ")}
              </Badge>
              <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-xs font-mono font-medium text-slate-400">{employee.employee_code || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
          {/* Employment Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <ShieldCheck size={16} />
               </div>
               <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Professional Identity</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              <InfoItem icon={Building} label="Department" value={employee.department?.name} />
              <InfoItem icon={Hash} label="Sub-Department" value={employee.sub_department} />
              <InfoItem icon={Briefcase} label="Legal Entity" value={employee.legal_entity} />
              <InfoItem icon={Calendar} label="Tenure Start" value={employee.date_of_joining ? formatDate(employee.date_of_joining) : null} />
              <InfoItem icon={User} label="Reporting Manager" value={employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : null} />
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <MapPinned size={16} />
               </div>
               <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Communication</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              <InfoItem icon={Mail} label="Official Email" value={employee.email} isLink href={`mailto:${employee.email}`} />
              <InfoItem icon={Phone} label="Contact Number" value={employee.phone} />
              <InfoItem icon={MapPin} label="Base Location" value={employee.location} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoItem({ icon: Icon, label, value, isLink, href }: any) {
  return (
    <div className="flex items-start gap-4 group/item">
      <div className="w-9 h-9 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 group-hover/item:text-brand-500 group-hover/item:border-brand-100 transition-all shadow-sm">
        <Icon size={16} />
      </div>
      <div className="flex flex-col pt-0.5">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</span>
        {value ? (
          isLink ? (
            <a href={href} className="text-sm font-bold text-brand-600 hover:underline">{value}</a>
          ) : (
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{value}</span>
          )
        ) : (
          <span className="text-sm font-medium text-slate-300 italic">Not specified</span>
        )}
      </div>
    </div>
  );
}
