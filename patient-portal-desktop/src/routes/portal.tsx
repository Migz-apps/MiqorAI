import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FiHome, FiFileText, FiShare2, FiUsers, FiUser, FiLogOut, FiMenu,
  FiMaximize2, FiPlus, FiTrash2, FiAlertTriangle, FiCalendar,
  FiActivity, FiDownload, FiEye, FiX, FiChevronRight, FiClock, FiShield,
} from "react-icons/fi";
import { useAuth } from "@/lib/auth";
import { patientApi, type AccessGrant, type AccessLogItem, type AccessRequest, type FamilyMember, type MedicalRecord, type PatientDashboard, type PatientSettings, type EmergencyContact } from "@/lib/api/patient";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { MESSAGES } from "@/lib/user-messages";

type Tab = "home" | "records" | "share" | "family" | "profile";

function formatRelative(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PortalPage() {
  const { isLoggedIn, user, logout, authReady } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<{ id: string; name: string; relationship?: string } | null>(null);

  useEffect(() => {
    if (authReady && !isLoggedIn) navigate("/login");
  }, [authReady, isLoggedIn, navigate]);

  if (!authReady || !isLoggedIn || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  const viewing = activeProfile ?? { id: user.id, name: user.name };

  const navItems = [
    { id: "home" as const, label: "Home", icon: FiHome },
    { id: "records" as const, label: "Medical Records", icon: FiFileText },
    { id: "share" as const, label: "Share Access", icon: FiShare2 },
    { id: "family" as const, label: "Family", icon: FiUsers },
    { id: "profile" as const, label: "Profile", icon: FiUser },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">M+</div>
            <span className="font-bold">MiqorAI</span>
          </Link>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><FiX /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => { setTab(n.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${tab === n.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
            >
              <n.icon size={18} /> {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button onClick={() => void handleLogout()} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-destructive/10 text-destructive">
            <FiLogOut size={18} /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-card border-b border-border px-4 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><FiMenu size={20} /></button>
            <div>
              <div className="text-xs text-muted-foreground">Viewing</div>
              <div className="font-semibold text-sm">
                {viewing.name}{activeProfile?.relationship ? ` (${activeProfile.relationship})` : ""}
              </div>
            </div>
            {activeProfile && (
              <button onClick={() => setActiveProfile(null)} className="ml-3 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground hover:bg-accent/80">
                Switch back to my profile
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary-light grid place-items-center font-semibold text-primary-dark">
              {user.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8 max-w-7xl">
          {tab === "home" && <HomeTab user={viewing} />}
          {tab === "records" && <RecordsTab />}
          {tab === "share" && <ShareTab />}
          {tab === "family" && <FamilyTab onSwitch={(p) => { setActiveProfile(p); setTab("home"); }} />}
          {tab === "profile" && <ProfileTab />}
        </main>
      </div>
    </div>
  );
}

function HomeTab({ user }: { user: { id: string; name: string } }) {
  const { toast } = useToast();
  const [dash, setDash] = useState<PatientDashboard | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [enlarge, setEnlarge] = useState(false);

  const loadRequests = () => {
    patientApi.accessRequests().then(setRequests).catch(() => setRequests([]));
  };

  useEffect(() => {
    Promise.all([patientApi.dashboard(), patientApi.qrCode()])
      .then(([d, q]) => { setDash(d); setQr(q.qr_code); })
      .catch(() => undefined);
    loadRequests();
    const timer = window.setInterval(loadRequests, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const respondToRequest = async (id: string, decision: "approve" | "deny") => {
    if (decision === "approve") {
      await patientApi.approveAccessRequest(id);
      toast("Access granted.");
    } else {
      await patientApi.denyAccessRequest(id);
      toast("Access denied.", "success");
    }
    setRequests((current) => current.filter((request) => request.id !== id));
  };

  const stats = dash?.quick_stats;
  const insight = dash?.health_insights?.summary ?? "Your health data is loading from the network.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's a quick snapshot of your health today.</p>
      </div>

      {requests.length > 0 && (
        <Card title="Access Requests">
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-lg border border-warning/40 bg-warning/10 p-4">
                <div className="font-semibold text-sm">QR scan access request</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {request.requester_name} from {request.hospital_name} ({request.hospital_code}) scanned your QR code and wants to view your medical record.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => void respondToRequest(request.id, "approve")}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark"
                  >
                    Grant access
                  </button>
                  <button
                    onClick={() => void respondToRequest(request.id, "deny")}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Deny
                  </button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Expires {new Date(request.expires_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-xl bg-card border border-border p-6 flex flex-col items-center">
          <div className="text-sm font-medium text-muted-foreground">Your medical QR</div>
          <div className="mt-4 rounded-xl bg-white p-4 border border-border min-h-[180px] grid place-items-center">
            {qr ? <img src={qr} alt="Medical QR code" className="w-[180px] h-[180px]" /> : <span className="text-xs text-muted-foreground">Loading…</span>}
          </div>
          <div className="mt-3 font-mono text-xs text-muted-foreground">{user.id}</div>
          <button onClick={() => setEnlarge(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
            <FiMaximize2 size={14} /> Enlarge QR
          </button>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            { label: "Conditions", value: stats?.conditions_count ?? 0, icon: FiActivity, tone: "bg-primary-light text-primary-dark" },
            { label: "Medications", value: stats?.active_prescriptions ?? 0, icon: FiFileText, tone: "bg-accent text-accent-foreground" },
            { label: "Allergies", value: stats?.allergies_count ?? 0, icon: FiAlertTriangle, tone: "bg-destructive/10 text-destructive" },
            { label: "Total visits", value: stats?.total_visits ?? 0, icon: FiCalendar, tone: "bg-success/15 text-success" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-card border border-border p-5">
              <div className={`h-10 w-10 rounded-lg grid place-items-center ${s.tone}`}><s.icon size={18} /></div>
              <div className="mt-4 text-3xl font-bold">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Upcoming Appointments">
          <ul className="divide-y divide-border">
            {(dash?.upcoming_appointments ?? []).length === 0 ? (
              <li className="py-3 text-sm text-muted-foreground">No upcoming appointments.</li>
            ) : dash?.upcoming_appointments.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{a.provider ?? a.department ?? "Appointment"} <span className="text-muted-foreground font-normal">· {a.hospital}</span></div>
                  <div className="text-xs text-muted-foreground mt-0.5"><FiClock className="inline mr-1" size={12} />{new Date(a.scheduled_at).toLocaleString()}</div>
                </div>
                <FiChevronRight className="text-muted-foreground" />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent Activity">
          <ul className="space-y-3">
            {(dash?.recent_activity ?? []).map((a) => (
              <li key={a.id} className="flex gap-3 items-start">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <div className="flex-1">
                  <div className="text-sm">{a.accessor} — {a.action}</div>
                  <div className="text-xs text-muted-foreground">{formatRelative(a.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Health Insights">
        <div className="rounded-lg bg-primary-light/50 border border-primary/20 p-4">
          <div className="text-xs font-medium text-primary-dark mb-2">AI SUMMARY</div>
          <p className="text-sm">{insight}</p>
        </div>
      </Card>

      <Modal open={enlarge} onClose={() => setEnlarge(false)} title="Your Medical QR" size="md">
        <div className="grid place-items-center">
          {qr && <img src={qr} alt="Medical QR code enlarged" className="rounded-xl border border-border max-w-[320px]" />}
          <div className="mt-4 font-mono text-sm">{user.id}</div>
        </div>
      </Modal>
    </div>
  );
}

function RecordsTab() {
  const [sub, setSub] = useState<"conditions" | "meds" | "allergies" | "labs" | "imm" | "proc">("conditions");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [labs, setLabs] = useState<unknown[]>([]);

  const typeMap = {
    conditions: "diagnosis",
    meds: "medication",
    allergies: "allergy",
    labs: "lab_result",
    imm: "immunization",
    proc: "procedure",
  } as const;

  useEffect(() => {
    if (sub === "labs") {
      patientApi.labs().then(setLabs).catch(() => setLabs([]));
      return;
    }
    if (sub === "allergies") {
      patientApi.allergies().then(setRecords).catch(() => setRecords([]));
      return;
    }
    patientApi.records(typeMap[sub]).then((r) => setRecords(r.items)).catch(() => setRecords([]));
  }, [sub]);

  const tabs = [
    { id: "conditions" as const, label: "Conditions" },
    { id: "meds" as const, label: "Medications" },
    { id: "allergies" as const, label: "Allergies" },
    { id: "labs" as const, label: "Lab Results" },
    { id: "imm" as const, label: "Immunizations" },
    { id: "proc" as const, label: "Procedures" },
  ];

  const data = (r: MedicalRecord) => r.data as Record<string, string>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Medical Records</h1>
        <p className="text-sm text-muted-foreground mt-1">A complete view of your health history.</p>
      </div>
      <div className="flex gap-2 flex-wrap border-b border-border">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${sub === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {sub === "allergies" ? (
        <div className="rounded-xl border-2 border-destructive bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-destructive font-semibold mb-3"><FiAlertTriangle /> ALLERGIES</div>
          <ul className="space-y-3">
            {records.map((a) => (
              <li key={a.id} className="rounded-lg bg-card border border-destructive/30 p-4">
                <div className="font-semibold">{data(a).name ?? data(a).substance ?? "Allergy"}</div>
                <div className="text-sm text-muted-foreground mt-1">{data(a).reaction ?? data(a).severity ?? ""}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : sub === "labs" ? (
        <Card title="Lab Results">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr><th className="py-2">Test</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {labs.map((l, i) => {
                  const row = l as { id?: string; testName?: string; orderedAt?: string; status?: string };
                  return (
                    <tr key={row.id ?? i} className="border-b border-border last:border-0">
                      <td className="py-3 font-medium">{row.testName ?? "Lab test"}</td>
                      <td className="text-muted-foreground">{row.orderedAt ? new Date(row.orderedAt).toLocaleDateString() : "—"}</td>
                      <td>{row.status ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title={tabs.find((t) => t.id === sub)?.label ?? "Records"}>
          <ul className="divide-y divide-border">
            {records.map((r) => (
              <li key={r.id} className="py-3">
                <div className="font-medium">{data(r).name ?? data(r).test ?? data(r).diagnosis ?? r.recordType}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{new Date(r.recordedAt).toLocaleDateString()}</div>
              </li>
            ))}
            {records.length === 0 && <li className="py-3 text-sm text-muted-foreground">No records in this category.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ShareTab() {
  const { toast } = useToast();
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [logs, setLogs] = useState<AccessLogItem[]>([]);

  useEffect(() => {
    Promise.all([patientApi.accessGrants(), patientApi.accessLogs()])
      .then(([g, l]) => { setGrants(g); setLogs(l.items); })
      .catch(() => undefined);
  }, []);

  const revoke = async (id: string) => {
    await patientApi.revokeAccessGrant(id).catch(() => undefined);
    setGrants((p) => p.filter((x) => x.id !== id));
    toast(MESSAGES.generic.revoked);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Share Access</h1>
        <p className="text-sm text-muted-foreground mt-1">Control who can see your records — and for how long.</p>
      </div>

      <Card title="Active Grants">
        {grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active grants.</p>
        ) : (
          <ul className="divide-y divide-border">
            {grants.map((g) => (
              <li key={g.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">{g.org} · {g.scope} · expires {new Date(g.expires_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => void revoke(g.id)} className="rounded-lg border border-destructive/30 text-destructive px-3 py-1.5 text-sm hover:bg-destructive/10">
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Access Log">
        <ul className="space-y-3">
          {logs.map((l) => (
            <li key={l.id} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-muted grid place-items-center text-xs"><FiEye /></div>
              <div className="flex-1">
                <div className="text-sm"><span className="font-medium">{l.accessor.email}</span> — {l.action}</div>
                <div className="text-xs text-muted-foreground">{formatRelative(l.createdAt)}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function FamilyTab({ onSwitch }: { onSwitch: (p: { id: string; name: string; relationship: string }) => void }) {
  const [family, setFamily] = useState<FamilyMember[]>([]);

  useEffect(() => {
    patientApi.family().then(setFamily).catch(() => setFamily([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Family</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage records for children, parents and dependents.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {family.map((f) => {
          const name = `${f.dependentPatient.firstName} ${f.dependentPatient.lastName}`;
          return (
            <div key={f.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary-light grid place-items-center font-semibold text-primary-dark">
                  {name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{name}</div>
                  <div className="text-xs text-muted-foreground">{f.relationship} · DOB {f.dependentPatient.dateOfBirth.slice(0, 10)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground">{f.accessLevel}</span>
                <button onClick={() => onSwitch({ id: f.dependentPatient.id, name, relationship: f.relationship })}
                  className="text-sm font-medium text-primary hover:text-primary-dark inline-flex items-center gap-1">
                  Switch to Profile <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {family.length === 0 && <p className="text-sm text-muted-foreground">No family members linked yet.</p>}
      </div>
    </div>
  );
}

function ProfileTab() {
  const { user, updateUser, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(user!);
  const [settings, setSettings] = useState<PatientSettings | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [recovery, setRecovery] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm(user);
    Promise.all([patientApi.settings(), patientApi.emergencyContacts()])
      .then(([s, c]) => { setSettings(s); setContacts(c); })
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (settings?.theme === "dark") document.documentElement.classList.add("dark");
    else if (settings?.theme === "light") document.documentElement.classList.remove("dark");
  }, [settings?.theme]);

  const saveProfile = async () => {
    const parts = form.name.trim().split(/\s+/);
    await patientApi.updateProfile({
      first_name: parts[0],
      last_name: parts.slice(1).join(" ") || parts[0],
      email: form.email,
      phone: form.phone,
      national_id: form.nationalId,
      insurance_id: form.insuranceId,
      date_of_birth: form.dob,
    }).catch(() => undefined);
    await updateUser(form);
    toast(MESSAGES.generic.saved);
  };

  const exportData = async () => {
    const res = await patientApi.exportData().catch(() => null);
    if (res?.download_url) window.open(res.download_url, "_blank");
    toast(MESSAGES.generic.exported);
  };

  const loadRecovery = async () => {
    const res = await patientApi.recoveryPhrase().catch(() => null);
    setRecovery((res as { recovery_phrase?: string })?.recovery_phrase ?? res?.phrase ?? null);
    setShowRecovery(true);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      <Card title="Personal Information">
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <TextField label="Date of birth" type="date" value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
          <TextField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <TextField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <TextField label="National ID" value={form.nationalId} onChange={(v) => setForm({ ...form, nationalId: v })} />
          <TextField label="Insurance ID" value={form.insuranceId} onChange={(v) => setForm({ ...form, insuranceId: v })} />
        </div>
        <button onClick={() => void saveProfile()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark">
          Save changes
        </button>
      </Card>

      <Card title="Security">
        <div className="space-y-4">
          <Toggle label="Biometric Login" desc="Use fingerprint or face ID" checked={settings?.biometric_enabled ?? false}
            onChange={(v) => void patientApi.updateSettings({ biometric_enabled: v }).then(setSettings)} />
          <Toggle label="Two-Factor Authentication" checked={settings?.two_factor_enabled ?? false}
            onChange={(v) => void patientApi.updateSettings({ two_factor_enabled: v }).then(setSettings)} />
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
            <div className="flex items-center gap-2 font-medium text-sm"><FiShield className="text-warning" /> Recovery Phrase</div>
            {showRecovery && recovery ? (
              <div className="mt-3 rounded bg-card border border-border p-3 font-mono text-xs">{recovery}</div>
            ) : (
              <button onClick={() => void loadRecovery()} className="mt-3 rounded-lg bg-warning/20 text-warning px-3 py-1.5 text-xs font-medium">Show recovery phrase</button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Emergency Contacts">
        <ul className="divide-y divide-border mb-4">
          {contacts.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{c.name} <span className="text-muted-foreground font-normal">· {c.relationship}</span></div>
                <div className="text-xs text-muted-foreground">{c.phone}</div>
              </div>
              <button onClick={() => void patientApi.deleteEmergencyContact(c.id).then(() => setContacts((p) => p.filter((x) => x.id !== c.id)))} aria-label="Remove">
                <FiTrash2 className="text-muted-foreground hover:text-destructive" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Data Management">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => void exportData()} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
            <FiDownload size={14} /> Export My Data
          </button>
          <button onClick={() => setDelOpen(true)} className="rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm hover:opacity-90">
            Delete My Account
          </button>
        </div>
      </Card>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete account?" size="sm">
        <p className="text-sm text-muted-foreground">This will permanently delete your account and all medical records.</p>
        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={() => setDelOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => void patientApi.deleteAccount().then(async () => { await logout(); navigate("/"); })} className="rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm">
            Yes, delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-card border border-border p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <button onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
