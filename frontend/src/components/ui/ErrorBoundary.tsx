import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "./Button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-12 min-h-[400px] bg-white dark:bg-slate-900 rounded-[32px] border border-red-100 dark:border-red-900/20 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md text-center mb-8 font-medium leading-relaxed">
            The component crashed while rendering. This is likely due to missing data or a runtime error.
            <br />
            <span className="text-[10px] font-mono opacity-50 mt-2 block">{this.state.error?.message}</span>
          </p>
          <Button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-xl h-11 px-6 gap-2 bg-slate-900 hover:bg-slate-800"
          >
            <RefreshCcw size={16} />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
