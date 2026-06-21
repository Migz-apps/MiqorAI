import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Globe, Bell, Lock, Copy } from "lucide-react";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { useAuth } from "@/store/auth";
import { toast } from "@/lib/notify";

export default function Settings() {
  const session = useAuth(s => s.session)!;
  const apiKey = "mp_live_••••••••••••••••••3a9f";
  const copy = () => { toast.success("API key copied to clipboard"); };

  return (
    <div className="space-y-lg max-w-[1100px] mx-auto animate-fade-up">
      <PageHeader title="Settings" subtitle="Workspace, security, integrations, and notification preferences." />

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><Globe className="h-4 w-4 text-insurer" /> Insurer profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div className="space-y-xs">
            <Label>Insurer name</Label>
            <Input defaultValue={session.insurerName} />
          </div>
          <div className="space-y-xs">
            <Label>Insurer code</Label>
            <Input defaultValue={session.insurerCode} className="font-mono" readOnly />
          </div>
          <div className="space-y-xs">
            <Label>Country</Label>
            <Input defaultValue="Kenya" />
          </div>
          <div className="space-y-xs">
            <Label>Reporting currency</Label>
            <Input defaultValue="KSh" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><Lock className="h-4 w-4 text-insurer" /> Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          {[
            { k: "Multi-factor authentication", d: "Required for executives, optional for analysts.", on: true },
            { k: "IP whitelist",                d: "Restrict access to your corporate IP range.",      on: false },
            { k: "Session timeout (4h)",        d: "Auto sign-out after 4 hours of inactivity.",       on: true },
            { k: "Watermark all exports",       d: "Stamp PDFs and CSVs with insurer code + timestamp.", on: true },
          ].map(s => (
            <div key={s.k} className="flex items-start justify-between gap-md py-1">
              <div>
                <div className="text-sm font-medium">{s.k}</div>
                <div className="text-[11px] text-text-secondary">{s.d}</div>
              </div>
              <Switch defaultChecked={s.on} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm flex flex-row items-center justify-between">
          <CardTitle className="h3 flex items-center gap-sm"><Key className="h-4 w-4 text-insurer" /> API access</CardTitle>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">Live</Badge>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="flex items-center gap-sm">
            <Input value={apiKey} readOnly className="font-mono" />
            <Button variant="outline" onClick={copy} className="gap-sm"><Copy className="h-4 w-4" /> Copy</Button>
            <Button variant="outline">Rotate</Button>
          </div>
          <p className="text-[11px] text-text-secondary">
            Use this key to pull savings, adherence and fraud data into your BI tools. See the
            <a href="#" className="text-insurer hover:underline mx-1">API docs</a>
            for endpoints and rate limits.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><Bell className="h-4 w-4 text-insurer" /> Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          {[
            { k: "Adherence alerts",       d: "Email when a medication drops below threshold.", on: true },
            { k: "Fraud anomalies",        d: "Email on every High-risk flag.",                  on: true },
            { k: "Monthly report ready",   d: "Send PDF link to my inbox each month.",           on: true },
            { k: "Weekly digest",          d: "Friday morning summary of last 7 days.",          on: false },
          ].map(s => (
            <div key={s.k} className="flex items-start justify-between gap-md py-1">
              <div>
                <div className="text-sm font-medium">{s.k}</div>
                <div className="text-[11px] text-text-secondary">{s.d}</div>
              </div>
              <Switch defaultChecked={s.on} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
