import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { FormAlert } from "@/components/FormAlert";
import { ApiError, invitationApi } from "@/lib/api/client";
import { toast } from "@/lib/notify";

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (search: Record<string, unknown>) => ({
    invite_token: typeof search.invite_token === "string" ? search.invite_token : "",
  }),
  head: () => ({
    meta: [
      { title: "Accept invitation · MiqorAI Management" },
      { name: "description", content: "Finish creating your MiqorAI Management account." },
    ],
  }),
  component: AcceptInvitePage,
});

const inputClass =
  "mt-1.5 w-full h-11 rounded-md border border-border bg-card/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary";

function AcceptInvitePage() {
  const { invite_token: token } = Route.useSearch();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    data: invite,
    isLoading,
    error: inviteError,
  } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => invitationApi.info(token),
    enabled: !!token,
    retry: false,
  });

  const invalidInvite = !token || (inviteError instanceof ApiError && inviteError.status === 404);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await invitationApi.accept(token, { name: name.trim(), password });
      toast.success("Account created — sign in with your email and password");
      void navigate({ to: "/login" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("This invitation is invalid, expired, or already used.");
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not create your account. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6 sm:p-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center glow-primary">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">MiqorAI</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Management Console
            </div>
          </div>
        </div>

        {isLoading && token ? (
          <p className="text-sm text-muted-foreground">Checking your invitation…</p>
        ) : invalidInvite ? (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">Invitation not valid</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This invitation link is invalid, has expired, or was already used. Ask a platform
              administrator to send a new one.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-card/60 text-sm hover:bg-accent transition"
            >
              Back to sign in
            </Link>
          </>
        ) : inviteError ? (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">Something went wrong</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              We couldn't load your invitation. Please try again.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-card/60 text-sm hover:bg-accent transition"
            >
              Back to sign in
            </Link>
          </>
        ) : invite ? (
          <>
            <h2 className="text-2xl font-semibold tracking-tight">You're invited</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Finish creating your{" "}
              <span className="text-foreground font-medium capitalize">
                {(invite.staff_role ?? invite.role).replace(/_/g, " ")}
              </span>{" "}
              account
              {invite.organization_name ? (
                <>
                  {" "}
                  for{" "}
                  <span className="text-foreground font-medium">{invite.organization_name}</span>
                </>
              ) : null}
              .
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="invite-email"
                  className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Email
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={invite.email}
                  readOnly
                  disabled
                  className={`${inputClass} font-mono opacity-70`}
                />
              </div>
              <div>
                <label
                  htmlFor="invite-name"
                  className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Full name
                </label>
                <input
                  id="invite-name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="invite-password"
                  className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="invite-password"
                    type={show ? "text" : "password"}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Choose a password"
                    autoComplete="new-password"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    aria-label={show ? "Hide password" : "Show password"}
                    type="button"
                    onClick={() => setShow((current) => !current)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="invite-confirm"
                  className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Confirm password
                </label>
                <input
                  id="invite-confirm"
                  type={show ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Repeat the password"
                  autoComplete="new-password"
                  className={inputClass}
                />
              </div>

              {error ? <FormAlert>{error}</FormAlert> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-md bg-gradient-primary text-primary-foreground font-medium glow-primary hover:opacity-95 transition disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
