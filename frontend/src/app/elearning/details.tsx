import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Upload, FileText, Video, Image as ImageIcon, 
  Archive, Link as LinkIcon, FileSpreadsheet, Eye, Calendar, 
  User, Check, ShieldAlert, Edit2, Trash2, Download, ExternalLink, HelpCircle
} from "lucide-react";

import { learningHubService } from "@/services/learningHub.service";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/Dialog";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { toast } from "@/components/ui/Toast";
import { cn, getAssetUrl } from "@/lib/utils";
import type { LearningMaterial } from "@/types/learningHub";
import { formatDate } from "@/utils/formatters";

// Helper to resolve static file paths locally or in Supabase
function getFileUrl(path: string | null | undefined): string {
  return getAssetUrl(path);
}

export default function ELearningDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const is_admin = user?.role?.toLowerCase() === "admin";

  // --- Modals & Selectors ---
  const [previewMaterial, setPreviewMaterial] = useState<LearningMaterial | null>(null);
  const [materialToEdit, setMaterialToEdit] = useState<LearningMaterial | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // --- Forms ---
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    external_url: "",
    tags: "",
    file: null as File | null
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    external_url: "",
    tags: "",
    is_approved: true,
    file: null as File | null
  });

  // --- Queries ---
  const { data: moduleData, isLoading } = useQuery({
    queryKey: ["learning-module", id],
    queryFn: () => learningHubService.getModule(id || ""),
    enabled: !!id,
    select: (res) => res.data.data,
  });

  // --- Mutations ---
  const addMaterialMutation = useMutation({
    mutationFn: learningHubService.addMaterial,
    onSuccess: () => {
      toast("success", "Material Added", "The learning material has been successfully added to this module.");
      setIsUploadOpen(false);
      setUploadForm({ title: "", description: "", external_url: "", tags: "", file: null });
      qc.invalidateQueries({ queryKey: ["learning-module", id] });
    },
    onError: (err: any) => {
      toast("error", "Upload Failed", err.response?.data?.detail || "An error occurred during upload.");
    }
  });

  const updateMaterialMutation = useMutation({
    mutationFn: ({ matId, payload }: { matId: string; payload: any }) => learningHubService.updateMaterial(matId, payload),
    onSuccess: () => {
      toast("success", "Material Updated", "Successfully saved changes to this material.");
      setMaterialToEdit(null);
      setEditForm({ title: "", description: "", external_url: "", tags: "", is_approved: true, file: null });
      qc.invalidateQueries({ queryKey: ["learning-module", id] });
    },
    onError: (err: any) => {
      toast("error", "Update Failed", err.response?.data?.detail || "An error occurred.");
    }
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (matId: string) => learningHubService.deleteMaterial(matId),
    onSuccess: () => {
      toast("success", "Material Deleted", "Learning material removed.");
      setMaterialToDelete(null);
      qc.invalidateQueries({ queryKey: ["learning-module", id] });
    },
    onError: (err: any) => {
      toast("error", "Delete Failed", err.response?.data?.detail || "An error occurred.");
    }
  });

  const toggleApprovalMutation = useMutation({
    mutationFn: ({ matId, isApproved }: { matId: string; isApproved: boolean }) => 
      learningHubService.updateMaterial(matId, { is_approved: isApproved }),
    onSuccess: () => {
      toast("success", "Approval Status Updated", "Governance settings applied.");
      qc.invalidateQueries({ queryKey: ["learning-module", id] });
    },
    onError: (err: any) => {
      toast("error", "Action Failed", err.response?.data?.detail || "An error occurred.");
    }
  });

  const trackViewMutation = useMutation({
    mutationFn: (matId: string) => learningHubService.trackView(matId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning-module", id] });
    }
  });

  // --- Handlers ---
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !uploadForm.title) return;
    if (!uploadForm.file && !uploadForm.external_url) {
      toast("warning", "File or Link Required", "Please select a file or enter an external URL.");
      return;
    }
    addMaterialMutation.mutate({
      module_id: id,
      title: uploadForm.title,
      description: uploadForm.description || undefined,
      external_url: uploadForm.external_url || undefined,
      tags: uploadForm.tags || undefined,
      file: uploadForm.file || undefined
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialToEdit) return;
    updateMaterialMutation.mutate({
      matId: materialToEdit.id,
      payload: {
        title: editForm.title || undefined,
        description: editForm.description,
        external_url: editForm.external_url,
        tags: editForm.tags,
        is_approved: is_admin ? editForm.is_approved : undefined,
        file: editForm.file || undefined
      }
    });
  };

  const startEdit = (mat: LearningMaterial) => {
    setMaterialToEdit(mat);
    setEditForm({
      title: mat.title,
      description: mat.description || "",
      external_url: mat.external_url || "",
      tags: mat.tags || "",
      is_approved: mat.is_approved,
      file: null
    });
  };

  const handleOpenMaterial = (mat: LearningMaterial) => {
    // Increment view count in backend
    trackViewMutation.mutate(mat.id);

    // If external URL, open in new tab
    if (mat.external_url && !mat.file_path) {
      window.open(mat.external_url, "_blank");
      return;
    }

    // Set preview modal state
    setPreviewMaterial(mat);
  };

  const handleDownload = (mat: LearningMaterial) => {
    if (!mat.file_path) return;
    trackViewMutation.mutate(mat.id);
    const fullUrl = getFileUrl(mat.file_path);
    
    // Create direct anchor link download trigger
    const link = document.createElement("a");
    link.href = fullUrl;
    link.download = mat.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Icon mapping depending on file extension / type
  const getMaterialIcon = (fileType: string | null | undefined, isLink: boolean) => {
    if (isLink) return { icon: LinkIcon, color: "text-blue-500 bg-blue-500/10 border-blue-200/50" };
    
    const type = fileType?.toLowerCase() || "";
    
    if (["pdf"].includes(type)) {
      return { icon: FileText, color: "text-rose-500 bg-rose-500/10 border-rose-200/50" };
    }
    if (["ppt", "pptx"].includes(type)) {
      return { icon: FileText, color: "text-orange-500 bg-orange-500/10 border-orange-200/50" };
    }
    if (["xls", "xlsx"].includes(type)) {
      return { icon: FileSpreadsheet, color: "text-emerald-500 bg-emerald-500/10 border-emerald-200/50" };
    }
    if (["doc", "docx"].includes(type)) {
      return { icon: FileText, color: "text-indigo-500 bg-indigo-500/10 border-indigo-200/50" };
    }
    if (["mp4", "mkv", "avi", "mov"].includes(type)) {
      return { icon: Video, color: "text-violet-500 bg-violet-500/10 border-violet-200/50" };
    }
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(type)) {
      return { icon: ImageIcon, color: "text-pink-500 bg-pink-500/10 border-pink-200/50" };
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(type)) {
      return { icon: Archive, color: "text-amber-500 bg-amber-500/10 border-amber-200/50" };
    }
    return { icon: HelpCircle, color: "text-slate-500 bg-slate-500/10 border-slate-200/50" };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        <p className="text-slate-400 text-sm font-semibold">Loading Module details...</p>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-500 font-bold">Module not found or access denied.</p>
        <Button onClick={() => navigate("/elearning")} className="bg-indigo-600 text-white font-bold rounded-xl">
          Back to Hub
        </Button>
      </div>
    );
  }

  const fileTypeList = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "mp4"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 sm:space-y-8 pb-20">
      
      {/* ── Header ── */}
      <div className="flex flex-col gap-4">
        <button 
          onClick={() => navigate("/elearning")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold transition-colors w-fit"
        >
          <ArrowLeft size={14} />
          Back to E-Learning Hub
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900/60 p-6 rounded-[28px] border border-slate-200/50 dark:border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 font-bold text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none">
                {moduleData.category?.name || "General"}
              </Badge>
              {moduleData.department && (
                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-none text-[10px] font-bold">
                  {moduleData.department.name}
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {moduleData.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl font-semibold">
              {moduleData.description || "Browse supplementary files, reference links, and SOPs."}
            </p>
          </div>
          
          <Button 
            onClick={() => {
              setUploadForm({ title: "", description: "", external_url: "", tags: "", file: null });
              setIsUploadOpen(true);
            }}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-5 shadow-md shadow-indigo-600/10 flex items-center gap-2 self-stretch md:self-auto justify-center"
          >
            <Upload size={14} />
            Upload File
          </Button>
        </div>
      </div>

      {/* ── Materials list ── */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Module Materials ({moduleData.materials?.length || 0})
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {moduleData.materials && moduleData.materials.length > 0 ? (
            moduleData.materials.map((mat) => {
              const fileInfo = getMaterialIcon(mat.file_type, !mat.file_path && !!mat.external_url);
              const MatIcon = fileInfo.icon;
              const hasFile = !!mat.file_path;
              
              // Verify edit permissions
              const canEdit = is_admin || mat.created_by === user?.id;

              return (
                <div 
                  key={mat.id}
                  className={cn(
                    "group relative flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl bg-white dark:bg-slate-900/40 border transition-all duration-300 gap-4",
                    !mat.is_approved ? "border-rose-500/20 bg-rose-500/[0.01]" : "border-slate-200/50 dark:border-white/5 hover:border-indigo-500/10 dark:hover:border-indigo-500/10 hover:shadow-md"
                  )}
                >
                  
                  {/* Icon & Description details */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border shrink-0", fileInfo.color)}>
                      <MatIcon size={22} strokeWidth={2.5} />
                    </div>
                    
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                          {mat.title}
                        </h4>
                        {!mat.is_approved && (
                          <Badge className="bg-rose-500/10 text-rose-500 dark:text-rose-400 border-none font-bold text-[9px] rounded-full px-2 py-0">
                            Unapproved / Hidden
                          </Badge>
                        )}
                        {mat.file_type && (
                          <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0 border-slate-200/80 dark:border-white/10 text-slate-500">
                            {mat.file_type}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-400 leading-normal font-semibold">
                        {mat.description || "No description provided."}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[10px] text-slate-400 font-bold">
                        <span className="flex items-center gap-1">
                          <User size={11} className="text-slate-400" />
                          Uploaded by: {mat.creator?.full_name || "System"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-slate-400" />
                          Date: {formatDate(mat.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={11} className="text-slate-400" />
                          {mat.views} views
                        </span>
                      </div>

                      {/* Material Tags */}
                      {mat.tags && (
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {mat.tags.split(",").map((tag, tIdx) => (
                            <span key={tIdx} className="text-[9px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-100 dark:border-white/5">
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0 border-t border-slate-100 dark:border-white/5 sm:border-none pt-3 sm:pt-0">
                    
                    {/* View preview button */}
                    <button 
                      onClick={() => handleOpenMaterial(mat)}
                      className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-slate-600 dark:text-slate-300 hover:text-white font-bold text-xs border border-slate-200/50 dark:border-white/5 transition-all flex items-center gap-1.5"
                    >
                      {hasFile && fileTypeList.includes(mat.file_type?.toLowerCase() || "") ? (
                        <>
                          <Eye size={13} />
                          Preview
                        </>
                      ) : mat.external_url ? (
                        <>
                          <ExternalLink size={13} />
                          Open Link
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          Download
                        </>
                      )}
                    </button>

                    {/* Download button */}
                    {hasFile && (
                      <button 
                        onClick={() => handleDownload(mat)}
                        title="Download file"
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200/50 dark:border-white/5 transition-all"
                      >
                        <Download size={13} />
                      </button>
                    )}

                    {/* Admin/Creator Edit button */}
                    {canEdit && (
                      <button 
                        onClick={() => startEdit(mat)}
                        title="Replace or Edit file"
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200/50 dark:border-white/5 transition-all"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}

                    {/* Admin Delete and approval controls */}
                    {is_admin && (
                      <>
                        <button 
                          onClick={() => toggleApprovalMutation.mutate({ matId: mat.id, isApproved: !mat.is_approved })}
                          title={mat.is_approved ? "Reject/Hide material" : "Approve/Show material"}
                          className={cn(
                            "p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5 transition-all",
                            mat.is_approved 
                              ? "bg-slate-50 dark:bg-slate-800 text-amber-500 hover:bg-amber-500/10" 
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600"
                          )}
                        >
                          {mat.is_approved ? <ShieldAlert size={13} /> : <Check size={13} />}
                        </button>

                        <button 
                          onClick={() => setMaterialToDelete(mat.id)}
                          title="Delete material"
                          className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-200/20 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}

                  </div>

                </div>
              );
            })
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900/10 border border-slate-200/50 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2">
              <FileText className="w-10 h-10 text-slate-300" />
              <p className="text-xs text-slate-400 font-bold">No reference materials added under this module yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: Upload Material ── */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 rounded-3xl border-slate-200/60 dark:border-white/10 p-6 custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Upload Learning Material</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-400">Contribute reference documentation or links directly to this module.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material Title *</label>
              <Input 
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g. Pivot Tables Advanced Guide"
                required
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
              <Input 
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Explain what this document covers"
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tags</label>
              <Input 
                value={uploadForm.tags}
                onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                placeholder="excel, pivot-tables, guide (comma separated)"
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              />
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Option A: File Upload</label>
                <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 relative">
                  <Upload size={14} className="text-slate-400 ml-1 shrink-0" />
                  <input 
                    type="file" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setUploadForm({ ...uploadForm, file });
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 font-semibold truncate max-w-[280px]">
                    {uploadForm.file ? uploadForm.file.name : "Select PDF, PPT, DOC, XLS, MP4, ZIP, PNG, JPG..."}
                  </span>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-slate-400 uppercase">OR</span>
                <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Option B: External URL</label>
                <Input 
                  value={uploadForm.external_url}
                  onChange={(e) => setUploadForm({ ...uploadForm, external_url: e.target.value })}
                  placeholder="https://docs.google.com/spreadsheets/..."
                  className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)} className="rounded-xl font-bold text-xs h-11 px-5">
                Cancel
              </Button>
              <Button type="submit" disabled={addMaterialMutation.isPending} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-11 px-6 shadow-md shadow-indigo-600/10">
                {addMaterialMutation.isPending ? "Uploading..." : "Upload Material"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Edit / Replace Material ── */}
      <Dialog open={!!materialToEdit} onOpenChange={(open) => { if (!open) setMaterialToEdit(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 rounded-3xl border-slate-200/60 dark:border-white/10 p-6 custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Edit Learning Material</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-400">Update metadata details or replace the underlying file asset.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material Title *</label>
              <Input 
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
              <Input 
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Explain what this document covers"
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tags</label>
              <Input 
                value={editForm.tags}
                onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                placeholder="excel, pivot-tables, guide"
                className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
              />
            </div>

            {is_admin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Approval Status</label>
                <Select 
                  value={String(editForm.is_approved)}
                  onChange={(e) => setEditForm({ ...editForm, is_approved: e.target.value === "true" })}
                  className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
                >
                  <option value="true">Approved (Visible to all)</option>
                  <option value="false">Unapproved (Hidden from employees)</option>
                </Select>
              </div>
            )}

            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Replace File (Optional)</label>
                <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5 relative">
                  <Upload size={14} className="text-slate-400 ml-1 shrink-0" />
                  <input 
                    type="file" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setEditForm({ ...editForm, file });
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 font-semibold truncate max-w-[280px]">
                    {editForm.file ? editForm.file.name : "Choose new file to replace existing asset"}
                  </span>
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-slate-400 uppercase">OR</span>
                <div className="flex-grow border-t border-slate-200 dark:border-white/5"></div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Replace/Update Link</label>
                <Input 
                  value={editForm.external_url}
                  onChange={(e) => setEditForm({ ...editForm, external_url: e.target.value })}
                  placeholder="https://docs.google.com/..."
                  className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200/60 dark:border-white/5 font-semibold text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <Button type="button" variant="ghost" onClick={() => setMaterialToEdit(null)} className="rounded-xl font-bold text-xs h-11 px-5">
                Cancel
              </Button>
              <Button type="submit" disabled={updateMaterialMutation.isPending} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-11 px-6 shadow-md shadow-indigo-600/10">
                {updateMaterialMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Material Preview ── */}
      <Dialog open={!!previewMaterial} onOpenChange={(open) => { if (!open) setPreviewMaterial(null); }}>
        <DialogContent className="max-w-4xl bg-slate-950 rounded-3xl border-slate-800 p-6 flex flex-col h-[85vh]">
          {previewMaterial && (
            <>
              <DialogHeader className="shrink-0 pb-3 border-b border-slate-800">
                <DialogTitle className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <FileText className="text-indigo-400 w-5 h-5" />
                  {previewMaterial.title}
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-slate-500">
                  Previewing uploaded reference material asset.
                </DialogDescription>
              </DialogHeader>

              {/* View Previewer based on File Extension */}
              <div className="flex-1 min-h-0 bg-slate-900 rounded-2xl overflow-hidden mt-3 flex items-center justify-center relative">
                {previewMaterial.file_type?.toLowerCase() === "pdf" ? (
                  <embed 
                    src={getFileUrl(previewMaterial.file_path)} 
                    type="application/pdf" 
                    className="w-full h-full" 
                  />
                ) : ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(previewMaterial.file_type?.toLowerCase() || "") ? (
                  <img 
                    src={getFileUrl(previewMaterial.file_path)} 
                    alt={previewMaterial.title} 
                    className="max-w-full max-h-full object-contain" 
                  />
                ) : ["mp4"].includes(previewMaterial.file_type?.toLowerCase() || "") ? (
                  <video 
                    src={getFileUrl(previewMaterial.file_path)} 
                    controls 
                    autoPlay
                    className="w-full h-full object-contain" 
                  />
                ) : (
                  <div className="text-center p-8 space-y-4">
                    <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Preview Not Available</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">This file format ({previewMaterial.file_type}) does not support browser streaming previews.</p>
                    </div>
                    <Button onClick={() => handleDownload(previewMaterial)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-5 flex items-center gap-2 mx-auto">
                      <Download size={14} />
                      Download to View
                    </Button>
                  </div>
                )}
              </div>

              <div className="shrink-0 pt-4 flex justify-end gap-3 border-t border-slate-800 mt-4">
                {previewMaterial.file_path && (
                  <Button onClick={() => handleDownload(previewMaterial)} className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs h-10 px-5 flex items-center gap-1.5">
                    <Download size={14} />
                    Download File
                  </Button>
                )}
                <Button onClick={() => setPreviewMaterial(null)} className="rounded-xl font-bold text-xs h-10 px-5 bg-indigo-600 text-white">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialog for Material Delete ── */}
      <ConfirmationDialog
        open={!!materialToDelete}
        onOpenChange={(open) => { if (!open) setMaterialToDelete(null); }}
        title="Delete Reference Material?"
        description="Are you sure you want to permanently delete this material? This will delete the file upload and metadata. This action is irreversible."
        confirmText="Confirm Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (materialToDelete) deleteMaterialMutation.mutate(materialToDelete);
        }}
      />

    </div>
  );
}
