import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/MiqorAI/StatusBadge";
import {
  AlertTriangle, ArrowLeft, ShieldCheck, Package, CheckCircle2, PauseCircle,
  XCircle, Printer, User, Stethoscope, Pill, Phone, FileText, Bell,
} from "lucide-react";
import { useAuth, can } from "@/store/auth";
import { toast } from "@/lib/notify";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  dispenseRx,
  holdRx,
  loadInventory,
  loadPrescription,
  pharmacyKeys,
  readyRx,
  rejectRx,
  verifyRx,
} from "@/store/rx";
import { syncKeys } from "@/store/sync";

export default function PrescriptionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const session = useAuth((s) => s.session)!;

  const [holdReason, setHoldReason] = useState("Need clarification from doctor");
  const [holdNote, setHoldNote] = useState("");
  const [rejectReason, setRejectReason] = useState("Drug contraindicated");
  const [rejectNote, setRejectNote] = useState("");

  const { data: rx, isLoading } = useQuery({
    queryKey: pharmacyKeys.prescription(id!),
    queryFn: () => loadPrescription(id!),
    enabled: !!id,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: pharmacyKeys.inventory(),
    queryFn: loadInventory,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescription(id!) });
    queryClient.invalidateQueries({ queryKey: pharmacyKeys.prescriptions() });
    queryClient.invalidateQueries({ queryKey: pharmacyKeys.inventory() });
    queryClient.invalidateQueries({ queryKey: pharmacyKeys.billing() });
    queryClient.invalidateQueries({ queryKey: syncKeys.queue() });
  };

  const actionMutation = useMutation({
    mutationFn: async (action: "verify" | "ready" | "hold" | "reject" | "dispense") => {
      if (!rx) return;
      if (action === "verify") await verifyRx(rx.id);
      if (action === "ready") await readyRx(rx.id);
      if (action === "hold") await holdRx(rx.id, holdReason, holdNote);
      if (action === "reject") await rejectRx(rx.id, rejectReason, rejectNote);
      if (action === "dispense") {
        await dispenseRx(
          rx.id,
          session.staffId,
          rx.items.map((it) => ({ drug_id: it.drugId, quantity: it.quantity })),
        );
      }
    },
    onSuccess: (_data, action) => {
      invalidate();
      const messages = {
        verify: ["Prescription verified", "Clinical check passed."],
        ready: ["Marked as ready", "Package prepared for pickup."],
        hold: ["On hold", holdReason],
        reject: ["Prescription rejected", rejectReason],
        dispense: ["Dispensed", "Stock updated and patient notified."],
      } as const;
      const [title, description] = messages[action];
      if (action === "hold") toast.warning(title, { description });
      else if (action === "reject") toast.error(title, { description });
      else toast.success(title, { description });
    },
    onError: () => toast.error("Action failed"),
  });

  const interactions = useMemo(() => {
    if (!rx) return [];
    return [];
  }, [rx]);

  if (isLoading) return <div className="p-lg text-sm text-text-secondary">Loading prescription…</div>;

  if (!rx) {
    return (
      <div className="max-w-2xl mx-auto p-lg text-center">
        <p className="text-sm text-text-secondary">Prescription not found.</p>
        <Button className="mt-md" onClick={() => nav("/prescriptions")}>Back to queue</Button>
      </div>
    );
  }

  const stockOk = rx.items.every((it) => {
    const s = inventory.find((i) => i.id === it.drugId);
    return s && s.stock >= it.quantity;
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-md">
      <div className="flex items-center justify-between gap-md">
        <Link to="/prescriptions" className="inline-flex items-center gap-sm text-sm text-text-secondary hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to queue
        </Link>
        <div className="flex items-center gap-sm">
          <StatusBadge status={rx.status} />
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Label</Button>
        </div>
      </div>

      {rx.allergies.length > 0 && (
        <div className="rounded-lg border border-error/40 bg-error/10 p-md flex items-start gap-md">
          <AlertTriangle className="h-6 w-6 text-error shrink-0" />
          <div>
            <div className="font-semibold text-error">ALLERGY ALERT</div>
            <div className="text-sm text-foreground">
              Patient is allergic to: <strong>{rx.allergies.join(", ")}</strong>. Verify each item before dispensing.
            </div>
          </div>
        </div>
      )}

      {interactions.length > 0 && (
        <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-md flex items-start gap-md">
          <AlertTriangle className="h-6 w-6 text-secondary shrink-0" />
          <div>
            <div className="font-semibold text-secondary">Potential drug interaction</div>
            <ul className="text-sm list-disc pl-5">{interactions.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-sm">
            <CardTitle className="h3 flex items-center gap-sm"><Pill className="h-5 w-5 text-pharmacy" /> Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {rx.items.map((it) => {
                const stock = inventory.find((s) => s.id === it.drugId);
                const enough = stock && stock.stock >= it.quantity;
                return (
                  <div key={it.drugId} className="p-md grid grid-cols-12 gap-md items-center">
                    <div className="col-span-12 md:col-span-5">
                      <div className="font-medium">{it.name} <span className="text-text-secondary text-sm">{it.strength} · {it.form}</span></div>
                      <div className="text-xs text-text-secondary">{it.dose} · {it.durationDays} day(s)</div>
                    </div>
                    <div className="col-span-4 md:col-span-2 text-sm">Qty <strong>{it.quantity}</strong></div>
                    <div className="col-span-4 md:col-span-2 text-sm">KES {it.unitPrice * it.quantity}</div>
                    <div className="col-span-4 md:col-span-3 text-right">
                      {enough ? (
                        <Badge variant="outline" className="border-success/30 text-success bg-success/10">Stock {stock!.stock}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-error/30 text-error bg-error/10">
                          {stock ? `Only ${stock.stock}` : "Not stocked"}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="px-md py-sm flex justify-between items-center bg-background-grey">
                <div className="text-xs text-text-secondary">{rx.insurance ? `Insurance: ${rx.insurance.provider} · ${rx.insurance.member}` : "Cash payment"}</div>
                <div className="text-base font-semibold">Total: KES {rx.total.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-md">
          <Card>
            <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><User className="h-4 w-4" /> Patient</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>{rx.patientName}</strong> · age {rx.patientAge}</div>
              <div className="text-text-secondary flex items-center gap-1"><Phone className="h-3 w-3" /> {rx.patientPhone}</div>
              <div className="text-text-secondary">{rx.patientId}</div>
              <Link to={`/patients/${rx.patientId}`} className="text-pharmacy text-xs hover:underline">View patient profile →</Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><Stethoscope className="h-4 w-4" /> Prescriber</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>{rx.doctorName}</div>
              <div className="text-text-secondary">{rx.hospital}</div>
              <div className="text-xs text-text-secondary">Issued {new Date(rx.issuedAt).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><FileText className="h-4 w-4" /> Diagnosis & notes</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div><strong>{rx.diagnosis}</strong></div>
              {rx.notes && <div className="text-text-secondary whitespace-pre-line">{rx.notes}</div>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="sticky bottom-0 z-10 shadow-lg">
        <CardContent className="p-md flex flex-wrap items-center justify-between gap-md">
          <div className="text-xs text-text-secondary">
            {stockOk ? "All items in stock." : <span className="text-error">Stock is low for some items, but dispensing is still available for testing.</span>}
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-sm"><PauseCircle className="h-4 w-4" /> Hold</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Hold prescription</DialogTitle></DialogHeader>
                <div className="space-y-md">
                  <Select value={holdReason} onValueChange={setHoldReason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Need clarification from doctor">Need clarification from doctor</SelectItem>
                      <SelectItem value="Out of stock (expected 2-3 days)">Out of stock (expected 2-3 days)</SelectItem>
                      <SelectItem value="Insurance verification pending">Insurance verification pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea value={holdNote} onChange={(e) => setHoldNote(e.target.value)} placeholder="Additional notes for the doctor or patient…" />
                </div>
                <DialogFooter>
                  <Button onClick={() => actionMutation.mutate("hold")} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    <Bell className="h-4 w-4 mr-2" /> Place on hold + notify doctor
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {can(session.role, "override") && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-sm border-error/40 text-error hover:bg-error/10">
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Reject prescription</DialogTitle></DialogHeader>
                  <div className="space-y-md">
                    <Select value={rejectReason} onValueChange={setRejectReason}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Drug contraindicated">Drug contraindicated</SelectItem>
                        <SelectItem value="Allergy risk">Allergy risk</SelectItem>
                        <SelectItem value="Invalid prescription">Invalid prescription</SelectItem>
                        <SelectItem value="Expired prescription">Expired prescription</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Explanation for patient and doctor…" />
                  </div>
                  <DialogFooter>
                    <Button onClick={() => actionMutation.mutate("reject")} variant="destructive">Reject prescription</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {rx.status === "pending" && can(session.role, "verify") && (
              <Button onClick={() => actionMutation.mutate("verify")} variant="outline" className="gap-sm border-info/40 text-info hover:bg-info/10">
                <ShieldCheck className="h-4 w-4" /> Verify
              </Button>
            )}
            {(rx.status === "verified" || rx.status === "pending") && can(session.role, "prepare") && (
              <Button onClick={() => actionMutation.mutate("ready")} variant="outline" className="gap-sm border-pharmacy/40 text-pharmacy hover:bg-pharmacy/10">
                <Package className="h-4 w-4" /> Mark ready
              </Button>
            )}
            {(rx.status === "ready" || rx.status === "verified") && can(session.role, "dispense") && (
              <Button onClick={() => actionMutation.mutate("dispense")} className="gap-sm bg-success hover:bg-success/90 text-success-foreground">
                <CheckCircle2 className="h-4 w-4" /> Dispense
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
