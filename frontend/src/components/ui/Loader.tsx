import { cn } from "@/lib/utils";

type LoaderSize = "xs" | "sm" | "md" | "lg";

const sizes: Record<LoaderSize, string> = {
  xs: "w-3 h-3 border",
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-[3px]",
};

interface LoaderProps {
  size?: LoaderSize;
  className?: string;
  fullPage?: boolean;
}

export function Loader({ size = "md", className, fullPage }: LoaderProps) {
  const spinner = (
    <div
      className={cn(
        "rounded-full border-brand-200 dark:border-brand-900 border-t-brand-600 dark:border-t-brand-400 animate-spin",
        sizes[size],
        className
      )}
    />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        {spinner}
      </div>
    );
  }

  return spinner;
}
