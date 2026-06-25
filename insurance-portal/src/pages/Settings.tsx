import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Key, Globe, Bell, Lock, Copy } from "lucide-react";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { useAuth } from "@/store/auth";
import { insurerApi, insurerKeys } from "@/lib/api/insurer";
import { toast } from "@/lib/notify";

type SettingsShape = {
  country?: string;
  currency?: string;
  mfa_required?: boolean;
  ip_whitelist?: boolean;
  session_timeout?: boolean;
  watermark_exports?: boolean;
  notify_adherence?: boolean;
  notify_fraud?: boolean;
  notify_monthly_report?: boolean;
  notify_weekly_digest?: boolean;
};

export default function Settings() {
  const session = useAuth(s => s.session)!;
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: insurerKeys.settings,
    queryFn: insurerApi.settings,
  });

  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: insurerKeys.apiKeys,
    queryFn: insurerApi.apiKeys,
  });

  const s = (settings ?? {}) as SettingsShape;
  const primaryKey = apiKeys?.[0];

  const updateSettings = useMutation({
    mutationFn: (patch: Record<string, unknown>) => insurerApi.updateSettings(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: insurerKeys.settings });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Could not save settings"),
  });

  const rotateKey = useMutation({
    mutationFn: (id: string) => insurerApi.rotateApiKey(id),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: insurerKeys.apiKeys });
      if ("api_key" in res && res.api_key) {
        void navigator.clipboard.writeText(res.api_key as string);
        toast.success("API key rotated and copied to clipboard");
      } else {
        toast.success("API key rotated");
      }
    },
    onError: () => toast.error("Could not rotate API key"),
  });

  const toggle = (key: string, value: boolean) => {
    updateSettings.mutate({ [key]: value });
  };

  const copyPrefix = () => {
    if (primaryKey?.key_prefix) {
      void navigator.clipboard.writeText(primaryKey.key_prefix);
      toast.success("Key prefix copied");
    }
  };

  if (settingsLoading || keysLoading) {
    return (
      <div className="space-y-lg max-w-[1100px] mx-auto">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

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
            <Input defaultValue={session.insurerName} readOnly />
          </div>
          <div className="space-y-xs">
            <Label>Insurer code</Label>
            <Input defaultValue={session.insurerCode} className="font-mono" readOnly />
          </div>
          <div className="space-y-xs">
            <Label>Country</Label>
            <Input defaultValue={s.country ?? "Kenya"} readOnly />
          </div>
          <div className="space-y-xs">
            <Label>Reporting currency</Label>
            <Input defaultValue={s.currency ?? "KSh"} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><Lock className="h-4 w-4 text-insurer" /> Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          {[
            { k: "mfa_required", label: "Multi-factor authentication", d: "Required for executives, optional for analysts.", on: s.mfa_required ?? true },
            { k: "ip_whitelist", label: "IP whitelist", d: "Restrict access to your corporate IP range.", on: s.ip_whitelist ?? false },
            { k: "session_timeout", label: "Session timeout (4h)", d: "Auto sign-out after 4 hours of inactivity.", on: s.session_timeout ?? true },
            { k: "watermark_exports", label: "Watermark all exports", d: "Stamp PDFs and CSVs with insurer code + timestamp.", on: s.watermark_exports ?? true },
          ].map(item => (
            <div key={item.k} className="flex items-start justify-between gap-md py-1">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-[11px] text-text-secondary">{item.d}</div>
              </div>
              <Switch checked={item.on} onCheckedChange={(v) => toggle(item.k, v)} />
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
            <Input
              value={primaryKey ? `${primaryKey.key_prefix}••••••••••••` : "No API key configured"}
              readOnly
              className="font-mono"
            />
            <Button variant="outline" onClick={copyPrefix} className="gap-sm" disabled={!primaryKey}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
            <Button
              variant="outline"
              disabled={!primaryKey || rotateKey.isPending}
              onClick={() => primaryKey && rotateKey.mutate(primaryKey.id)}
            >
              Rotate
            </Button>
          </div>
          <p className="text-[11px] text-text-secondary">
            Use this key to pull savings, adherence and fraud data into your BI tools.
            Label: <span className="font-medium">{primaryKey?.label ?? "—"}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><Bell className="h-4 w-4 text-insurer" /> Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          {[
            { k: "notify_adherence", label: "Adherence alerts", d: "Email when a medication drops below threshold.", on: s.notify_adherence ?? true },
            { k: "notify_fraud", label: "Fraud anomalies", d: "Email on every High-risk flag.", on: s.notify_fraud ?? true },
            { k: "notify_monthly_report", label: "Monthly report ready", d: "Send PDF link to my inbox each month.", on: s.notify_monthly_report ?? true },
            { k: "notify_weekly_digest", label: "Weekly digest", d: "Friday morning summary of last 7 days.", on: s.notify_weekly_digest ?? false },
          ].map(item => (
            <div key={item.k} className="flex items-start justify-between gap-md py-1">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-[11px] text-text-secondary">{item.d}</div>
              </div>
              <Switch checked={item.on} onCheckedChange={(v) => toggle(item.k, v)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
