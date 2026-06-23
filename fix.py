import re

src = open('frontend/src/app/trainings/index.tsx', 'r', encoding='utf-8').read()
lines = src.splitlines()

clean_header = """            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2.5">
                <Button onClick={handleAddNew} className="h-10 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all font-bold text-xs text-white">
                  <Plus size={16} className="mr-2" /> 
                  New Program
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── KPI Grid ────────────────────────────────────────────────────── */}"""

clean_tabs = """        {isAdmin ? (
          <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 p-1 rounded-2xl w-fit border border-[#EEF2FF] dark:border-white/5 shadow-sm backdrop-blur-md">
            <button 
              onClick={() => setActiveTab("catalog")}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'catalog' 
                  ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <LayoutGrid size={14} /> Catalog
            </button>
            <button 
              onClick={() => setActiveTab("admin-nominate")}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'admin-nominate' 
                  ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <Target size={14} /> Direct Nominate
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-white/50 dark:bg-white/5 p-1 rounded-2xl w-fit border border-[#EEF2FF] dark:border-white/5 shadow-sm backdrop-blur-md">
            <button 
              onClick={() => setActiveTab("my")}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'my' 
                  ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <Sparkles size={14} /> My Progress
            </button>
            <button 
              onClick={() => setActiveTab("catalog")}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'catalog' 
                  ? "bg-white dark:bg-[#172036] shadow-md text-brand-600 dark:text-brand-400 ring-1 ring-slate-200 dark:ring-white/10" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              <LayoutGrid size={14} /> Discovery Catalog
            </button>
          </div>
        )}

        {activeTab === "my" && !isAdmin ? (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <MyEnrollments />
          </div>
        ) : activeTab === "admin-nominate" && isAdmin ? (
          <div className="animate-in slide-in-from-bottom-4 duration-500 mt-6">
             <AdminNominatePanel />
          </div>
        ) : (
          <div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)] transition-all duration-500 mt-6">"""

start_header = -1
for i, l in enumerate(lines):
    if '{isAdmin && (' in l and 'New Program' in '\n'.join(lines[i:i+5]):
        start_header = i
        break

start_kpi = -1
for i, l in enumerate(lines):
    if '{/* ── KPI Grid' in l:
        start_kpi = i
        break

start_tabs_actual = -1
for i in range(start_kpi, len(lines)):
    if 'bg-white/50 dark:bg-white/5 p-1 rounded-2xl' in lines[i]:
        start_tabs_actual = i - 1
        break

end_tabs = -1
for i in range(start_tabs_actual, len(lines)):
    if 'div className="bg-white dark:bg-[#172036] rounded-[24px] border border-[#EEF2FF] dark:border-white/5 shadow-[0_4px_20px_rgba(15,23,42,0.02)]' in lines[i]:
        end_tabs = i
        break

new_lines = lines[:start_header] + clean_header.splitlines() + lines[start_kpi:start_tabs_actual] + clean_tabs.splitlines() + lines[end_tabs+1:]

open('frontend/src/app/trainings/index.tsx', 'w', encoding='utf-8').write('\n'.join(new_lines))
print('Written successfully')
