import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useSync } from "@/store/sync";
import { toast } from "@/lib/notify";
import { MESSAGES } from "@/lib/user-messages";

export default function ManualRegister() {
  const nav = useNavigate();
  const enqueue = useSync(s => s.enqueue);
  const [form, setForm] = useState({
    name: "", phone: "", nationalId: "", insuranceId: "", dob: "",
    gender: "F", emergencyName: "", emergencyPhone: "", allergies: "",
  });
  const update = (k: keyof typeof form) => (e: any) => setForm(f => ({ ...f, [k]: typeof e === "string" ? e : e.target.value }));

  const required: (keyof typeof form)[] = ["name", "phone", "dob", "allergies"];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const labels: Record<string, string> = {
      name: "full name", phone: "phone", dob: "date of birth", allergies: "allergies",
    };
    const missing = required.filter(k => !form[k].trim());
    if (missing.length) {
      toast.error(MESSAGES.form.missingFields(missing.map(k => labels[k] ?? k)));
      return;
    }
    enqueue({ type: "registration", patientName: form.name });
    toast.success("Patient registered. Sticker queued for printing.");
    setTimeout(() => nav("/stickers"), 600);
  };

  return (
    <div className="max-w-[800px] mx-auto space-y-lg">
      <div>
        <h1 className="h1 flex items-center gap-sm"><UserPlus className="h-6 w-6 text-primary" /> Manual registration</h1>
        <p className="body text-text-secondary">For patients without a MiqorAI card. A QR sticker prints automatically.</p>
      </div>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Patient details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <Field label="Full name" required>
              <Input value={form.name} onChange={update("name")} placeholder="Grace Muthoni" />
            </Field>
            <Field label="Phone number" required hint="Must be unique">
              <Input value={form.phone} onChange={update("phone")} placeholder="+234 803 555 1241" />
            </Field>
            <Field label="National ID" hint="Optional">
              <Input value={form.nationalId} onChange={update("nationalId")} />
            </Field>
            <Field label="Insurance ID" hint="Will try to auto-fetch">
              <Input value={form.insuranceId} onChange={update("insuranceId")} />
            </Field>
            <Field label="Date of birth" required>
              <Input type="date" value={form.dob} onChange={update("dob")} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onValueChange={update("gender") as any}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Emergency contact name">
              <Input value={form.emergencyName} onChange={update("emergencyName")} />
            </Field>
            <Field label="Emergency contact phone">
              <Input value={form.emergencyPhone} onChange={update("emergencyPhone")} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Known allergies" required hint="Free text — comma-separated">
                <Textarea rows={2} value={form.allergies} onChange={update("allergies")} placeholder="Penicillin, peanuts" />
              </Field>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-sm pt-sm">
              <Button type="button" variant="outline" onClick={() => nav("/checkin")}>Cancel</Button>
              <Button type="submit" className="bg-[hsl(var(--reception-accent))] hover:bg-[hsl(var(--reception-accent))]/90 text-white">
                Create profile + print sticker
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const Field = ({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-xs">
    <Label className="flex items-center gap-1">
      {label}{required && <span className="text-error">*</span>}
      {hint && <span className="text-[10px] text-text-secondary font-normal">· {hint}</span>}
    </Label>
    {children}
  </div>
);
