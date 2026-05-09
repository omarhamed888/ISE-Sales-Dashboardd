import { Component, type ErrorInfo, type ReactNode } from "react";
import { logRuntimeError } from "@/lib/services/runtime-logging-service";

type State = { hasError: boolean };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught error", error, info);
    void logRuntimeError({
      source: "ErrorBoundary",
      message: error.message,
      stack: error.stack,
      extra: { componentStack: info.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white border border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-600 font-bold">حدث خطأ في تحميل هذا القسم</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 bg-[#2563EB] text-white px-4 py-2 rounded-xl text-[12px] font-bold"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
