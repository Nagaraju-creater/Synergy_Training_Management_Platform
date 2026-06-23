import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex max-h-screen w-full max-w-md flex-col gap-3 p-4",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

export type ToastVariant = "success" | "error" | "warning" | "info"

interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> {
  variant?: ToastVariant
  title?: string
  description?: string
}

const variantConfig: Record<ToastVariant, { icon: React.FC<{ className?: string }>, className: string, iconClass: string }> = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-500/50 bg-slate-900/90 text-emerald-50 shadow-emerald-500/20",
    iconClass: "text-emerald-400",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-500/50 bg-slate-900/90 text-red-50 shadow-red-500/20",
    iconClass: "text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-500/50 bg-slate-900/90 text-amber-50 shadow-amber-500/20",
    iconClass: "text-amber-400",
  },
  info: {
    icon: Info,
    className: "border-blue-500/50 bg-slate-900/90 text-blue-50 shadow-blue-500/20",
    iconClass: "text-blue-400",
  },
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(({ className, variant = "info", title, description, children, ...props }, ref) => {
  const config = variantConfig[variant]
  const Icon = config.icon
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        "group pointer-events-auto relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl",
        "transition-all duration-300 ease-out",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-75",
        "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-75",
        config.className,
        className,
      )}
      {...props}
    >
      <div className={cn("p-3 rounded-2xl bg-white/10 shrink-0 shadow-inner", config.iconClass)}>
        <Icon className="h-8 w-8" />
      </div>
      <div className="flex-1 space-y-1.5 py-1">
        {title && (
          <ToastPrimitives.Title className="text-lg font-black tracking-tight leading-none">
            {title}
          </ToastPrimitives.Title>
        )}
        {description && (
          <ToastPrimitives.Description className="text-sm opacity-80 font-semibold leading-normal">
            {description}
          </ToastPrimitives.Description>
        )}
        {children}
      </div>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = "Toast"

export { ToastProvider, ToastViewport, Toast }

// ── Toaster (mount once in App.tsx) ───────────────────────────────────────────

export interface ToastMessage {
  id: string
  variant: ToastVariant
  title: string
  description?: string
}

type ToastStore = {
  toasts: ToastMessage[]
  add: (msg: Omit<ToastMessage, "id">) => void
  remove: (id: string) => void
}

let _store: ToastStore | null = null

// Singleton store without React context so it can be called from anywhere
export function useToastStore(): ToastStore {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  const store = React.useMemo<ToastStore>(() => ({
    toasts,
    add: (msg) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { ...msg, id }])
    },
    remove: (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
  }), [toasts])

  React.useEffect(() => { _store = store }, [store])
  return store
}

export function toast(variant: ToastVariant, title: string, description?: string) {
  if (_store) _store.add({ variant, title, description })
}

export function Toaster() {
  const store = useToastStore()
  return (
    <ToastProvider swipeDirection="right" duration={2000}>
      {store.toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          title={t.title}
          description={t.description}
          onOpenChange={(open) => { if (!open) store.remove(t.id) }}
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
