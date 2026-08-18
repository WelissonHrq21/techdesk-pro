import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "../components/ui/ErrorState";

type RouteLoadErrorBoundaryProps = {
  children: ReactNode;
};

type RouteLoadErrorBoundaryState = {
  hasError: boolean;
};

export class RouteLoadErrorBoundary extends Component<
  RouteLoadErrorBoundaryProps,
  RouteLoadErrorBoundaryState
> {
  state: RouteLoadErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Failed to load route", error, info);
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-slate-50 p-6">
          <ErrorState
            title="Não foi possível carregar esta tela."
            onRetry={this.handleRetry}
          />
        </main>
      );
    }

    return this.props.children;
  }
}
