import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, Download, X, FileText, Sparkles } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { employeesService } from "@/services/employees.service";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [summary, setSummary] = useState<{ created: number; errors: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setSummary(null);
    setIsDragging(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetState();
    onOpenChange(newOpen);
  };

  const mutation = useMutation({
    mutationFn: (importFile: File) => employeesService.importCSV(importFile),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["analytics-summary"] });
      qc.invalidateQueries({ queryKey: ["analytics-charts"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setSummary(res.data.data!);
      if (res.data.data?.errors.length === 0) {
        toast("success", "Import Successful", `${res.data.data.created} employees have been imported.`);
      } else {
        toast("warning", "Import Completed with Errors", `${res.data.data?.created} imported, ${res.data.data?.errors.length} failed.`);
      }
    },
    onError: (error: any) => {
      toast("error", "Import Failed", error.response?.data?.detail || "An unexpected error occurred during import.");
    }
  });

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      toast("error", "Invalid file type", "Please upload a CSV file.");
      return;
    }
    setFile(selectedFile);
    setSummary(null);
  };

  const handleImport = () => {
    if (file) mutation.mutate(file);
  };

  const handleDownloadTemplate = () => {
    employeesService.downloadTemplate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-none rounded-[28px] shadow-2xl">
        <div className="bg-slate-900 p-8 text-white relative">
           {/* Decorative Elements */}
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <FileSpreadsheet size={120} />
           </div>
           <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-brand-400 text-[10px] font-black uppercase tracking-widest mb-4">
                 <Sparkles size={12} /> Organizational Scale
              </div>
              <DialogTitle className="text-3xl font-black mb-2 tracking-tight">Bulk Import Employees</DialogTitle>
              <DialogDescription className="text-slate-400 text-base font-medium">
                Sync your entire workforce database in seconds via CSV.
              </DialogDescription>
           </div>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {!summary ? (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {!file ? (
                  <div 
                    className={cn(
                      "group relative border-2 border-dashed rounded-[24px] p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                      isDragging 
                        ? "border-brand-500 bg-brand-50/50" 
                        : "border-slate-200 hover:border-brand-400 hover:bg-slate-50/50"
                    )}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="h-16 w-16 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-6 text-brand-600 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-brand-100/50">
                      <UploadCloud size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-1">Click to upload or drag & drop</h3>
                    <p className="text-sm text-slate-400 font-medium max-w-xs">Upload your CSV file containing employee records (max. 10MB)</p>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])} 
                      accept=".csv,text/csv" 
                      className="hidden" 
                    />
                  </div>
                ) : (
                  <div className="relative border border-slate-100 rounded-[24px] p-8 bg-slate-50/50 flex flex-col items-center text-center shadow-inner">
                    <button 
                      onClick={() => setFile(null)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand-500 mb-4 border border-slate-100">
                       <FileText size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-1">{file.name}</h3>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{(file.size / 1024).toFixed(2)} KB • READY FOR IMPORT</p>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                         <Download size={18} />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Need a template?</span>
                         <span className="text-[11px] text-slate-500 font-medium">Use our pre-formatted structure.</span>
                      </div>
                   </div>
                   <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} className="font-black uppercase tracking-widest text-[10px] text-indigo-600 hover:bg-white rounded-lg">
                      Download CSV
                   </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="summary"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className={cn(
                  "rounded-[24px] p-8 text-center border-b-4",
                  summary.errors.length === 0 
                    ? "bg-emerald-50/50 border-emerald-500 shadow-[0_8px_30px_rgba(16,185,129,0.05)]" 
                    : "bg-amber-50/50 border-amber-500 shadow-[0_8px_30px_rgba(245,158,11,0.05)]"
                )}>
                  {summary.errors.length === 0 ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                         <CheckCircle size={32} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Import Successful</h3>
                      <p className="text-slate-500 font-medium mt-1">
                        <span className="text-emerald-600 font-black">{summary.created}</span> new employee profiles created.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
                         <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Partial Completion</h3>
                      <p className="text-slate-500 font-medium mt-1">
                         Successfully imported <span className="text-emerald-600 font-black">{summary.created}</span>, but <span className="text-amber-600 font-black">{summary.errors.length}</span> failed.
                      </p>
                    </>
                  )}
                </div>

                {summary.errors.length > 0 && (
                  <div className="border border-slate-100 rounded-[20px] overflow-hidden bg-white shadow-sm">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Error Report</span>
                       <Badge variant="destructive" className="h-5 px-2 text-[9px] font-black uppercase rounded-lg border-none">{summary.errors.length} Failures</Badge>
                    </div>
                    <div className="max-h-[160px] overflow-y-auto p-4 space-y-2 custom-scrollbar">
                      {summary.errors.map((err, i) => (
                        <div key={i} className="text-xs text-slate-600 flex items-start gap-2 p-2 rounded-lg bg-red-50/30">
                          <span className="font-black text-red-600 shrink-0 uppercase tracking-tighter">Row {err.row}:</span>
                          <span className="font-medium">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
          {summary ? (
            <Button onClick={() => handleOpenChange(false)} className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-slate-200">
               Acknowledge & Close
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => handleOpenChange(false)} className="rounded-xl h-12 px-6 font-bold text-slate-400">Cancel</Button>
              <Button 
                onClick={handleImport} 
                disabled={!file || mutation.isPending} 
                isLoading={mutation.isPending}
                className="rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[11px] bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-600/20"
              >
                Start Data Import
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
