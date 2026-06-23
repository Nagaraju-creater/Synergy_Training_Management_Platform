import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nominationsService } from "@/services/nominations.service";
import { trainingsService } from "@/services/trainings.service";
import { useAuthStore } from "@/store/authStore";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
  training_id: z.string().min(1, "Please select a training"),
  reason: z.string().min(10, "Please provide a detailed reason"),
});

type FormData = z.infer<typeof schema>;

export default function EmployeeNominationForm({ 
  onSuccess,
  preSelectedTrainingId
}: { 
  onSuccess?: () => void,
  preSelectedTrainingId?: string
}) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      training_id: preSelectedTrainingId || ""
    }
  });

  const { data: trainingsResp, isLoading: isLoadingTrainings } = useQuery({
    queryKey: ["active-trainings"],
    queryFn: () => trainingsService.list(1, 100, { 
      status: "scheduled",
    })
  });
  
  const trainings = trainingsResp?.data?.data || [];

  const mutation = useMutation({
    mutationFn: nominationsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nominations-my"] });
      toast("success", "Nomination Submitted", "Your request has been sent for review.");
      reset();
      onSuccess?.();
    },
    onError: (err: any) => {
      toast("error", "Submission Failed", err.response?.data?.message || "Something went wrong.");
    }
  });

  if (!user?.employee?.id) {
    return <div className="text-sm text-destructive">You must be linked to an employee profile to nominate.</div>;
  }

  return (
    <form 
      onSubmit={handleSubmit((data) => mutation.mutate({ 
        ...data, 
        employee_id: user.employee!.id 
      }))} 
      className="space-y-6"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Select Training</label>
          {isLoadingTrainings ? (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading trainings...</span>
            </div>
          ) : (
            <Select {...register("training_id")} error={!!errors.training_id}>
              <option value="">-- Select a training --</option>
              {trainings.map(t => (
                <option key={t.id} value={t.id}>{t.title} - {new Date(t.start_date || "").toLocaleDateString()}</option>
              ))}
            </Select>
          )}
          {errors.training_id && <p className="text-xs text-destructive">{errors.training_id.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Business Reason</label>
          <Textarea 
            {...register("reason")} 
            placeholder="How will this training benefit your current role or the organization?" 
            rows={4}
            error={!!errors.reason} 
          />
          {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" isLoading={mutation.isPending} className="w-full md:w-auto">
          Submit Nomination
        </Button>
      </div>
    </form>
  );
}
