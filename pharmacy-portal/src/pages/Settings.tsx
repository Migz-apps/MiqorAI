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

  useEffect(() => {
    if (!settings) return;
    setName(String(settings.name ?? session.pharmacyName));
    setPhone(String(settings.phone ?? ""));
    setAddress(String(settings.address ?? ""));
  }, [settings, session.pharmacyName]);

  const saveMutation = useMutation({
    mutationFn: () => pharmacyApi.updateSettings({ name, phone, address }),
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
            "Alert when stock falls below minimum",
            "Alert when medication expires within 90 days",
            "SMS patient on dispense",
            "SMS patient when refill is due (adherence)",
          ].map((r) => (
            <div key={r} className="flex items-center justify-between">
              <div className="text-sm">{r}</div>
              <Switch defaultChecked />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
