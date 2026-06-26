import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Patient portal error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md w-full rounded-lg border bg-card p-6 shadow-sm space-y-4 text-center">
            <h1 className="text-xl font-semibold text-destructive">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The patient portal hit an unexpected error. Try clearing saved login data and reload.
            </p>
            <p className="text-xs text-muted-foreground font-mono break-all">{this.state.error.message}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => {
                  localStorage.removeItem("miqorai-patient-auth");
                  localStorage.removeItem("miqorai-patient-tokens");
                  window.location.href = "/login";
                }}
              >
                Clear session & go to login
              </button>
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                onClick={() => window.location.reload()}
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
