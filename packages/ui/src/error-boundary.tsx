import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "./button";

type Props = {
  children: ReactNode;
  /** Shown in the message and the console log, e.g. "hospital portal". */
  appName: string;
  /** localStorage keys holding the persisted session, cleared before going to login. */
  storageKeys?: string[];
  /** Ends the server (cookie) session so the next load does not restore it. */
  onSignOut?: () => Promise<unknown>;
  /** Where "Clear session" sends the user. Defaults to "/login". */
  loginHref?: string;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`MiqorAI ${this.props.appName} error:`, error, info);
  }

  private clearSession = () => {
    const { storageKeys = [], onSignOut, loginHref = "/login" } = this.props;
    for (const key of storageKeys) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Storage may be unavailable (private mode); the redirect still happens.
      }
    }
    const go = () => {
      window.location.href = loginHref;
    };
    if (onSignOut) void onSignOut().catch(() => undefined).finally(go);
    else go();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div
          role="alert"
          className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center shadow-sm"
        >
          <h1 className="text-xl font-semibold text-destructive">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The {this.props.appName} hit an unexpected error. Try clearing saved login data and
            reload.
          </p>
          <p className="break-all font-mono text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={this.clearSession}>Clear session &amp; go to login</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
