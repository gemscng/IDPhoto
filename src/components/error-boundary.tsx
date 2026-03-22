"use client";

import { Component, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps & { errorTitle: string; errorMessage: string; retryLabel: string },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { errorTitle: string; errorMessage: string; retryLabel: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">{this.props.errorTitle}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {this.props.errorMessage}
          </p>
          <Button
            variant="outline"
            onClick={() => this.setState({ hasError: false })}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {this.props.retryLabel}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const t = useTranslations("errors");

  return (
    <ErrorBoundaryInner
      fallback={fallback}
      errorTitle={t("boundary")}
      errorMessage={t("boundaryMessage")}
      retryLabel={t("retry")}
    >
      {children}
    </ErrorBoundaryInner>
  );
}
