import { useEffect, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { settingsService } from "@/services/settings.service";

export function AdminOnboardingSettings() {
  const [behavior, setBehavior] = useState("first_login_only");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const settings = await settingsService.getSettings();
        if (settings.onboarding_behavior) {
          setBehavior(settings.onboarding_behavior);
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setInitialLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await settingsService.updateSettings({ onboarding_behavior: behavior });
      toast("success", "Settings Updated", "Onboarding behavior has been successfully updated.");
    } catch (err) {
      toast("error", "Update Failed", "Could not save onboarding settings.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white dark:bg-[#172036] p-6 rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] mt-4"
    >
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
        <SettingsIcon size={14} className="text-brand-500" /> Onboarding Governance (Admin)
      </h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Welcome Flow Behavior</label>
          <Select 
            value={behavior} 
            onChange={(e) => setBehavior(e.target.value)}
            className="w-full font-medium"
          >
            <option value="first_login_only">Show on first login only</option>
            <option value="30_days">Show after 30 days inactivity</option>
            <option value="60_days">Show after 60 days inactivity</option>
            <option value="disabled">Disabled completely</option>
          </Select>
        </div>
        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            isLoading={loading}
            onClick={handleSave}
            className="h-9 px-6 rounded-lg bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20"
          >
            Save Setting
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
