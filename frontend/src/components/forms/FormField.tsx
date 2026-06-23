import { type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

// ── FormField wrapper ─────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}

export function FormField({ label, error, hint, required, children, className, htmlFor }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Base input styles ─────────────────────────────────────────────────────────

const inputBase =
  "w-full px-3 py-2.5 text-sm bg-background border rounded-lg text-foreground placeholder:text-muted-foreground " +
  "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all";

const inputVariant = (error?: boolean) =>
  error
    ? "border-destructive focus:ring-destructive"
    : "border-input hover:border-brand-300 dark:hover:border-brand-700";

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input 
        ref={ref}
        className={cn(inputBase, inputVariant(error), className)} 
        {...props} 
      />
    );
  }
);
Input.displayName = "Input";

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className, children, ...props }, ref) => {
    return (
      <select 
        ref={ref}
        className={cn(inputBase, inputVariant(error), className)} 
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

// ── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <textarea 
        ref={ref}
        className={cn(inputBase, inputVariant(error), "resize-none", className)} 
        {...props} 
      />
    );
  }
);
Textarea.displayName = "Textarea";
