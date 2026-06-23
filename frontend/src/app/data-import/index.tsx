import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Upload, Download, AlertTriangle, CheckCircle, XCircle, 
  History, Info, Loader2, ArrowLeft, Settings, Database, 
  Users, GraduationCap, Clock, ClipboardList, Star, CalendarRange,
  Search, SlidersHorizontal, X, FileSpreadsheet, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { trainingsService } from "@/services/trainings.service";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/formatters";

type PageMode = "upload" | "preview" | "result";

export default function DataImportPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<PageMode>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState("update");
  const [isConfirming, setIsConfirming] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("trainings");

  // Mobile specific state hooks
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, success, failed, pending
  const [filterTime, setFilterTime] = useState("all"); // all, week, month
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(5);
  const [errorsLimit, setErrorsLimit] = useState(5);
  const [mobileTab, setMobileTab] = useState<"recent" | "success" | "failed" | "errors">("recent");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch import audit history
  const { data: history = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ["import-history"],
    queryFn: async () => {
      const res = await trainingsService.getImportHistory();
      return res.data?.data || [];
    }
  });

  const handleDownloadTemplate = async () => {
    try {
      const res = await trainingsService.downloadMasterTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "master_import_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast("success", "Master template downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast("error", "Failed to download template");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await parseFile(file);
  };

  const parseFile = async (file: File) => {
    setIsParsing(true);
    try {
      const res = await trainingsService.parseMasterFile(file);
      if (res.data?.success && res.data?.data) {
        setPreviewData(res.data.data);
        setUploadedFile(file);
        setMode("preview");
        toast("success", "Master workbook parsed successfully!");
      } else {
        toast("error", res.data?.message || "Failed to parse file");
      }
    } catch (err: any) {
      console.error(err);
      toast("error", err.response?.data?.message || "An error occurred while parsing the file");
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        await parseFile(file);
      } else {
        toast("error", "Only Excel files (.xlsx, .xls) are allowed");
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setIsConfirming(true);
    try {
      const res = await trainingsService.confirmMasterImport(
        previewData.sheets,
        duplicateStrategy
      );
      if (res.data?.success && res.data?.data) {
        setImportResult(res.data.data);
        setMode("result");
        toast("success", "Database update completed successfully!");
        queryClient.invalidateQueries();
        refetchHistory();
      } else {
        toast("error", res.data?.message || "Import failed");
      }
    } catch (err: any) {
      console.error(err);
      toast("error", err.response?.data?.message || "An error occurred during DB migration");
    } finally {
      setIsConfirming(false);
    }
  };

  const resetImportFlow = () => {
    setUploadedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setMode("upload");
  };

  // ── Render Helpers ─────────────────────────────────────────────────────────

  const getRecordStatusBadge = (r: any) => {
    if (!r.is_valid) {
      return <Badge variant="destructive" className="font-extrabold uppercase">Invalid</Badge>;
    }
    if (r.is_duplicate) {
      return <Badge variant="warning" className="font-extrabold uppercase">Duplicate</Badge>;
    }
    return <Badge variant="success" className="font-extrabold uppercase">Valid</Badge>;
  };

  const renderSheetTable = (sheetKey: string) => {
    const records = previewData?.sheets?.[sheetKey] || [];
    
    // Pick appropriate columns depending on sheet
    let cols: Column<any>[] = [];

    const statusCol: Column<any> = {
      key: "status",
      label: "Validation Status",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400">Row {r.index + 1}</span>
            {getRecordStatusBadge(r)}
          </div>
          {r.errors?.length > 0 && (
            <div className="text-[11px] text-rose-500 font-semibold space-y-0.5 mt-1">
              {r.errors.map((e: string, i: number) => (
                <div key={i} className="flex items-start gap-1">
                  <span className="shrink-0">•</span>
                  <span>{e}</span>
                </div>
              ))}
            </div>
          )}
          {r.warnings?.length > 0 && (
            <div className="text-[11px] text-amber-500 font-semibold space-y-0.5 mt-1">
              {r.warnings.map((w: string, i: number) => (
                <div key={i} className="flex items-start gap-1">
                  <span className="shrink-0">•</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    };

    if (sheetKey === "employees") {
      cols = [
        statusCol,
        { key: "employee_id", label: "Employee ID", render: (r) => <span className="font-bold text-slate-900 dark:text-white">{r.data.employee_id}</span> },
        { key: "employee_name", label: "Employee Name", render: (r) => <span className="font-bold text-slate-900 dark:text-white">{r.data.employee_name}</span> },
        { key: "department", label: "Department", render: (r) => <span className="font-semibold text-slate-600 dark:text-slate-300">{r.data.department}</span> },
        { key: "designation", label: "Designation", render: (r) => <span className="text-slate-500 dark:text-slate-400">{r.data.designation || "—"}</span> },
        { key: "manager", label: "Manager ID", render: (r) => <span className="font-mono text-xs">{r.data.manager || "—"}</span> },
        { key: "date_of_joining", label: "Date of Joining", render: (r) => <span>{r.data.date_of_joining}</span> },
        { key: "status", label: "Status", render: (r) => <span className="capitalize">{r.data.status}</span> },
      ];
    } else if (sheetKey === "trainings") {
      cols = [
        statusCol,
        { key: "title", label: "Training Name", render: (r) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{r.data.title}</span> },
        { key: "department", label: "Target Department(s)", render: (r) => <span className="font-semibold">{r.data.department}</span> },
        { key: "training_category", label: "Category", render: (r) => <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold">{r.data.training_category || "—"}</span> },
        { key: "trainer_name", label: "Trainer", render: (r) => <span>{r.data.trainer_name || "—"}</span> },
        { key: "training_date", label: "Date", render: (r) => <span>{r.data.training_date}</span> },
        { key: "duration_hours", label: "Duration", render: (r) => <span className="font-bold">{r.data.duration_hours} hrs</span> },
        { key: "mode", label: "Mode", render: (r) => <Badge variant={r.data.mode === "ONLINE" ? "info" : "warning"}>{r.data.mode}</Badge> },
        { key: "status", label: "Status", render: (r) => <Badge variant="secondary">{r.data.status}</Badge> },
      ];
    } else if (sheetKey === "enrollments") {
      cols = [
        statusCol,
        { key: "employee_id", label: "Employee ID", render: (r) => <span className="font-mono text-xs">{r.data.employee_id}</span> },
        { key: "employee_name", label: "Employee Name", render: (r) => <span className="font-bold">{r.data.employee_name}</span> },
        { key: "training_name", label: "Training Title", render: (r) => <span className="font-bold">{r.data.training_name}</span> },
        { key: "training_date", label: "Training Date", render: (r) => <span>{r.data.training_date}</span> },
        { key: "enrollment_date", label: "Enrollment Date", render: (r) => <span>{r.data.enrollment_date}</span> },
        { key: "enrollment_status", label: "Status", render: (r) => <Badge className="capitalize">{r.data.enrollment_status}</Badge> },
      ];
    } else if (sheetKey === "attendance") {
      cols = [
        statusCol,
        { key: "employee_id", label: "Employee ID", render: (r) => <span className="font-mono text-xs">{r.data.employee_id}</span> },
        { key: "employee_name", label: "Employee Name", render: (r) => <span className="font-bold">{r.data.employee_name}</span> },
        { key: "training_name", label: "Training Title", render: (r) => <span className="font-bold">{r.data.training_name}</span> },
        { key: "training_date", label: "Training Date", render: (r) => <span>{r.data.training_date}</span> },
        { key: "attendance_status", label: "Attendance Status", render: (r) => <Badge variant={r.data.attendance_status?.toLowerCase() === "present" ? "success" : "destructive"}>{r.data.attendance_status}</Badge> },
        { key: "hours_earned", label: "Hours Earned", render: (r) => <span className="font-bold">{r.data.hours_earned} hrs</span> },
      ];
    } else if (sheetKey === "feedback") {
      cols = [
        statusCol,
        { key: "employee_id", label: "Employee ID", render: (r) => <span className="font-mono text-xs">{r.data.employee_id}</span> },
        { key: "employee_name", label: "Employee Name", render: (r) => <span className="font-bold">{r.data.employee_name}</span> },
        { key: "training_name", label: "Training Title", render: (r) => <span className="font-bold">{r.data.training_name}</span> },
        { key: "training_date", label: "Training Date", render: (r) => <span>{r.data.training_date}</span> },
        { 
          key: "ratings", 
          label: "Ratings", 
          render: (r) => (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Overall: {r.data.overall_rating}/5</span>
              <span className="text-slate-500">Trainer: {r.data.trainer_rating}/5</span>
              <span className="text-slate-500">Content: {r.data.content_rating}/5</span>
            </div>
          ) 
        },
        { key: "feedback_comments", label: "Comments", render: (r) => <p className="text-xs max-w-[200px] truncate">{r.data.feedback_comments || "—"}</p> },
      ];
    } else if (sheetKey === "learning_hours") {
      cols = [
        statusCol,
        { key: "employee_id", label: "Employee ID", render: (r) => <span className="font-mono text-xs">{r.data.employee_id}</span> },
        { key: "employee_name", label: "Employee Name", render: (r) => <span className="font-bold">{r.data.employee_name}</span> },
        { key: "training_name", label: "Training Title", render: (r) => <span className="font-bold">{r.data.training_name}</span> },
        { key: "training_date", label: "Training Date", render: (r) => <span>{r.data.training_date}</span> },
        { key: "learning_hours_earned", label: "Hours Earned", render: (r) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{r.data.learning_hours_earned} hrs</span> },
        { key: "financial_year", label: "FY", render: (r) => <span className="font-bold text-xs">{r.data.financial_year}</span> },
      ];
    }

    return (
      <div className="mt-4">
        <Table
          columns={cols}
          data={records}
          keyExtractor={(row: any) => `${sheetKey}-${row.index}`}
          emptyTitle={`No records found in the ${sheetKey} sheet.`}
          className="rounded-[20px] overflow-hidden"
        />
      </div>
    );
  };

  const getSheetIcon = (key: string) => {
    switch (key) {
      case "employees": return <Users size={16} />;
      case "trainings": return <GraduationCap size={16} />;
      case "enrollments": return <ClipboardList size={16} />;
      case "attendance": return <Clock size={16} />;
      case "feedback": return <Star size={16} />;
      case "learning_hours": return <CalendarRange size={16} />;
      default: return <Database size={16} />;
    }
  };

  const getImportStatus = (h: any) => {
    if (h.status) return h.status.toLowerCase();
    if (h.records_failed > 0 && h.records_imported === 0) return "failed";
    if (h.records_failed > 0 && h.records_imported > 0) return "partial";
    if (h.records_failed === 0) return "success";
    return "success";
  };

  const filteredHistory = history.filter((h: any) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const filename = (h.source_file || "").toLowerCase();
      const user = (h.imported_by_name || "").toLowerCase();
      if (!filename.includes(q) && !user.includes(q)) return false;
    }
    
    const status = getImportStatus(h);
    if (filterStatus !== "all" && status !== filterStatus) return false;
    
    if (filterTime !== "all") {
      const date = new Date(h.import_date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (filterTime === "week" && diffDays > 7) return false;
      if (filterTime === "month" && diffDays > 30) return false;
    }

    if (mobileTab === "success") {
      return status === "success";
    }
    if (mobileTab === "failed") {
      return status === "failed" || status === "partial";
    }

    return true;
  });

  const failedImports = history.filter((h: any) => h.records_failed > 0);

  const triggerFileBrowse = () => {
    document.getElementById("mobile-file-input-id")?.click();
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="success" className="font-extrabold uppercase text-[9px] py-0.5 px-1.5 rounded-md">Success</Badge>;
      case "partial":
        return <Badge variant="warning" className="font-extrabold uppercase text-[9px] py-0.5 px-1.5 rounded-md">Partial</Badge>;
      case "failed":
        return <Badge variant="destructive" className="font-extrabold uppercase text-[9px] py-0.5 px-1.5 rounded-md">Failed</Badge>;
      case "processing":
        return <Badge variant="info" className="font-extrabold uppercase text-[9px] py-0.5 px-1.5 rounded-md animate-pulse">Processing</Badge>;
      default:
        return <Badge variant="secondary" className="font-extrabold uppercase text-[9px] py-0.5 px-1.5 rounded-md">Success</Badge>;
    }
  };

  const renderMobilePreviewFields = (sheetKey: string, data: any) => {
    switch (sheetKey) {
      case "employees":
        return (
          <>
            <div><span className="text-[9px] uppercase text-slate-400">ID:</span> <span className="font-bold text-slate-700 dark:text-slate-350">{data.employee_id}</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">Name:</span> <span className="font-bold text-slate-700 dark:text-slate-355 truncate block">{data.employee_name}</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">Dept:</span> <span className="font-semibold">{data.department}</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">Manager:</span> <span className="font-mono text-[10px]">{data.manager || "—"}</span></div>
          </>
        );
      case "trainings":
        return (
          <>
            <div className="col-span-2"><span className="text-[9px] uppercase text-slate-400">Title:</span> <span className="font-bold text-indigo-500">{data.title}</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">Date:</span> <span>{data.training_date}</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">Duration:</span> <span className="font-semibold">{data.duration_hours} hrs</span></div>
          </>
        );
      case "enrollments":
        return (
          <>
            <div className="col-span-2"><span className="text-[9px] uppercase text-slate-400">Emp:</span> <span className="font-bold">{data.employee_name} ({data.employee_id})</span></div>
            <div className="col-span-2"><span className="text-[9px] uppercase text-slate-400">Training:</span> <span className="font-semibold">{data.training_name}</span></div>
          </>
        );
      case "attendance":
        return (
          <>
            <div className="col-span-2"><span className="text-[9px] uppercase text-slate-400">Emp:</span> <span className="font-bold">{data.employee_name} ({data.employee_id})</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">Status:</span> <span className="font-semibold">{data.attendance_status}</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">Hours:</span> <span className="font-bold">{data.hours_earned} hrs</span></div>
          </>
        );
      case "feedback":
        return (
          <>
            <div className="col-span-2"><span className="text-[9px] uppercase text-slate-400">Emp:</span> <span className="font-bold">{data.employee_name} ({data.employee_id})</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">Rating:</span> <span className="font-bold">{data.overall_rating}/5</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">Comments:</span> <span className="truncate block max-w-[100px]">{data.feedback_comments || "—"}</span></div>
          </>
        );
      case "learning_hours":
        return (
          <>
            <div className="col-span-2"><span className="text-[9px] uppercase text-slate-400">Emp ID:</span> <span className="font-mono">{data.employee_id}</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">Hours:</span> <span className="font-bold text-indigo-500">{data.learning_hours_earned} hrs</span></div>
            <div><span className="text-[9px] uppercase text-slate-400">FY:</span> <span className="font-semibold">{data.financial_year}</span></div>
          </>
        );
      default:
        return null;
    }
  };

  const renderMobileView = () => {
    return (
      <div className="flex flex-col gap-2 max-w-md mx-auto px-1 py-1 h-full min-h-screen text-slate-800 dark:text-slate-100 select-none pb-28">
        
        {/* Hidden File Input for mobile trigger */}
        <input 
          id="mobile-file-input-id"
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileChange} 
          className="hidden" 
        />

        {mode === "upload" && (
          <>
            {/* Header */}
            <header className="h-[80px] w-full flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-2 shrink-0">
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Database size={18} className="text-indigo-600 dark:text-indigo-400" />
                  Data Import
                </h1>
                <p className="text-[11px] font-bold text-slate-400 leading-none">Workbook Imports</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleDownloadTemplate} 
                  size="sm"
                  variant="ghost" 
                  className="rounded-xl border border-slate-200/60 dark:border-white/10 text-xs font-black flex items-center gap-1 bg-white/50 dark:bg-white/[0.02]"
                >
                  <Download size={13} strokeWidth={2.5} />
                  Template
                </Button>
                <Button 
                  onClick={triggerFileBrowse}
                  size="sm"
                  className="rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center gap-1 shadow-md shadow-indigo-600/10"
                >
                  <Upload size={13} strokeWidth={2.5} />
                  Upload
                </Button>
              </div>
            </header>

            {/* Quick Stats Bar */}
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-4 px-4 scrollbar-hide shrink-0 mt-3">
              {[
                { label: "Imports", val: `${history.length} Logs`, bg: "from-indigo-500/10 to-indigo-600/5", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-150/30" },
                { label: "Successful", val: `${history.filter((h: any) => h.records_failed === 0).length} Success`, bg: "from-emerald-500/10 to-emerald-600/5", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-150/30" },
                { label: "Failed", val: `${history.filter((h: any) => h.records_failed > 0).length} Failed`, bg: "from-rose-500/10 to-rose-600/5", text: "text-rose-600 dark:text-rose-400", border: "border-rose-150/30" },
                { label: "Pending", val: "0 Pending", bg: "from-amber-500/10 to-amber-600/5", text: "text-amber-600 dark:text-amber-400", border: "border-amber-150/30" }
              ].map((chip, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex-1 min-w-[102px] flex flex-col p-2.5 bg-gradient-to-br border rounded-2xl shadow-sm shrink-0",
                    chip.bg,
                    chip.border
                  )}
                >
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider leading-none mb-1">{chip.label}</span>
                  <span className={cn("text-xs font-black tracking-tight", chip.text)}>{chip.val}</span>
                </div>
              ))}
            </div>

            {/* Upload Area (Compact card) */}
            <div className="bg-white dark:bg-[#172036] rounded-2xl border border-slate-200/60 dark:border-white/10 p-4 shadow-sm flex items-center justify-between gap-3 h-[115px] shrink-0 mt-3">
              {isParsing ? (
                <div className="flex items-center gap-3 w-full justify-center">
                  <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 dark:text-white">Parsing Workbook...</p>
                    <p className="text-[10px] text-slate-400 font-bold">Verifying constraints & sheets...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-white">Master Workbook</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Upload Excel Workbook</p>
                      <p className="text-[9px] text-indigo-500 font-semibold uppercase mt-0.5">Supports .xlsx</p>
                    </div>
                  </div>
                  <button 
                    onClick={triggerFileBrowse}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/10 transition-all shrink-0 active:scale-95"
                  >
                    Upload File
                  </button>
                </>
              )}
            </div>

            {/* Validation Rules Collapsible */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-white/5 rounded-2xl p-3 mt-3">
              <button 
                onClick={() => setRulesExpanded(!rulesExpanded)}
                className="w-full flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-350 outline-none"
              >
                <span className="flex items-center gap-1.5">
                  <Info size={14} className="text-indigo-500" />
                  Validation Rules
                </span>
                <span className="text-[10px]">{rulesExpanded ? "▲" : "▼"}</span>
              </button>
              
              <AnimatePresence>
                {rulesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mt-2.5 pt-2 border-t border-slate-200/50 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 font-bold leading-relaxed"
                  >
                    <p>
                      Data validation checks relationships strictly: <strong>Employees $\to$ Trainings $\to$ Enrollments $\to$ Attendance $\to$ Feedback</strong>.
                    </p>
                    <p>
                      If records (like employees or trainings) do not exist, they must be added in their respective sheets in the same workbook.
                    </p>
                    <p className="text-indigo-500 font-bold">
                      Ensure no failed records exist in the preview before executing.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky Search & Filter */}
            <div className="sticky top-0 z-20 bg-slate-50 dark:bg-[#0B1020] py-2 mt-4 flex items-center gap-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={15} />
                <input
                  placeholder="Search imports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#172036] border border-slate-200/60 dark:border-white/5 focus:outline-none focus:border-indigo-500/50 shadow-inner"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={12} />
                  </button>
                )}
              </div>
              <button 
                onClick={() => setFilterDrawerOpen(true)}
                className="p-2 rounded-xl bg-white dark:bg-[#172036] border border-slate-200/60 dark:border-white/5 shadow-sm text-slate-500 hover:text-indigo-500 active:scale-95 shrink-0"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200/50 dark:border-white/5 overflow-x-auto scrollbar-hide mt-3 shrink-0">
              {[
                { id: "recent", label: "Recent" },
                { id: "success", label: "Success" },
                { id: "failed", label: "Failed" },
                { id: "errors", label: "Errors" }
              ].map((tab) => {
                const active = mobileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setMobileTab(tab.id as any);
                      setHistoryLimit(5); // Reset lazy loading limit
                    }}
                    className={cn(
                      "flex-1 text-center py-2.5 text-xs font-black border-b-2 transition-colors outline-none whitespace-nowrap",
                      active 
                        ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content Lists */}
            {mobileTab !== "errors" ? (
              <div className="space-y-2.5 mt-3">
                {historyLoading ? (
                  <div className="py-8 text-center flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400 font-bold">Loading history...</span>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-bold">
                    No import logs match criteria.
                  </div>
                ) : (
                  <>
                    {filteredHistory.slice(0, historyLimit).map((h) => {
                      const status = getImportStatus(h);
                      return (
                        <div 
                          key={h.id}
                          onClick={() => setSelectedHistoryItem(h)}
                          className="bg-white dark:bg-[#172036] rounded-xl border border-slate-200/60 dark:border-white/5 p-3 flex flex-col justify-between h-[92px] active:scale-[0.99] hover:bg-slate-50/55 transition-all cursor-pointer shadow-sm"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">{h.source_file}</h4>
                              <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">{formatDate(h.import_date)} • {h.imported_by_name || "System Admin"}</p>
                            </div>
                            {renderStatusBadge(status)}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/[0.03] pt-2">
                            <span className="text-emerald-600 dark:text-emerald-400">{h.records_imported} Imported</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span className={h.records_failed > 0 ? "text-rose-500" : ""}>{h.records_failed} Errors</span>
                          </div>
                        </div>
                      );
                    })}
                    {filteredHistory.length > historyLimit && (
                      <button 
                        onClick={() => setHistoryLimit(prev => prev + 5)}
                        className="w-full py-2.5 text-xs font-black text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-200 dark:border-indigo-500/20 rounded-xl hover:bg-indigo-500/5 transition-all mt-2 uppercase tracking-wider"
                      >
                        Load More History
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 mt-3">
                {historyLoading ? (
                  <div className="py-8 text-center flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : failedImports.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-bold bg-white dark:bg-[#172036] rounded-2xl border border-slate-200/60 dark:border-white/5">
                    🎉 No failed imports found in history logs!
                  </div>
                ) : (
                  <>
                    {failedImports.slice(0, errorsLimit).map((h) => (
                      <div 
                        key={h.id}
                        className="bg-white dark:bg-[#172036] rounded-xl border border-slate-200/60 dark:border-white/5 p-3 flex flex-col justify-between h-[96px] shadow-sm"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-800 dark:text-white truncate uppercase tracking-tight">{h.source_file}</h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Last Attempt: {formatDate(h.import_date)}</p>
                            <p className="text-[10px] text-rose-500 font-black mt-0.5">{h.records_failed} Row Errors</p>
                          </div>
                          <button 
                            onClick={triggerFileBrowse}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shrink-0"
                          >
                            <RefreshCw size={10} />
                            Retry
                          </button>
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold border-t border-slate-100 dark:border-white/[0.03] pt-1.5">
                          Audit Log: Row constraint failures in database migration.
                        </div>
                      </div>
                    ))}
                    {failedImports.length > errorsLimit && (
                      <button 
                        onClick={() => setErrorsLimit(prev => prev + 5)}
                        className="w-full py-2.5 text-xs font-black text-rose-600 dark:text-rose-400 border border-dashed border-rose-200 dark:border-rose-500/20 rounded-xl hover:bg-rose-500/5 transition-all mt-2 uppercase tracking-wider"
                      >
                        Load More Errors
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ── PHASE 2: MOBILE PREVIEW SCREEN ────────────────────────────────── */}
        {mode === "preview" && previewData && (
          <div className="flex flex-col gap-4 mt-2 h-full pb-20">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-3">
              <button 
                onClick={resetImportFlow}
                className="flex items-center gap-1 text-xs font-black text-slate-500 outline-none"
              >
                <ArrowLeft size={13} strokeWidth={2.5} />
                Back
              </button>
              <div className="text-right">
                <h3 className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[200px]">{uploadedFile?.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{previewData.summary?.records_found} Total Rows</p>
              </div>
            </div>

            {/* Strategy Selector */}
            <div className="bg-white dark:bg-[#172036] rounded-xl border border-slate-200/60 dark:border-white/5 p-3 flex items-center justify-between gap-3 shadow-sm shrink-0">
              <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider">Duplicate Strategy</span>
              <Select
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value)}
                className="min-w-[140px] text-xs font-bold rounded-xl"
              >
                <option value="skip">Skip Duplicates</option>
                <option value="update">Update Fields</option>
                <option value="replace">Overwrite</option>
              </Select>
            </div>

            {/* Validation Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white dark:bg-[#172036] border border-slate-200/60 dark:border-white/5 rounded-xl p-2.5 text-center">
                <span className="text-[8.5px] font-black uppercase text-slate-400">Valid</span>
                <p className="text-sm font-black text-emerald-500 mt-0.5">{previewData.summary?.valid_records}</p>
              </div>
              <div className="bg-white dark:bg-[#172036] border border-slate-200/60 dark:border-white/5 rounded-xl p-2.5 text-center">
                <span className="text-[8.5px] font-black uppercase text-slate-400">Warnings</span>
                <p className="text-sm font-black text-amber-500 mt-0.5">{previewData.summary?.warnings}</p>
              </div>
              <div className="bg-white dark:bg-[#172036] border border-slate-200/60 dark:border-white/5 rounded-xl p-2.5 text-center">
                <span className="text-[8.5px] font-black uppercase text-slate-400">Errors</span>
                <p className={cn("text-sm font-black mt-0.5", previewData.summary?.failed_records > 0 ? "text-rose-500" : "text-slate-800 dark:text-white")}>{previewData.summary?.failed_records}</p>
              </div>
            </div>

            {/* Error Alert Box */}
            {previewData.summary?.failed_records > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2.5">
                <XCircle className="text-rose-500 shrink-0 mt-0.5" size={14} />
                <div>
                  <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-wider">Action Blocked</h4>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold leading-normal mt-0.5">
                    Database migration blocked. Resolve row errors in Excel workbook and try uploading again.
                  </p>
                </div>
              </div>
            )}

            {/* Tab Selectors for Preview Sheets */}
            <div className="flex border-b border-slate-200/50 dark:border-white/5 overflow-x-auto scrollbar-hide shrink-0">
              {Object.keys(previewData.sheets).map((key) => {
                const count = previewData.sheets[key]?.length || 0;
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "py-2.5 px-4 text-xs font-black border-b-2 transition-colors outline-none whitespace-nowrap",
                      active 
                        ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <span className="capitalize">{key.replace("_", " ")} ({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Record Cards List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[45vh] pb-10">
              {(previewData.sheets[activeTab] || []).length === 0 ? (
                <p className="text-center text-xs text-slate-400 font-bold py-6">No records in this sheet.</p>
              ) : (
                (previewData.sheets[activeTab] || []).map((r: any) => (
                  <div 
                    key={`${activeTab}-${r.index}`}
                    className="bg-white dark:bg-[#172036] rounded-xl border border-slate-200/60 dark:border-white/5 p-3 flex flex-col gap-2 shadow-sm text-[11px]"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/[0.03] pb-1.5">
                      <span className="font-black text-slate-400">Row {r.index + 1}</span>
                      {getRecordStatusBadge(r)}
                    </div>

                    {/* Values summary */}
                    <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-350">
                      {renderMobilePreviewFields(activeTab, r.data)}
                    </div>

                    {/* Error logs */}
                    {r.errors?.length > 0 && (
                      <div className="bg-rose-500/5 rounded-lg p-2 border border-rose-500/10 text-[10px] text-rose-500 font-semibold space-y-0.5">
                        {r.errors.map((e: string, i: number) => <div key={i}>• {e}</div>)}
                      </div>
                    )}
                    {r.warnings?.length > 0 && (
                      <div className="bg-amber-500/5 rounded-lg p-2 border border-amber-500/10 text-[10px] text-amber-500 font-semibold space-y-0.5">
                        {r.warnings.map((w: string, i: number) => <div key={i}>• {w}</div>)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Floating Confirm Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#172036]/95 border-t border-slate-200 dark:border-white/5 p-4 flex gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
              <button 
                onClick={resetImportFlow}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-350 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmImport}
                disabled={isConfirming || previewData.summary?.failed_records > 0}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── PHASE 3: MOBILE RESULT SCREEN ────────────────────────────────── */}
        {mode === "result" && importResult && (
          <div className="flex flex-col gap-4 text-center mt-6 max-w-sm mx-auto">
            <div className="bg-white dark:bg-[#172036] rounded-2xl border border-slate-200/60 dark:border-white/5 p-6 shadow-sm flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm mb-3">
                <CheckCircle size={24} strokeWidth={2.5} />
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Import Completed</h2>
              <p className="text-xs text-slate-400 font-bold mt-1">
                Your data has been successfully committed to the database. All connected modules have been updated.
              </p>

              {/* Counts Grid */}
              <div className="grid grid-cols-3 gap-2 w-full mt-6 border-t border-slate-100 dark:border-white/[0.03] pt-4">
                <div>
                  <p className="text-[8.5px] font-black uppercase text-slate-400">Imported</p>
                  <h4 className="text-lg font-black text-emerald-500 mt-0.5">{importResult.successfully_imported}</h4>
                </div>
                <div>
                  <p className="text-[8.5px] font-black uppercase text-slate-400">Skipped</p>
                  <h4 className="text-lg font-black text-amber-505 mt-0.5">{importResult.skipped_duplicates}</h4>
                </div>
                <div>
                  <p className="text-[8.5px] font-black uppercase text-slate-400">Failed</p>
                  <h4 className="text-lg font-black text-rose-500 mt-0.5">{importResult.failed_records}</h4>
                </div>
              </div>
            </div>

            {/* Sheet Breakdown List */}
            <div className="bg-white dark:bg-[#172036] rounded-2xl border border-slate-200/60 dark:border-white/5 p-4 shadow-sm text-left space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <Database size={12} className="text-indigo-600" />
                Sheet Breakdown
              </h4>
              <div className="space-y-2.5">
                {Object.keys(importResult.sheet_breakdown || {}).map((key) => {
                  const b = importResult.sheet_breakdown[key];
                  return (
                    <div key={key} className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">{key.replace("_", " ")}</span>
                      <div className="flex gap-2">
                        <span className="text-emerald-500 font-extrabold">{b.imported} ok</span>
                        {b.skipped > 0 && <span className="text-amber-500 font-semibold">{b.skipped} skip</span>}
                        {b.failed > 0 && <span className="text-rose-500 font-black">{b.failed} err</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Back Button */}
            <div className="pt-4">
              <Button 
                onClick={resetImportFlow}
                className="w-full rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black text-xs py-3.5 shadow-md active:scale-95 transition-transform"
              >
                Back to Import Center
              </Button>
            </div>
          </div>
        )}

        {/* ── Filter Drawer Bottom Sheet ──────────────────────────────────────── */}
        <AnimatePresence>
          {filterDrawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setFilterDrawerOpen(false)}
                className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#172036] border-t border-slate-200 dark:border-white/5 rounded-t-[24px] p-5 max-h-[85vh]"
              >
                <div className="w-12 h-1.5 bg-slate-250 dark:bg-slate-700/80 rounded-full mx-auto mb-4" />
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Filter History</h3>
                  <button 
                    onClick={() => setFilterDrawerOpen(false)} 
                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="space-y-5 mt-4">
                  {/* Status Filter */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Audit Status</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        { id: "all", label: "All Statuses" },
                        { id: "success", label: "Success" },
                        { id: "failed", label: "Failed" }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setFilterStatus(opt.id)}
                          className={cn(
                            "px-3.5 py-2 text-xs font-bold rounded-xl border transition-all",
                            filterStatus === opt.id
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                              : "bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-355"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Time Filter */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Time Range</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[
                        { id: "all", label: "All Time" },
                        { id: "week", label: "This Week" },
                        { id: "month", label: "This Month" }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setFilterTime(opt.id)}
                          className={cn(
                            "px-3.5 py-2 text-xs font-bold rounded-xl border transition-all",
                            filterTime === opt.id
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                              : "bg-slate-50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-350"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-4 border-t border-slate-100 dark:border-white/5 mt-6">
                    <button 
                      onClick={() => {
                        setFilterStatus("all");
                        setFilterTime("all");
                      }}
                      className="flex-1 py-3 bg-slate-50 dark:bg-slate-800/40 text-xs font-black uppercase tracking-widest text-slate-500 rounded-xl"
                    >
                      Reset All
                    </button>
                    <button 
                      onClick={() => setFilterDrawerOpen(false)}
                      className="flex-1 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md shadow-indigo-600/10"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Import Details Bottom Sheet ────────────────────────────────────── */}
        <AnimatePresence>
          {selectedHistoryItem && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedHistoryItem(null)}
                className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#172036] border-t border-slate-200 dark:border-white/5 rounded-t-[24px] p-5 max-h-[80vh] overflow-y-auto"
              >
                <div className="w-12 h-1.5 bg-slate-250 dark:bg-slate-700/80 rounded-full mx-auto mb-4" />
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{selectedHistoryItem.source_file}</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{formatDate(selectedHistoryItem.import_date)}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedHistoryItem(null)} 
                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="space-y-3.5 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-black uppercase text-slate-400">Imported Rows</span>
                      <p className="text-base font-black text-emerald-500 mt-1">{selectedHistoryItem.records_imported}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-black uppercase text-slate-400">Skipped Duplicates</span>
                      <p className="text-base font-black text-amber-550 mt-1">{selectedHistoryItem.records_skipped}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                    <span className="text-[9px] font-black uppercase text-slate-400">Failed / Errors</span>
                    <p className="text-base font-black text-rose-500 mt-1">{selectedHistoryItem.records_failed}</p>
                    
                    {selectedHistoryItem.records_failed > 0 ? (
                      <div className="mt-3 text-[11px] text-rose-600 dark:text-rose-400 font-bold space-y-1.5 border-t border-rose-100 dark:border-rose-950/20 pt-2.5 leading-normal">
                        <p>• Database constraints validation failed on {selectedHistoryItem.records_failed} rows.</p>
                        <p>• Ensure Employee IDs are valid and all columns conform to validation rules.</p>
                      </div>
                    ) : (
                      <p className="text-[11.5px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                        All records successfully verified and loaded without database warnings.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                    <button 
                      onClick={() => setSelectedHistoryItem(null)}
                      className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-350 rounded-xl active:bg-slate-200 transition-colors"
                    >
                      Close
                    </button>
                    {selectedHistoryItem.records_failed > 0 && (
                      <button 
                        onClick={() => {
                          setSelectedHistoryItem(null);
                          triggerFileBrowse();
                        }}
                        className="flex-1 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl active:bg-indigo-700 transition-colors"
                      >
                        Retry Import
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    );
  };

  if (isMobile) {
    return renderMobileView();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-2">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Database className="text-indigo-600 dark:text-indigo-400" size={32} />
            Data Import Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 max-w-2xl">
            Admin Sourcing Dashboard for bulk master data migration. Upload one Excel workbook to configure employees, trainings, enrollments, attendance, and feedback ratings in parallel.
          </p>
        </div>
        {mode === "upload" && (
          <Button 
            onClick={handleDownloadTemplate} 
            className="rounded-2xl border-slate-200 hover:bg-slate-50/80 shadow-sm dark:border-white/10 dark:hover:bg-white/5 bg-white text-slate-800 dark:text-white font-extrabold flex items-center gap-2 shrink-0 py-5"
            variant="outline"
          >
            <Download size={16} strokeWidth={2.5} />
            Download Master Template
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ── PHASE 1: UPLOAD SCREEN ────────────────────────────────────────── */}
        {mode === "upload" && (
          <motion.div
            key="upload-section"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Uploader Box */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="bg-white dark:bg-[#172036] rounded-[28px] border-2 border-dashed border-indigo-200 dark:border-indigo-500/20 shadow-[0_4px_20px_rgba(79,70,229,0.03)] hover:shadow-[0_10px_40px_rgba(79,70,229,0.08)] dark:hover:shadow-[0_10px_40px_rgba(79,70,229,0.15)] hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 p-12 text-center relative flex flex-col items-center justify-center min-h-[350px]"
            >
              {isParsing ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl animate-pulse"></div>
                    <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-400 animate-spin" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white mt-4">Parsing Master Excel Workbook</h3>
                  <p className="text-sm text-slate-400 font-bold max-w-sm">Reading columns, verifying sheet relationships, and analyzing formats...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-[24px] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm mb-4">
                    <Upload size={32} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Upload Master Import Workbook</h3>
                    <p className="text-sm text-slate-400 font-bold mt-1 max-w-md">
                      Drag & drop your compiled template here, or click to browse files on your computer.
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm px-6 py-3 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                      <Upload size={16} strokeWidth={2.5} />
                      Browse Files
                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-4 mt-6 text-xs font-semibold text-slate-400">
                    <span>Supports: .xlsx, .xls</span>
                    <span>•</span>
                    <span>Max Size: 25MB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Instruction Warning Box */}
            <Card className="bg-slate-50 border-slate-100 dark:bg-slate-900/50 dark:border-white/5 rounded-[24px] p-5 shadow-none flex items-start gap-4">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <Info size={18} strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Topological Validation Order</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  Data validation verifies relationships strictly: Employees $\to$ Trainings $\to$ Enrollments $\to$ Attendance $\to$ Feedback. If employees or trainings are not already in the database, they MUST be populated in the respective tabs in the SAME workbook.
                </p>
              </div>
            </Card>

            {/* Import History Section */}
            <div className="space-y-3">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <History size={20} className="text-slate-400" />
                Import History & Audit Trails
              </h2>
              {historyLoading ? (
                <div className="h-32 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : (
                <Table
                  columns={[
                    { key: "import_date", label: "Import Date", render: (h) => <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(h.import_date)}</span> },
                    { key: "imported_by_name", label: "Performed By", render: (h) => <span className="font-semibold">{h.imported_by_name || "System Admin"}</span> },
                    { key: "source_file", label: "Source Workbook", render: (h) => <span className="font-mono text-xs">{h.source_file}</span> },
                    { key: "records_imported", label: "Imported", render: (h) => <Badge variant="success">{h.records_imported} rows</Badge> },
                    { key: "records_skipped", label: "Skipped", render: (h) => <Badge variant="warning">{h.records_skipped} duplicates</Badge> },
                    { key: "records_failed", label: "Failed", render: (h) => <Badge variant={h.records_failed > 0 ? "destructive" : "secondary"}>{h.records_failed} errors</Badge> },
                  ]}
                  data={history}
                  keyExtractor={(row) => row.id}
                  emptyTitle="No import history logs found."
                  className="rounded-[24px] overflow-hidden"
                />
              )}
            </div>
          </motion.div>
        )}

        {/* ── PHASE 2: PREVIEW & VALIDATION SCREEN ─────────────────────────── */}
        {mode === "preview" && previewData && (
          <motion.div
            key="preview-section"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Top Bar with Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Button 
                  onClick={resetImportFlow} 
                  variant="outline" 
                  className="rounded-xl border-slate-200 font-extrabold hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 text-slate-700 dark:text-white flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} strokeWidth={2.5} />
                  Back
                </Button>
                <div className="min-w-0">
                  <h3 className="text-md font-black text-slate-800 dark:text-white truncate">Workbook: {uploadedFile?.name}</h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">Found {previewData.summary?.records_found} rows</p>
                </div>
              </div>

              {/* Duplicate Strategy & Confirm */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-slate-400" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Duplicate Strategy:</span>
                  <Select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value)}
                    className="min-w-[150px] text-xs font-bold rounded-xl"
                  >
                    <option value="skip">Skip Duplicates</option>
                    <option value="update">Update Fields</option>
                    <option value="replace">Overwrite Records</option>
                  </Select>
                </div>

                <Button
                  onClick={handleConfirmImport}
                  disabled={isConfirming || previewData.summary?.failed_records > 0}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 shadow-md shadow-indigo-600/10 flex items-center gap-2"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} strokeWidth={2.5} />
                      Confirm Import
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Validation Summaries */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white dark:bg-[#172036] rounded-[24px] p-5 border-[#EEF2FF] dark:border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Database size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Found</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">{previewData.summary?.records_found}</h4>
                </div>
              </Card>

              <Card className="bg-white dark:bg-[#172036] rounded-[24px] p-5 border-[#EEF2FF] dark:border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Valid Rows</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">{previewData.summary?.valid_records}</h4>
                </div>
              </Card>

              <Card className="bg-white dark:bg-[#172036] rounded-[24px] p-5 border-[#EEF2FF] dark:border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Warnings</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">{previewData.summary?.warnings}</h4>
                </div>
              </Card>

              <Card className="bg-white dark:bg-[#172036] rounded-[24px] p-5 border-[#EEF2FF] dark:border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <XCircle size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Errors (Blocking)</p>
                  <h4 className={cn("text-2xl font-black leading-none mt-1", previewData.summary?.failed_records > 0 ? "text-rose-500 animate-pulse" : "text-slate-900 dark:text-white")}>{previewData.summary?.failed_records}</h4>
                </div>
              </Card>
            </div>

            {/* Validation Block Alert */}
            {previewData.summary?.failed_records > 0 && (
              <Card className="bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-500/20 rounded-[24px] p-5 flex items-start gap-4">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 shrink-0">
                  <XCircle size={18} strokeWidth={2.5} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-rose-800 dark:text-rose-400 uppercase tracking-wider">Import Action Blocked</h4>
                  <p className="text-xs text-rose-700 dark:text-rose-500 font-bold leading-relaxed">
                    You cannot commit import data when there are failing row validation errors. Please fix all red row-level issues in the spreadsheet sheets and try uploading it again.
                  </p>
                </div>
              </Card>
            )}

            {/* Sheets Preview Navigation Tabs */}
            <div className="space-y-4">
              <div className="flex border-b border-slate-200 dark:border-white/5 overflow-x-auto whitespace-nowrap scrollbar-hide">
                {Object.keys(previewData.sheets).map((key) => {
                  const count = previewData.sheets[key]?.length || 0;
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={cn(
                        "flex items-center gap-2 px-6 py-4 font-bold text-sm border-b-2 transition-all outline-none",
                        active 
                          ? "border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                          : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      )}
                    >
                      {getSheetIcon(key)}
                      <span className="capitalize">{key.replace("_", " ")}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-slate-400">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {renderSheetTable(activeTab)}
            </div>
          </motion.div>
        )}

        {/* ── PHASE 3: RESULTS SCREEN ──────────────────────────────────────── */}
        {mode === "result" && importResult && (
          <motion.div
            key="result-section"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6 max-w-2xl mx-auto text-center"
          >
            {/* Header Success / Info */}
            <div className="bg-white dark:bg-[#172036] rounded-[28px] border border-[#EEF2FF] dark:border-white/5 p-8 shadow-sm flex flex-col items-center">
              <div className="w-16 h-16 rounded-[20px] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm mb-4">
                <CheckCircle size={28} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Master Import Completed</h2>
              <p className="text-sm text-slate-400 font-bold mt-1">
                Your data has been successfully committed to the database. All connected modules have been updated.
              </p>

              {/* Overall Counts Card */}
              <div className="grid grid-cols-3 gap-4 w-full mt-8 border-t border-slate-100 dark:border-white/5 pt-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Imported</p>
                  <h4 className="text-2xl font-black text-emerald-500 mt-1">{importResult.successfully_imported}</h4>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Skipped</p>
                  <h4 className="text-2xl font-black text-amber-500 mt-1">{importResult.skipped_duplicates}</h4>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Failed</p>
                  <h4 className="text-2xl font-black text-rose-500 mt-1">{importResult.failed_records}</h4>
                </div>
              </div>
            </div>

            {/* Breakdown Table Card */}
            <div className="bg-white dark:bg-[#172036] rounded-[28px] border border-[#EEF2FF] dark:border-white/5 p-6 shadow-sm text-left space-y-4">
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Database size={16} className="text-indigo-600" />
                Sheet Breakdown
              </h4>

              <Table
                columns={[
                  { key: "sheet", label: "Sheet Name", render: (b) => <span className="font-bold capitalize">{b.sheet.replace("_", " ")}</span> },
                  { key: "imported", label: "Imported", render: (b) => <Badge variant="success">{b.imported} rows</Badge> },
                  { key: "skipped", label: "Skipped", render: (b) => <Badge variant="warning">{b.skipped} rows</Badge> },
                  { key: "failed", label: "Failed", render: (b) => <Badge variant={b.failed > 0 ? "destructive" : "secondary"}>{b.failed} rows</Badge> },
                ]}
                data={Object.keys(importResult.sheet_breakdown || {}).map((key) => ({
                  sheet: key,
                  ...importResult.sheet_breakdown[key]
                }))}
                keyExtractor={(row) => row.sheet}
                hideHeader
                className="border-none shadow-none"
              />
            </div>

            {/* Back Button */}
            <div className="pt-4">
              <Button 
                onClick={resetImportFlow}
                className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-3.5 shadow-lg dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                Back to Data Import Center
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
