import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "./Dialog";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-8 space-y-6">
          <DialogHeader className="flex flex-col items-center text-center space-y-4">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3",
              variant === "destructive" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : 
              variant === "warning" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : 
              "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
            )}>
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-black tracking-tight">{title}</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground leading-relaxed px-2">
                {description}
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:flex-1 h-12 text-base font-semibold rounded-xl transition-all hover:bg-secondary/80"
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant === "destructive" ? "destructive" : "brand"}
              onClick={onConfirm}
              className="w-full sm:flex-1 h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20"
              isLoading={isLoading}
            >
              {confirmText}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
