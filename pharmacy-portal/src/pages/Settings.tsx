import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/store/auth";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { pharmacyKeys } from "@/store/rx";
import { toast } from "@/lib/notify";

export default function Settings() {
  const session = useAuth((s) => s.session)!;
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: pharmacyKeys.settings(),
    queryFn: () => pharmacyApi.settings(),
  });

  const [name, setName] = useState(session.pharmacyName);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notificationRules, setNotificationRules] = useState({
    lowStock: true,
    expiringSoon: true,
    smsOnDispense: true,
    smsOnRefillDue: true,
  });

  useEffect(() => {
    if (!settings) return;
    setName(String(settings.name ?? session.pharmacyName));
    setPhone(String(settings.phone ?? ""));
    setAddress(String(settings.address ?? ""));
    const rules = (settings.notification_rules ?? {}) as Record<string, unknown>;
    setNotificationRules({
      lowStock: rules.lowStock === undefined ? true : Boolean(rules.lowStock),
      expiringSoon: rules.expiringSoon === undefined ? true : Boolean(rules.expiringSoon),
      smsOnDispense: rules.smsOnDispense === undefined ? true : Boolean(rules.smsOnDispense),
      smsOnRefillDue: rules.smsOnRefillDue === undefined ? true : Boolean(rules.smsOnRefillDue),
    });
  }, [settings, session.pharmacyName]);

  const saveMutation = useMutation({
    mutationFn: () => pharmacyApi.updateSettings({
      name,
      phone,
      address,
      notification_rules: notificationRules,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.settings() });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-lg">
      <div>
        <h1 className="h1">Settings</h1>
        <p className="body text-text-secondary">Pharmacy profile, integrations, notification rules.</p>
      </div>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Pharmacy profile</CardTitle></CardHeader>
        <CardContent className="space-y-md">
          <div className="grid sm:grid-cols-2 gap-md">
            <div className="space-y-xs"><Label>Pharmacy name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-xs"><Label>Pharmacy code</Label><Input value={session.pharmacyCode} disabled /></div>
            <div className="space-y-xs"><Label>License #</Label><Input defaultValue={String(settings?.license_number ?? "")} readOnly /></div>
            <div className="space-y-xs"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <div className="space-y-xs"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <Button onClick={() => saveMutation.mutate()} className="bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground">Save changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Integrations</CardTitle></CardHeader>
        <CardContent className="space-y-md">
          {[
            { k: "Insurance billing API", s: "Connected" },
            { k: "Receipt printer (thermal)", s: "Connected" },
            { k: "Label printer (barcode)", s: "Disconnected" },
            { k: "SMS gateway (Twilio)", s: "Connected" },
          ].map((i) => (
            <div key={i.k} className="flex items-center justify-between border rounded-md p-sm">
              <div className="text-sm">{i.k}</div>
              <span className={i.s === "Connected" ? "text-xs text-success" : "text-xs text-text-secondary"}>{i.s}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Notification rules</CardTitle></CardHeader>
        <CardContent className="space-y-md">
          {[
            { key: "lowStock", label: "Alert when stock falls below minimum" },
            { key: "expiringSoon", label: "Alert when medication expires within 90 days" },
            { key: "smsOnDispense", label: "SMS patient on dispense" },
            { key: "smsOnRefillDue", label: "SMS patient when refill is due (adherence)" },
          ].map((rule) => (
            <div key={rule.key} className="flex items-center justify-between">
              <div className="text-sm">{rule.label}</div>
              <Switch
                checked={notificationRules[rule.key as keyof typeof notificationRules]}
                onCheckedChange={(checked) =>
                  setNotificationRules((current) => ({ ...current, [rule.key]: checked }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
