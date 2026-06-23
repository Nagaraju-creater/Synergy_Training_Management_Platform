import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/Sheet";
import { FormWrapper } from "@/components/ui/FormWrapper";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { departmentsService } from "@/services/departments.service";
import api from "@/lib/axios";
import type { Department, Employee, PaginatedResponse } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z.string().min(1, "Department code is required"),
  description: z.string().optional(),
  head_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface DepartmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
}

export function DepartmentDrawer({ open, onOpenChange, department }: DepartmentDrawerProps) {
  const qc = useQueryClient();
  const isEditing = !!department;

  // Fetch employees to assign as head
  const { data: employees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => api.get<PaginatedResponse<Employee>>("/employees/", { params: { per_page: 500 } }),
    select: (res) => res.data.data,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      if (department) {
        reset({
          name: department.name,
          code: department.code,
          description: department.description || "",
          head_id: department.head_id || "",
        });
      } else {
        reset({ name: "", code: "", description: "", head_id: "" });
      }
    }
  }, [open, department, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        head_id: data.head_id || null, // send null if empty
      };
      
      if (isEditing) {
        await departmentsService.update(department.id, payload);
        toast("success", "Department Updated", "Department details have been saved.");
      } else {
        await departmentsService.create(payload);
        toast("success", "Department Created", "A new department has been added.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      qc.invalidateQueries({ queryKey: ["departments-all"] });
      qc.invalidateQueries({ queryKey: ["analytics-summary"] });
      qc.invalidateQueries({ queryKey: ["analytics-charts"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.response?.data?.detail || "An unexpected error occurred.";
      toast("error", "Failed to save", typeof msg === 'string' ? msg : "Validation error");
    }
  });

  const onSubmit = (data: FormData) => mutation.mutate(data);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Department" : "Add New Department"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update department details." : "Create a new department in the organization."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <FormWrapper columns={1} className="py-2 gap-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department Name *</label>
              <Input {...register("name")} placeholder="Engineering" error={!!errors.name} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department Code *</label>
              <Input {...register("code")} placeholder="ENG" error={!!errors.code} disabled={isEditing} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
              <Input {...register("description")} placeholder="Software development and IT" error={!!errors.description} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department Head</label>
              <Select {...register("head_id")} error={!!errors.head_id}>
                <option value="">No Department Head</option>
                {employees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code})
                  </option>
                ))}
              </Select>
              {errors.head_id && <p className="text-xs text-destructive">{errors.head_id.message}</p>}
            </div>
          </FormWrapper>

          <SheetFooter className="pt-6 border-t border-border/50 mt-8 mb-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {isEditing ? "Save Changes" : "Create Department"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
