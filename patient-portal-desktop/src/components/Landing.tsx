import { Link } from "react-router-dom";
import { FiShield, FiSmartphone, FiUsers, FiZap, FiLock, FiHeart, FiCheckCircle, FiArrowRight } from "react-icons/fi";

export function Landing() {
  const features = [
    { icon: FiShield, title: "End-to-end encrypted", text: "Your records stay yours. Zero-knowledge architecture." },
    { icon: FiSmartphone, title: "QR-based sharing", text: "Grant any provider instant, time-bound access." },
    { icon: FiUsers, title: "Family profiles", text: "Manage records for children, parents, and dependents." },
    { icon: FiZap, title: "Real-time sync", text: "Lab results & prescriptions arrive instantly." },
    { icon: FiLock, title: "POPIA & GDPR ready", text: "Full audit log of every access. Revoke any time." },
    { icon: FiHeart, title: "Emergency access", text: "Critical info available even when your phone is locked." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
              M+
            </div>
            <span className="text-lg font-bold">MiqorAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-primary">Features</a>
            <a href="#how" className="hover:text-primary">How it works</a>
            <a href="#security" className="hover:text-primary">Security</a>
            <a href="#faq" className="hover:text-primary">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted">
              Log in
            </Link>
            <Link to="/login?tab=signup" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--color-primary-light),_transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <FiZap size={12} /> Now live across East Africa
            </span>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-tight tracking-tight">
              Your medical records.<br />
              <span className="text-primary">Truly yours.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              One portable health profile. Share with any clinic in seconds via QR. Revoke anytime. Built for patients in Africa, by patients in Africa.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login?tab=signup" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary-dark">
                Get Started Free <FiArrowRight />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium hover:bg-muted">
                See how it works
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><FiCheckCircle className="text-success" /> Free forever</span>
              <span className="flex items-center gap-1"><FiCheckCircle className="text-success" /> No credit card</span>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-8 shadow-2xl">
              <div className="h-full rounded-2xl bg-card p-6 flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-light grid place-items-center font-semibold text-primary-dark">GM</div>
                  <div>
                    <div className="font-semibold">Grace Muthoni</div>
                    <div className="text-xs text-muted-foreground">Patient ID · MP-8472-901</div>
                  </div>
                </div>
                <div className="mt-6 grid place-items-center flex-1">
                  <div className="h-44 w-44 rounded-xl bg-foreground/95 grid place-items-center text-background text-xs font-mono p-4 text-center">
                    [QR CODE]<br />scan to share<br />your records
                  </div>
                </div>
                <div className="text-center text-xs text-muted-foreground">Refreshes every 60 seconds</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-6 px-6 py-10">
          {[
            ["50K+", "Active patients"],
            ["1,200+", "Partner clinics"],
            ["99.99%", "Uptime"],
            ["256-bit", "Encryption"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <div className="text-3xl font-bold text-primary">{n}</div>
              <div className="text-sm text-muted-foreground mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold">Everything your health deserves</h2>
          <p className="mt-3 text-muted-foreground">Built around the patient — not the hospital, not the insurer.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6 hover:shadow-md transition">
              <div className="h-11 w-11 rounded-lg bg-primary-light grid place-items-center text-primary-dark">
                <f.icon size={20} />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center">How it works</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {[
              ["1", "Create your profile", "Sign up free and add your basic info, conditions, medications."],
              ["2", "Generate your QR", "Your unique QR is your portable medical identity."],
              ["3", "Share & revoke", "Show the QR at any clinic. Revoke access any time, from anywhere."],
            ].map(([n, t, d]) => (
              <div key={n} className="text-center">
                <div className="mx-auto h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center text-xl font-bold">{n}</div>
                <h3 className="mt-4 font-semibold text-lg">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-7xl px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold">Privacy is a right, not a feature</h2>
          <p className="mt-4 text-muted-foreground">
            Your data is encrypted on your device before it ever leaves it. We can't read it. Neither can anyone else, unless you let them.
          </p>
          <ul className="mt-6 space-y-3">
            {["AES-256 end-to-end encryption", "Zero-knowledge architecture", "Audit log of every access", "POPIA & GDPR compliant"].map((x) => (
              <li key={x} className="flex items-center gap-3"><FiCheckCircle className="text-success" /> {x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-primary-dark to-primary p-10 text-primary-foreground">
          <FiLock size={48} />
          <div className="mt-6 text-3xl font-bold">256-bit encryption</div>
          <div className="mt-2 opacity-90">The same standard used by banks and governments.</div>
        </div>
      </section>



      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center">Loved by patients</h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            ["“Showed my QR at a clinic in Mombasa — they had my whole history in 5 seconds.”", "Amani K."],
            ["“Finally, my mother's records aren't trapped in three different hospitals.”", "Wanjiru M."],
            ["“The audit log gives me real peace of mind.”", "Samuel O."],
          ].map(([q, n]) => (
            <div key={n} className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm">{q}</p>
              <div className="mt-4 text-sm font-medium text-muted-foreground">— {n}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-muted/40 border-y border-border">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center">Frequently asked</h2>
          <div className="mt-10 space-y-4">
            {[
              ["Is my data really private?", "Yes. Everything is encrypted on your device. We physically cannot read your records."],
              ["What if I lose my phone?", "Use your 12-word recovery phrase to restore your account on any device."],
              ["Can my doctor edit my records?", "Only when you grant write access — and you'll see every change in your audit log."],
              ["Does it work offline?", "Yes. Your QR and emergency info work without internet."],
            ].map(([q, a]) => (
              <details key={q} className="rounded-lg border border-border bg-card p-4">
                <summary className="cursor-pointer font-medium">{q}</summary>
                <p className="mt-3 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold">Take control of your health, today.</h2>
        <p className="mt-4 text-muted-foreground">Free forever. Set up in 60 seconds.</p>
        <Link to="/login?tab=signup" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 font-medium text-primary-foreground hover:bg-primary-dark">
          Get Started <FiArrowRight />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded bg-primary text-primary-foreground text-xs font-bold">M+</div>
            <span>© 2026 MiqorAI. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
