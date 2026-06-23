import re

with open('frontend/src/app/elearning/index.tsx', 'r') as f:
    content = f.read()

# 1. Add toggleBookmarkMutation and getQuickFilterCounts query
mutations_addition = """
  const { data: quickCounts } = useQuery({
    queryKey: ["learning-quick-counts"],
    queryFn: () => learningHubService.getQuickFilterCounts(),
    select: (res) => res.data.data,
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: learningHubService.toggleBookmark,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning-modules"] });
      qc.invalidateQueries({ queryKey: ["learning-quick-counts"] });
    },
    onError: () => {
      toast("error", "Error", "Failed to update bookmark.");
    }
  });

  const quickFiltersList = [
    { id: "my_modules", label: "My Modules", count: quickCounts?.my_modules ?? 0 },
    { id: "recent_uploads", label: "Recent Uploads", count: quickCounts?.recent_uploads ?? 0 },
    { id: "popular", label: "Popular", count: quickCounts?.popular ?? 0 },
    { id: "bookmarks", label: "Bookmarks", count: quickCounts?.bookmarks ?? 0 },
  ];
"""

if 'const toggleBookmarkMutation' not in content:
    content = content.replace('  // --- Mutations ---', '  // --- Mutations ---\n' + mutations_addition)

# 2. Add quickFilter state
if 'const [quickFilter, setQuickFilter] = useState<string | null>(null);' not in content:
    content = content.replace(
        'const [sortBy, setSortBy] = useState("recently_added");',
        'const [sortBy, setSortBy] = useState("recently_added");\n  const [quickFilter, setQuickFilter] = useState<string | null>(null);'
    )

# 3. Add quick_filter to filters
if 'quick_filter: quickFilter || undefined,' not in content:
    content = content.replace(
        'sort_by: sortBy,',
        'sort_by: sortBy,\n    quick_filter: quickFilter || undefined,'
    )

# 4. Replace static chips with dynamic chips
old_chips = """      <div className="sm:hidden -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
        {["My Modules", "Recent Uploads", "Popular", "Bookmarks"].map((item) => (
          <button key={item} className="h-8 shrink-0 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300">
            {item}
          </button>
        ))}
      </div>"""

new_chips = """      <div className="-mx-3 sm:mx-0 flex gap-2 overflow-x-auto px-3 sm:px-0 pb-1 sm:pb-2 sm:mb-4 [scrollbar-width:none] sticky top-[72px] sm:top-4 z-10 pt-2 sm:pt-0">
        {quickFiltersList.map((item) => (
          <button 
            key={item.id} 
            onClick={() => { setQuickFilter(quickFilter === item.id ? null : item.id); resetPage(); }}
            className={cn("h-8 sm:h-9 shrink-0 rounded-full border px-3 text-[11px] sm:text-xs font-black transition-all flex items-center gap-1.5 shadow-sm",
              quickFilter === item.id 
                ? "border-indigo-600 bg-indigo-600 text-white shadow-md scale-105"
                : "border-slate-200/80 bg-white/90 backdrop-blur-md text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            {item.label}
            <span className={cn("text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md", quickFilter === item.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}>
              {item.count}
            </span>
          </button>
        ))}
      </div>"""

if 'quickFiltersList.map(' not in content:
    content = content.replace(old_chips, new_chips)

# 5. Add bookmark button to module cards
old_admin_tools = """                {is_admin && (
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEditModule(mod); }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setModuleToDelete(mod.id); }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-500 hover:text-rose-700 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}"""

new_admin_tools = """                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleBookmarkMutation.mutate({ module_id: mod.id }); }}
                    className={cn("p-1.5 rounded-lg transition-colors border shadow-sm", mod.is_bookmarked ? "bg-amber-50 border-amber-200 text-amber-500 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 dark:bg-slate-900 dark:border-white/10 dark:hover:text-slate-300")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={mod.is_bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  </button>
                  {is_admin && (
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); startEditModule(mod); }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setModuleToDelete(mod.id); }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-500 hover:text-rose-700 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>"""

if '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"' not in content:
    content = content.replace(old_admin_tools, new_admin_tools)

# 6. Update empty state logic for filters
old_empty_state = """      ) : (
        <div className="text-center py-5 sm:py-16 px-4 bg-white dark:bg-slate-900/20 border border-slate-200/50 dark:border-white/5 rounded-2xl sm:rounded-[32px] flex flex-col items-center justify-center gap-1.5 sm:gap-3">
          <Zap className="hidden sm:block w-12 h-12 text-indigo-300" />
          <h3 className="text-sm sm:text-lg font-black text-slate-800 dark:text-white">No learning materials found.</h3>
          <p className="text-xs text-slate-400 max-w-sm">Try another filter.</p>
        </div>
      )}"""

new_empty_state = """      ) : (
        <div className="text-center py-5 sm:py-16 px-4 bg-white dark:bg-slate-900/20 border border-slate-200/50 dark:border-white/5 rounded-2xl sm:rounded-[32px] flex flex-col items-center justify-center gap-1.5 sm:gap-3">
          <Zap className="hidden sm:block w-12 h-12 text-indigo-300" />
          <h3 className="text-sm sm:text-lg font-black text-slate-800 dark:text-white">
            {quickFilter === "bookmarks" ? "No bookmarked learning resources yet." 
             : quickFilter === "my_modules" ? "You don't have any active modules yet."
             : quickFilter === "recent_uploads" ? "No recent uploads found."
             : "No learning materials found."}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">Try another filter or adjust your search criteria.</p>
        </div>
      )}"""

if 'No bookmarked learning resources yet.' not in content:
    content = content.replace(old_empty_state, new_empty_state)

with open('frontend/src/app/elearning/index.tsx', 'w') as f:
    f.write(content)
