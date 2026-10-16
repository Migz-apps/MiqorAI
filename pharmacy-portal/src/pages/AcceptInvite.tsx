import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Pill, User, Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@miqorai/ui/button";
import { Input } from "@miqorai/ui/input";
import { Label } from "@miqorai/ui/label";
import { Badge } from "@miqorai/ui/badge";
import { FormAlert } from "@/components/shared/FormAlert";
import { AuthShell } from "@/components/auth/AuthShell";
import { ApiError, invitationApi } from "@/lib/api/client";
import { toast } from "@/lib/notify";

export default function AcceptInvite() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("invite_token") ?? "";

  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: invite, isLoading, error: inviteError } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => invitationApi.info(token),
    enabled: !!token,
    retry: false,
  });

  const invalidInvite =
    !token || (inviteError instanceof ApiError && inviteError.status === 404);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Enter your full name."); return; }
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    try {
      await invitationApi.accept(token, { name: name.trim(), password: pw });
      toast.success("Account created — sign in with your email and password");
      nav("/login");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (err instanceof ApiError && err.status === 404) {
        setError("This invitation is invalid, expired, or already used.");
      } else {
        setError(err instanceof ApiError ? err.message : "Could not create your account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="lg:hidden flex items-center gap-sm mb-lg">
        <div className="h-9 w-9 rounded-md bg-pharmacy flex items-center justify-center">
          <Pill className="h-5 w-5 text-pharmacy-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold">MiqorAI</div>
          <div className="text-[11px] text-text-secondary">Pharmacy Portal</div>
        </div>
      </div>

      {isLoading && token ? (
        <p className="body text-text-secondary">Checking your invitation…</p>
      ) : invalidInvite ? (
        <div className="space-y-md">
          <h1 className="h1">Invitation not valid</h1>
          <p className="body text-text-secondary">
            This invitation link is invalid, has expired, or was already used.
            Ask your pharmacy manager to send a new one.
          </p>
          <Button asChild variant="outline" className="h-11">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : inviteError ? (
        <div className="space-y-md">
          <h1 className="h1">Something went wrong</h1>
          <p className="body text-text-secondary">We couldn't load your invitation. Please try again.</p>
          <Button asChild variant="outline" className="h-11">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : invite ? (
        <>
          <div className="space-y-xs mb-md">
            <h1 className="h1">Join {invite.organization_name ?? "your pharmacy"}</h1>
            <p className="body text-text-secondary">
              You've been invited as{" "}
              <Badge variant="outline" className="capitalize align-middle">
                {(invite.staff_role ?? invite.role).replace(/_/g, " ")}
              </Badge>
              . Set your name and password to finish creating your account.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-md">
            <div className="space-y-xs">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input className="pl-9 h-11" value={invite.email} readOnly disabled />
              </div>
            </div>
            <div className="space-y-xs">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input id="name" className="pl-9 h-11" placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <div className="space-y-xs">
                <Label htmlFor="pw">Password</Label>
                <div className="relative">
                  <Input id="pw" type={showPw ? "text" : "password"} className="pr-10 h-11" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
                  <button aria-label={showPw ? "Hide password" : "Show password"} type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-xs">
                <Label htmlFor="pw2">Confirm</Label>
                <Input id="pw2" type={showPw ? "text" : "password"} className="h-11" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" />
              </div>
            </div>
            {error && <FormAlert>{error}</FormAlert>}
            <Button type="submit" disabled={submitting} className="w-full h-11 bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground">
              <CheckCircle2 className="h-4 w-4 mr-2" /> {submitting ? "Creating account…" : "Create account"}
            </Button>
            <div className="text-center text-sm text-text-secondary">
              Already have an account? <Link to="/login" className="text-pharmacy font-medium hover:underline">Sign in</Link>
            </div>
          </form>
        </>
      ) : null}
    </AuthShell>
  );
}
