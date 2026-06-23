import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock, AlertCircle, Search, Building2, User,
  Calendar, MapPin, Video, Lock, RefreshCw,
  CheckSquare, XSquare, UserCheck, Copy, ExternalLink
} from "lucide-react";
import { attendanceService } from "@/services/attendance.service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/store/authStore";
import { useMotivationalToast } from "@/components/ui/MotivationalToast";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import synergyLogo from "@/assets/synergy-logo.png";

type Candidate = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  designation: string;
  profile_image_url: string | null;
  department_name: string;
  status: string | null; // PRESENT, LATE, ABSENT, PARTIAL (EXCUSED)
};

export default function AttendanceRosterPage() {
  const { token: sessionToken } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [submittedBy, setSubmittedBy] = useState("");
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  // 1. Fetch details
  const { data: sessionData, isLoading, error, refetch } = useQuery({
    queryKey: ["public-session", sessionToken],
    queryFn: () => attendanceService.getPublicSessionDetails(sessionToken!).then(res => res.data.data),
    enabled: !!sessionToken,
    staleTime: 30_000,
  });

  const session = sessionData?.session;
  const roster = sessionData?.roster as Candidate[] | undefined;

  // Sync initial status values from db
  useEffect(() => {
    if (roster) {
      const initial: Record<string, string> = {};
      roster.forEach(c => {
        if (c.status) {
          // Map DB status 'PARTIAL' back to 'EXCUSED' for the UI
          initial[c.id] = c.status === "PARTIAL" ? "EXCUSED" : c.status;
        }
      });
      setLocalStatuses(initial);
    }
  }, [roster]);

  // Set default submitter name if logged in
  useEffect(() => {
    if (authUser) {
      const name = authUser.employee
        ? `${authUser.employee.first_name} ${authUser.employee.last_name}`
        : authUser.email;
      setSubmittedBy(name);
    }
  }, [authUser]);

  // 2. Submit mutation
  const submitMutation = useMutation({
    mutationFn: (data: { submitted_by: string; records: { employee_id: string; status: string }[] }) =>
      attendanceService.submitPublicAttendance(sessionToken!, data),
    onSuccess: () => {
      toast("success", "Attendance recorded successfully");
      useMotivationalToast.getState().showToast("Attendance recorded successfully", "check");
      queryClient.invalidateQueries({ queryKey: ["admin-attendance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["admin-attendance-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-live-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-history-me"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard-unified"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-summary"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-charts"] });
      refetch();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || "Failed to submit attendance.";
      toast("error", msg);
    }
  });

  // Extract unique departments for dropdown
  const departments = useMemo(() => {
    if (!roster) return [];
    const depts = new Set<string>();
    roster.forEach(c => {
      if (c.department_name) depts.add(c.department_name);
    });
    return Array.from(depts).sort();
  }, [roster]);

  // Filter roster
  const filteredRoster = useMemo(() => {
    if (!roster) return [];
    return roster.filter(c => {
      const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
      const matchesSearch = fullName.includes(search.toLowerCase()) ||
                            c.employee_code.toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === "all" || c.department_name === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [roster, search, deptFilter]);

  // Bulk marking helpers
  const markAllPresent = () => {
    if (!roster) return;
    const updated = { ...localStatuses };
    filteredRoster.forEach(c => {
      updated[c.id] = "PRESENT";
    });
    setLocalStatuses(updated);
    toast("success", `Marked ${filteredRoster.length} candidates as Present`);
  };

  const resetAll = () => {
    if (!roster) return;
    const updated = { ...localStatuses };
    filteredRoster.forEach(c => {
      delete updated[c.id];
    });
    setLocalStatuses(updated);
    toast("info", "Roster selections reset locally");
  };

  const copyRosterLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast("success", "Attendance roster link copied");
  };

  const handleStatusChange = (employeeId: string, status: string) => {
    setLocalStatuses(prev => ({
      ...prev,
      [employeeId]: status
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedBy.trim()) {
      toast("error", "Please enter your name as the Submitting Trainer/Coordinator.");
      return;
    }

    const payloadRecords = (roster || []).map(candidate => {
      const status = localStatuses[candidate.id] || "ABSENT";
      // Map UI state 'EXCUSED' to DB state 'PARTIAL'
      const dbStatus = status === "EXCUSED" ? "PARTIAL" : status;
      return {
        employee_id: candidate.id,
        status: dbStatus
      };
    });

    submitMutation.mutate({
      submitted_by: submittedBy.trim(),
      records: payloadRecords
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-2xl animate-pulse"></div>
          <img src={synergyLogo} alt="Synergy Logo" className="h-16 w-auto object-contain animate-bounce" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Loading Candidate Roster...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-[32px] text-center shadow-sm">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-black tracking-tight mb-2 text-slate-800">Access Denied / Not Found</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            The attendance session link is invalid, expired, or does not exist. Please contact your training administrator to generate a new active link.
          </p>
          <Button onClick={() => navigate("/login")} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 font-bold">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { training_title, trainer_name, start_date, start_time, duration_hours, venue, delivery_mode, meeting_link, is_editable } = session;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-36 flex flex-col font-sans">
      {/* ── Top Branding Navigation ── */}
      <nav className="h-16 px-6 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={synergyLogo} alt="Synergy Logo" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wide text-slate-800 leading-none hidden sm:inline">Training Management System</span>
            <span className="text-sm font-black tracking-wide text-slate-800 leading-none sm:hidden">TMS</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mt-0.5">Attendance Desk</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {is_editable ? (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[9px] uppercase tracking-wider px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5 inline-block" />
              Session Open
            </Badge>
          ) : (
            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-black text-[9px] uppercase tracking-wider px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 inline-block" />
              Locked / Read-Only
            </Badge>
          )}
        </div>
      </nav>

      {/* ── Main Layout ── */}
      <main className="max-w-[1200px] w-full mx-auto px-6 pt-8 flex-1 space-y-8">
        
        {/* ── Session Detail Header Card ── */}
        <div className="relative bg-white border border-slate-200 rounded-[32px] p-8 overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -z-10" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 text-left">
                  {delivery_mode?.replace("_", " ")} Session
                </span>
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-800 text-left">
                  {training_title}
                </h1>
                <p className="text-sm font-bold text-slate-500 text-left">
                  Attendance Roster
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-xs text-slate-500 font-bold">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-indigo-500" />
                  Training Date: {start_date ? format(parseISO(start_date), "dd MMMM yyyy") : "N/A"}
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-indigo-400" />
                  Session Time: {start_time || "N/A"} ({duration_hours || 0} Hrs)
                </div>
                <div className="flex items-center gap-2">
                  <User size={15} className="text-emerald-500" />
                  Trainer Name: {trainer_name || "Internal SGS"}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-amber-500" />
                  Venue / Mode: {venue || delivery_mode?.replace("_", " ") || "N/A"}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-center min-w-[140px]">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Enrolled</span>
                <h2 className="text-4xl font-black text-slate-800">{roster?.length || 0}</h2>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 block">Candidates</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={copyRosterLink}
                  className="h-11 justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-700 hover:bg-slate-100"
                >
                  <Copy size={14} className="mr-2" /> Copy Attendance Link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
                  className="h-11 justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-700 hover:bg-slate-100"
                >
                  <ExternalLink size={14} className="mr-2" /> Open Roster
                </Button>
              </div>
            </div>
          </div>

          {/* Meeting link joining option if remote */}
          {meeting_link && (
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-600">Live Virtual Session Connected</span>
              </div>
              <Button 
                onClick={() => window.open(meeting_link, "_blank")} 
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                Launch Meeting Link
              </Button>
            </div>
          )}
        </div>

        {/* ── Filters & Action Controls ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input
                placeholder="Search candidates by name or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 pl-9 pr-4 rounded-xl bg-slate-50 border-slate-200 text-xs text-slate-800 placeholder-slate-400 w-full focus-visible:ring-indigo-500/20 focus-visible:ring-offset-0 focus-visible:border-indigo-500/50"
              />
            </div>

            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 outline-none focus:border-indigo-500/50"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {is_editable && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                onClick={markAllPresent}
                className="text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold h-10 px-4"
              >
                <CheckSquare size={14} className="mr-2" /> Mark All Present
              </Button>
              <Button
                variant="ghost"
                onClick={resetAll}
                className="text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold h-10 px-4"
              >
                <XSquare size={14} className="mr-2" /> Reset
              </Button>
            </div>
          )}
        </div>

        {/* ── Candidate Roster Table/Grid ── */}
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee Details</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Department & Role</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Attendance Roster Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoster.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-8 py-16 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center gap-3">
                        <AlertCircle size={32} className="text-slate-400" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">No Participants Found</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          No enrolled participants found for this training session.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRoster.map(candidate => {
                    const status = localStatuses[candidate.id];
                    const initials = `${candidate.first_name[0] || ""}${candidate.last_name[0] || ""}`;

                    return (
                      <tr key={candidate.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              {candidate.profile_image_url ? (
                                <img
                                  src={candidate.profile_image_url}
                                  alt={`${candidate.first_name} ${candidate.last_name}`}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-black">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-slate-800">
                                {candidate.first_name} {candidate.last_name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                ID: {candidate.employee_code}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 uppercase tracking-wider">
                              <Building2 size={12} className="text-indigo-500" />
                              {candidate.department_name || "General"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                              {candidate.designation || "Employee"}
                            </span>
                          </div>
                        </td>

                        <td className="px-8 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {[
                              { label: "Present", code: "PRESENT", activeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm", defaultCls: "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 bg-slate-50/50" },
                              { label: "Late", code: "LATE", activeCls: "bg-amber-50 text-amber-700 border-amber-200 shadow-sm", defaultCls: "text-slate-400 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 bg-slate-50/50" },
                              { label: "Absent", code: "ABSENT", activeCls: "bg-rose-50 text-rose-700 border-rose-200 shadow-sm", defaultCls: "text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 bg-slate-50/50" },
                              { label: "Excused", code: "EXCUSED", activeCls: "bg-purple-50 text-purple-700 border-purple-200 shadow-sm", defaultCls: "text-slate-400 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 bg-slate-50/50" }
                            ].map(item => {
                              const isActive = status === item.code;
                              return (
                                <button
                                  key={item.code}
                                  disabled={!is_editable}
                                  onClick={() => handleStatusChange(candidate.id, item.code)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all duration-300",
                                    isActive ? item.activeCls : item.defaultCls,
                                    !is_editable && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  {item.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ── Sticky Submission Bottom Bar ── */}
      {is_editable && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 py-4 px-6 z-40 shadow-lg">
          <form onSubmit={handleSubmit} className="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1">
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest block shrink-0">Coordinator Signature:</span>
              <Input
                type="text"
                placeholder="Enter your name (e.g. John Doe - Trainer)"
                value={submittedBy}
                onChange={e => setSubmittedBy(e.target.value)}
                className="h-10 w-full md:w-80 bg-slate-50 border-slate-200 text-xs text-slate-800 placeholder-slate-400 rounded-xl focus-visible:ring-indigo-500/20"
                required
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 font-bold hidden lg:inline">
                {Object.keys(localStatuses).length} of {roster?.length || 0} Marked
              </span>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest px-8 py-3 h-11 shadow-sm shrink-0 flex items-center gap-2"
              >
                {submitMutation.isPending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UserCheck size={14} />
                    Submit Attendance
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
