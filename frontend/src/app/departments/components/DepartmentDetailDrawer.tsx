import { useQuery } from "@tanstack/react-query";
import { 
  Building2, 
  Users, 
  Clock, 
  UserCircle,
  BarChart3,
  Edit2
} from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { departmentsService } from "@/services/departments.service";
import type { Department } from "@/types";

// A simple mock chart implementation for demonstration purposes
// In a real app, use recharts or similar library
const SimpleBarChart = ({ data }: { data: any[] }) => {
  const max = Math.max(...data.map(d => d.training_hours), 1);
  return (
    <div className="flex h-48 items-end gap-2 w-full justify-between mt-4 border-b border-border/50 pb-2">
      {data.map((d, i) => {
        const height = `${(d.training_hours / max) * 100}%`;
        return (
          <div key={i} className="flex flex-col items-center gap-2 group w-full relative">
            <div 
              className="w-full max-w-[40px] bg-primary/80 rounded-t-sm transition-all duration-300 group-hover:bg-primary"
              style={{ height: d.training_hours > 0 ? height : '4px' }}
            >
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap">
                {d.training_hours} hrs
              </div>
            </div>
            <span className="text-xs text-muted-foreground rotate-[-45deg] origin-top-left mt-2">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
};

interface DepartmentDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
  onEdit: (dept: Department) => void;
}

export function DepartmentDetailDrawer({ open, onOpenChange, department, onEdit }: DepartmentDetailDrawerProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["department-analytics", department?.id],
    queryFn: () => departmentsService.getAnalytics(department!.id),
    select: (res) => res.data.data,
    enabled: open && !!department,
  });

  if (!department) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="flex flex-row items-start justify-between space-y-0 pb-6 border-b border-border/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Building2 size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <SheetTitle className="text-2xl">{department.name}</SheetTitle>
                <Badge variant="outline" className="font-mono">{department.code}</Badge>
              </div>
              <SheetDescription>
                Department Details and Analytics
              </SheetDescription>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => onEdit(department)}>
            <Edit2 size={16} />
          </Button>
        </SheetHeader>

        <div className="mt-8 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Employee Count"
              value={department.employee_count ?? 0}
              icon={Users}
              variant="default"
              delay={0.1}
            />
            <StatCard
              title="Total Training Hours"
              value={department.total_training_hours ?? 0}
              icon={Clock}
              variant="indigo"
              delay={0.2}
            />
          </div>

          {/* Department Information */}
          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm space-y-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Building2 size={18} className="text-muted-foreground" />
              Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <span className="text-sm font-medium text-muted-foreground block mb-1">Description</span>
                <p className="text-sm text-foreground">
                  {department.description || "No description provided."}
                </p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-muted-foreground block mb-1">Department Head</span>
                <div className="flex items-center gap-2 mt-1">
                  <UserCircle className="text-muted-foreground" size={20} />
                  <span className="text-sm text-foreground">
                    {department.head_id ? "Assigned (ID: " + department.head_id.substring(0, 8) + "...)" : "Not Assigned"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Chart */}
          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BarChart3 size={18} className="text-muted-foreground" />
                Training Hours (Last 6 Months)
              </h3>
            </div>
            
            {isLoading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Loading analytics...
              </div>
            ) : analytics && analytics.length > 0 ? (
              <div className="pt-4 pb-8 px-2">
                <SimpleBarChart data={analytics} />
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No analytics data available.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
