import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Hospital portal error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-grey p-lg">
          <div className="max-w-md w-full rounded-lg border bg-background p-lg shadow-sm space-y-md text-center">
            <h1 className="h2 text-error">Something went wrong</h1>
            <p className="text-sm text-text-secondary">
              The hospital portal hit an unexpected error. Try clearing saved login data and reload.
            </p>
            <p className="text-xs text-text-secondary font-mono break-all">{this.state.error.message}</p>
            <div className="flex flex-col gap-sm">
              <Button
                onClick={() => {
                  localStorage.removeItem("MiqorAI-auth");
                  localStorage.removeItem("MiqorAI-hospital-auth-v2");
                  localStorage.removeItem("miqorai-hospital-tokens");
                  localStorage.removeItem("miqorai-hospital-tokens-v2");
                  window.location.href = "/login";
                }}
              >
                Clear session & go to login
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload page
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
