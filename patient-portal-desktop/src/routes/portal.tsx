import { useNavigate, Link } from "react-router-dom";

type Tab = "home" | "records" | "share" | "family" | "profile";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  FiHome, FiFileText, FiShare2, FiUsers, FiUser, FiLogOut, FiMenu,
  FiMaximize2, FiPlus, FiTrash2, FiEdit2, FiAlertTriangle, FiCalendar,
  FiActivity, FiDownload, FiEye, FiX, FiChevronRight, FiCheck, FiClock, FiShield,
} from "react-icons/fi";
import { useAuth } from "@/lib/auth";
import {
  mockUser, mockConditions, mockMedications, mockAllergies, mockLabResults,
  mockImmunizations, mockProcedures, mockAppointments, mockActivity, mockGrants,
  mockAccessLog, mockFamily, mockEmergencyContacts, mockRecovery,
} from "@/lib/mockData";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";

export default function PortalPage() {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<{ id: string; name: string; relationship?: string } | null>(null);

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn || !user) return null;

  const viewing = activeProfile ?? { id: user.id, name: user.name };

  const navItems = [
    { id: "home" as const, label: "Home", icon: FiHome },
    { id: "records" as const, label: "Medical Records", icon: FiFileText },
    { id: "share" as const, label: "Share Access", icon: FiShare2 },
    { id: "family" as const, label: "Family", icon: FiUsers },
    { id: "profile" as const, label: "Profile", icon: FiUser },
  ];

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">M+</div>
            <span className="font-bold">MediPass</span>
          </Link>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><FiX /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => { setTab(n.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${tab === n.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                }`}
            >
              <n.icon size={18} /> {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-destructive/10 text-destructive"
          >
            <FiLogOut size={18} /> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
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
              <button
                onClick={() => setActiveProfile(null)}
                className="ml-3 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground hover:bg-accent/80"
              >
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

/* ============= HOME ============= */
function HomeTab({ user }: { user: { id: string; name: string } }) {
  const [tick, setTick] = useState(0);
  const [enlarge, setEnlarge] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const qrValue = useMemo(() => `MediPass:${user.id}:${Math.floor(Date.now() / 60000)}:${tick}`, [user.id, tick]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's a quick snapshot of your health today.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* QR card */}
        <div className="lg:col-span-1 rounded-xl bg-card border border-border p-6 flex flex-col items-center">
          <div className="text-sm font-medium text-muted-foreground">Your medical QR</div>
          <div className="mt-4 rounded-xl bg-white p-4 border border-border">
            <QRCodeSVG value={qrValue} size={180} level="M" />
          </div>
          <div className="mt-3 font-mono text-xs text-muted-foreground">{user.id}</div>
          <div className="mt-1 text-xs text-muted-foreground">Refreshes every 60s</div>
          <button onClick={() => setEnlarge(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
            <FiMaximize2 size={14} /> Enlarge QR
          </button>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            { label: "Conditions", value: mockConditions.length, icon: FiActivity, tone: "bg-primary-light text-primary-dark" },
            { label: "Medications", value: mockMedications.length, icon: FiFileText, tone: "bg-accent text-accent-foreground" },
            { label: "Allergies", value: mockAllergies.length, icon: FiAlertTriangle, tone: "bg-destructive/10 text-destructive" },
            { label: "Upcoming visits", value: mockAppointments.length, icon: FiCalendar, tone: "bg-success/15 text-success" },
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
            {mockAppointments.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{a.doctor} <span className="text-muted-foreground font-normal">· {a.specialty}</span></div>
                  <div className="text-xs text-muted-foreground mt-0.5"><FiClock className="inline mr-1" size={12} />{a.date} at {a.time}</div>
                </div>
                <FiChevronRight className="text-muted-foreground" />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent Activity">
          <ul className="space-y-3">
            {mockActivity.map((a) => (
              <li key={a.id} className="flex gap-3 items-start">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <div className="flex-1">
                  <div className="text-sm">{a.text}</div>
                  <div className="text-xs text-muted-foreground">{a.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Health Insights">
        <div className="rounded-lg bg-primary-light/50 border border-primary/20 p-4">
          <div className="text-xs font-medium text-primary-dark mb-2">AI SUMMARY</div>
          <p className="text-sm">
            Your last HbA1c (6.8%) is slightly above target. Consider scheduling a follow-up with Dr. Wanjiku.
            Blood pressure trend is stable. Don't forget your annual flu shot — due next month.
          </p>
        </div>
      </Card>

      <Modal open={enlarge} onClose={() => setEnlarge(false)} title="Your Medical QR" size="md">
        <div className="grid place-items-center">
          <div className="rounded-xl bg-white p-6 border border-border">
            <QRCodeSVG value={qrValue} size={320} level="M" />
          </div>
          <div className="mt-4 font-mono text-sm">{user.id}</div>
          <div className="text-xs text-muted-foreground mt-1">Show this to a provider to grant temporary access.</div>
        </div>
      </Modal>
    </div>
  );
}

/* ============= RECORDS ============= */
function RecordsTab() {
  const [sub, setSub] = useState<"conditions" | "meds" | "allergies" | "labs" | "imm" | "proc">("conditions");
  const tabs = [
    { id: "conditions" as const, label: "Conditions" },
    { id: "meds" as const, label: "Medications" },
    { id: "allergies" as const, label: "Allergies" },
    { id: "labs" as const, label: "Lab Results" },
    { id: "imm" as const, label: "Immunizations" },
    { id: "proc" as const, label: "Procedures" },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Medical Records</h1>
        <p className="text-sm text-muted-foreground mt-1">A complete view of your health history.</p>
      </div>
      <div className="flex gap-2 flex-wrap border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${sub === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "conditions" && (
        <Card title="Conditions">
          <ul className="divide-y divide-border">
            {mockConditions.map((c) => (
              <li key={c.id} className="py-3 flex justify-between items-start">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Since {c.since} · {c.notes}</div>
                </div>
                <span className="rounded-full bg-accent text-accent-foreground text-xs px-2 py-1">{c.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {sub === "meds" && (
        <Card title="Medications">
          <div className="grid sm:grid-cols-2 gap-3">
            {mockMedications.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-4">
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.dose} · {m.freq}</div>
                <div className="text-xs text-muted-foreground mt-1">Since {m.since}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {sub === "allergies" && (
        <div className="rounded-xl border-2 border-destructive bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-destructive font-semibold mb-3">
            <FiAlertTriangle /> ALLERGIES — CRITICAL
          </div>
          <ul className="space-y-3">
            {mockAllergies.map((a) => (
              <li key={a.id} className="rounded-lg bg-card border border-destructive/30 p-4">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{a.name}</div>
                  <span className="rounded-full bg-destructive text-destructive-foreground text-xs px-2 py-1">{a.severity}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">Reaction: {a.reaction}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sub === "labs" && (
        <Card title="Lab Results">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr><th className="py-2">Test</th><th>Date</th><th>Result</th></tr>
              </thead>
              <tbody>
                {mockLabResults.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="py-3 font-medium">{l.test}</td>
                    <td className="text-muted-foreground">{l.date}</td>
                    <td>
                      <span className={`rounded-full text-xs px-2 py-1 ${l.flag === "warn" ? "bg-warning/20 text-warning" : "bg-success/15 text-success"}`}>
                        {l.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {sub === "imm" && (
        <Card title="Immunizations">
          <ul className="divide-y divide-border">
            {mockImmunizations.map((i) => (
              <li key={i.id} className="py-3 flex justify-between"><span className="font-medium">{i.name}</span><span className="text-muted-foreground text-sm">{i.date}</span></li>
            ))}
          </ul>
        </Card>
      )}

      {sub === "proc" && (
        <Card title="Procedures">
          <ul className="divide-y divide-border">
            {mockProcedures.map((p) => (
              <li key={p.id} className="py-3">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.date} · {p.provider}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ============= SHARE ============= */
function ShareTab() {
  const { toast } = useToast();
  const [grants, setGrants] = useState(mockGrants);
  const [grantOpen, setGrantOpen] = useState(false);
  const [form, setForm] = useState({ name: "", org: "", scope: "Full Access", expires: "2026-07-01" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Share Access</h1>
          <p className="text-sm text-muted-foreground mt-1">Control who can see your records — and for how long.</p>
        </div>
        <button onClick={() => setGrantOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark">
          <FiPlus /> Grant new access
        </button>
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
                  <div className="text-xs text-muted-foreground">{g.org} · {g.scope} · expires {g.expires}</div>
                </div>
                <button
                  onClick={() => { setGrants((p) => p.filter((x) => x.id !== g.id)); toast("Access revoked"); }}
                  className="rounded-lg border border-destructive/30 text-destructive px-3 py-1.5 text-sm hover:bg-destructive/10"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Access Log">
        <ul className="space-y-3">
          {mockAccessLog.map((l) => (
            <li key={l.id} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-muted grid place-items-center text-xs"><FiEye /></div>
              <div className="flex-1">
                <div className="text-sm"><span className="font-medium">{l.who}</span> — {l.action}</div>
                <div className="text-xs text-muted-foreground">{l.time}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={grantOpen} onClose={() => setGrantOpen(false)} title="Grant new access">
        <div className="space-y-3">
          <TextField label="Provider name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <TextField label="Organization" value={form.org} onChange={(v) => setForm({ ...form, org: v })} />
          <label className="block">
            <span className="text-sm font-medium">Access scope</span>
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option>Full Access</option>
              <option>Lab Results</option>
              <option>Medications</option>
              <option>Emergency only</option>
            </select>
          </label>
          <TextField label="Expires" type="date" value={form.expires} onChange={(v) => setForm({ ...form, expires: v })} />
          <button
            onClick={() => {
              if (!form.name || !form.org) return toast("Name and organization required", "error");
              setGrants((p) => [...p, { id: Date.now(), ...form }]);
              setGrantOpen(false);
              toast("Access granted successfully");
              setForm({ name: "", org: "", scope: "Full Access", expires: "2026-07-01" });
            }}
            className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary-dark"
          >
            Grant access
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ============= FAMILY ============= */
function FamilyTab({ onSwitch }: { onSwitch: (p: { id: string; name: string; relationship: string }) => void }) {
  const { toast } = useToast();
  const [family, setFamily] = useState(mockFamily);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", relationship: "Child", dob: "", access: "Full" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Family</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage records for children, parents and dependents.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark">
          <FiPlus /> Add Family Member
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {family.map((f) => (
          <div key={f.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary-light grid place-items-center font-semibold text-primary-dark">
                {f.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{f.name}</div>
                <div className="text-xs text-muted-foreground">{f.relationship} · DOB {f.dob}</div>
              </div>
              <button onClick={() => { setFamily((p) => p.filter((x) => x.id !== f.id)); toast("Family member removed"); }} aria-label="Remove"><FiTrash2 className="text-muted-foreground hover:text-destructive" /></button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground">{f.access}</span>
              <button
                onClick={() => onSwitch({ id: f.id, name: f.name, relationship: f.relationship })}
                className="text-sm font-medium text-primary hover:text-primary-dark inline-flex items-center gap-1"
              >
                Switch to Profile <FiChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Family Member">
        <div className="space-y-3">
          <TextField label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <label className="block">
            <span className="text-sm font-medium">Relationship</span>
            <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option>Child</option><option>Parent</option><option>Spouse</option>
            </select>
          </label>
          <TextField label="Date of birth" type="date" value={form.dob} onChange={(v) => setForm({ ...form, dob: v })} />
          <label className="block">
            <span className="text-sm font-medium">Access level</span>
            <select value={form.access} onChange={(e) => setForm({ ...form, access: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option>Full</option><option>Caregiver</option>
            </select>
          </label>
          <button
            onClick={() => {
              if (!form.name) return toast("Name required", "error");
              setFamily((p) => [...p, { id: `MP-${Math.floor(Math.random() * 9000 + 1000)}`, ...form }]);
              setOpen(false);
              toast("Family member added");
              setForm({ name: "", relationship: "Child", dob: "", access: "Full" });
            }}
            className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary-dark"
          >
            Add member
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ============= PROFILE ============= */
function ProfileTab() {
  const { user, updateUser, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(user!);
  const [contacts, setContacts] = useState(mockEmergencyContacts);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", relationship: "" });
  const [showRecovery, setShowRecovery] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [bio, setBio] = useState(false);
  const [twoFa, setTwoFa] = useState(false);
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState("English");

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ user, conditions: mockConditions, medications: mockMedications }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "MediPass-data.json"; a.click();
    URL.revokeObjectURL(url);
    toast("Data exported");
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
        <button
          onClick={() => { updateUser(form); toast("Profile saved"); }}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark"
        >
          Save changes
        </button>
      </Card>

      <Card title="Security">
        <div className="space-y-4">
          <Toggle label="Biometric Login" desc="Use fingerprint or face ID" checked={bio} onChange={setBio} />
          <Toggle label="Two-Factor Authentication" desc="Extra layer of security at login" checked={twoFa} onChange={setTwoFa} />
          <button onClick={() => setPwOpen(true)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Change password</button>
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
            <div className="flex items-center gap-2 font-medium text-sm"><FiShield className="text-warning" /> Recovery Phrase</div>
            <p className="text-xs text-muted-foreground mt-2">Store this recovery phrase safely. Without it, you cannot recover your records.</p>
            {showRecovery ? (
              <div className="mt-3 rounded bg-card border border-border p-3 font-mono text-xs">{mockRecovery}</div>
            ) : (
              <button onClick={() => setShowRecovery(true)} className="mt-3 rounded-lg bg-warning/20 text-warning px-3 py-1.5 text-xs font-medium">Show recovery phrase</button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Emergency Contacts">
        <p className="text-xs text-muted-foreground mb-3">These contacts can access your emergency info even if your phone is locked.</p>
        <ul className="divide-y divide-border mb-4">
          {contacts.map((c) => (
            <li key={c.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{c.name} <span className="text-muted-foreground font-normal">· {c.relationship}</span></div>
                <div className="text-xs text-muted-foreground">{c.phone}</div>
              </div>
              <button onClick={() => { setContacts((p) => p.filter((x) => x.id !== c.id)); toast("Contact removed"); }} aria-label="Remove"><FiTrash2 className="text-muted-foreground hover:text-destructive" /></button>
            </li>
          ))}
        </ul>
        <div className="grid sm:grid-cols-3 gap-2">
          <input placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <input placeholder="Relationship" value={contactForm.relationship} onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <button
          onClick={() => {
            if (!contactForm.name || !contactForm.phone) return toast("Name and phone required", "error");
            setContacts((p) => [...p, { id: Date.now(), ...contactForm }]);
            setContactForm({ name: "", phone: "", relationship: "" });
            toast("Contact added");
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          <FiPlus size={14} /> Add contact
        </button>
      </Card>

      <Card title="Data Management">
        <div className="flex flex-wrap gap-3">
          <button onClick={exportData} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
            <FiDownload size={14} /> Export My Data
          </button>
          <button onClick={() => toast("Data deletion request submitted")} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
            Request Data Deletion
          </button>
          <button onClick={() => setDelOpen(true)} className="rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm hover:opacity-90">
            Delete My Account
          </button>
        </div>
      </Card>

      <Card title="App Settings">
        <div className="space-y-4">
          <Toggle label="Dark mode" desc="Use dark theme" checked={dark} onChange={setDark} />
          <label className="block">
            <span className="text-sm font-medium">Language</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm max-w-xs">
              <option>English</option><option>French</option><option>Swahili</option>
            </select>
          </label>
          <div>
            <div className="text-sm font-medium mb-2">Notifications</div>
            <div className="space-y-2">
              <Toggle label="Email" checked={true} onChange={() => { }} />
              <Toggle label="SMS" checked={false} onChange={() => { }} />
              <Toggle label="Push" checked={true} onChange={() => { }} />
            </div>
          </div>
        </div>
      </Card>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change password">
        <div className="space-y-3">
          <TextField label="Current password" type="password" value="" onChange={() => { }} />
          <TextField label="New password" type="password" value="" onChange={() => { }} />
          <TextField label="Confirm new password" type="password" value="" onChange={() => { }} />
          <button onClick={() => { setPwOpen(false); toast("Password changed"); }} className="w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary-dark">
            Update password
          </button>
        </div>
      </Modal>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete account?" size="sm">
        <p className="text-sm text-muted-foreground">This will permanently delete your account and all medical records. This action cannot be undone.</p>
        <div className="mt-5 flex gap-2 justify-end">
          <button onClick={() => setDelOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
          <button
            onClick={() => { logout(); navigate("/"); toast("Account deleted"); }}
            className="rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm hover:opacity-90"
          >
            Yes, delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ============= Shared bits ============= */
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
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
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
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
