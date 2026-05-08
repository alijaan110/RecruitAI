import Link from "next/link"
import {
  ArrowRight, Brain, Sparkles, Shield, Zap, Users, BarChart3, Github,
  Check, CheckCircle2, Clock, Lock, FileText, Workflow, MessageSquare,
  Rocket, Code2, Database
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <NavBar />
      <Hero />
      <LogoStrip />
      <Features />
      <HowItWorks />
      <Pricing />
      <Docs />
      <Faq />
      <CtaBand />
      <Footer />
    </div>
  )
}

function NavBar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/80 border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-brand-500/20 blur-md" />
            <span className="text-white font-bold text-lg leading-none relative z-10">R</span>
            <span className="text-brand-500 font-bold text-lg leading-none relative z-10">.</span>
          </div>
          <span className="font-semibold tracking-tight">RecruitAI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
          <a href="#features" className="hover:text-slate-900">Features</a>
          <a href="#how" className="hover:text-slate-900">How it works</a>
          <a href="#pricing" className="hover:text-slate-900">Pricing</a>
          <a href="#docs" className="hover:text-slate-900">Docs</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 px-3 h-9 inline-flex items-center">
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-brand-600 hover:bg-brand-700 text-white h-9 px-4 rounded-md inline-flex items-center font-medium"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 [background:radial-gradient(40%_60%_at_50%_0%,rgba(22,163,74,0.12),transparent_70%)]"
      />
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-3 py-1 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI scoring · Mock · OpenAI · Gemini · DeepSeek
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
          The applicant tracking system{" "}
          <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent">
            built for speed
          </span>
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          Post a job, share the link, and let RecruitAI parse, score, and rank candidates
          for you. Drag through stages, ship offers, hire faster.
        </p>

        <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/register"
            className="bg-brand-600 hover:bg-brand-700 text-white h-11 px-6 rounded-md inline-flex items-center gap-2 text-sm font-medium shadow-sm"
          >
            Get started — free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 h-11 px-6 rounded-md inline-flex items-center gap-2 text-sm font-medium"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-10 flex items-center justify-center gap-6 text-xs text-slate-500 flex-wrap">
          <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-600" /> No credit card required</span>
          <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-600" /> 3 jobs free, forever</span>
          <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-600" /> Open API</span>
        </div>

        <div className="mt-16 max-w-5xl mx-auto">
          <div className="rounded-xl border border-slate-200 shadow-2xl shadow-brand-600/10 bg-white overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 h-9 border-b border-slate-100 bg-slate-50">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-slate-500">recruitai.app · Pipeline</span>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-6 gap-3 text-left">
              {[
                { label: "Received", color: "bg-slate-400", count: 12 },
                { label: "Screening", color: "bg-amber-500", count: 8 },
                { label: "Interview", color: "bg-blue-500", count: 4 },
                { label: "Offer", color: "bg-brand-600", count: 2 },
                { label: "Hired", color: "bg-emerald-600", count: 1 },
                { label: "Rejected", color: "bg-red-500", count: 5 },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${s.color}`} />
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{s.label}</span>
                  </div>
                  <div className="mt-2 text-xl font-semibold text-slate-900">{s.count}</div>
                  <div className="mt-3 space-y-1.5">
                    {Array.from({ length: Math.min(s.count, 3) }).map((_, i) => (
                      <div key={i} className="h-7 rounded-md bg-white border border-slate-200" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LogoStrip() {
  const items = ["TechCorp", "Netsol", "Systems", "Hashly", "Zentrix", "Forma"]
  return (
    <section className="border-y border-slate-100 bg-slate-50/50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-center text-xs uppercase tracking-widest text-slate-400 mb-5">Trusted by hiring teams worldwide</p>
        <div className="flex items-center justify-center gap-8 flex-wrap text-slate-400 font-semibold tracking-tight">
          {items.map((n) => <span key={n} className="text-sm">{n}</span>)}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const items = [
    { icon: Brain, title: "AI scoring out of the box", desc: "Hybrid TF-IDF + LLM ranks candidates against your JD with explainable score breakdown and recommended next steps." },
    { icon: Workflow, title: "Drag-and-drop pipeline", desc: "Six-stage Kanban board with optimistic updates, stage history, and notes. Built for keyboard-first recruiters." },
    { icon: FileText, title: "PDF & DOCX parsing", desc: "Skill extraction, experience years, education, contacts. Falls back gracefully when CVs are messy." },
    { icon: Shield, title: "Multi-tenant by design", desc: "Hard tenant isolation at every query. JWT auth, role-based guards, and signed-URL CV downloads." },
    { icon: Zap, title: "Pluggable LLM providers", desc: "Mock for dev, OpenAI/Gemini/DeepSeek for prod. Swap providers per tenant in the admin panel." },
    { icon: BarChart3, title: "Dashboards & email logs", desc: "Stats by stage, top jobs, recent applications. Admin sees email delivery, system health, and tenant usage." },
  ]
  return (
    <section id="features" className="py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Hire smarter, not harder</h2>
          <p className="mt-4 text-slate-600">Everything a small recruiting team needs in one tight, opinionated tool.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-brand-200 transition">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Post a job", desc: "Title, JD, keywords. Publish to get a public application link." },
    { n: "02", title: "Receive applications", desc: "Candidates upload PDF or DOCX. CVs are parsed and scored automatically." },
    { n: "03", title: "Move through stages", desc: "Drag through Received → Screening → Interview → Offer → Hired." },
    { n: "04", title: "Hire", desc: "Stage history and notes are kept. Email transactional updates with Resend." },
  ]
  return (
    <section id="how" className="py-24 bg-slate-50 border-y border-slate-100">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">From JD to hire in four steps</h2>
          <p className="mt-4 text-slate-600">No setup. No plugins. Sign up and post a job in under a minute.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl bg-white border border-slate-200 p-6">
              <div className="text-xs font-mono text-brand-600 mb-2">{s.n}</div>
              <h3 className="font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      tagline: "For solo recruiters & small teams.",
      cta: "Start free",
      href: "/register",
      featured: false,
      features: [
        "Up to 3 active jobs",
        "50 CV uploads / month",
        "Mock LLM scoring",
        "Stage Kanban + notes",
        "Public application links",
      ],
    },
    {
      name: "Pro",
      price: "$49",
      period: "per month",
      tagline: "For growing teams hiring across roles.",
      cta: "Start 14-day trial",
      href: "/register",
      featured: true,
      features: [
        "Unlimited active jobs",
        "500 CV uploads / month",
        "Bring your own LLM key",
        "Email automation (Resend)",
        "Team roles & permissions",
        "Priority support",
      ],
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "annual contract",
      tagline: "For high-volume orgs with compliance needs.",
      cta: "Talk to sales",
      href: "mailto:sales@recruitai.app",
      featured: false,
      features: [
        "Everything in Pro",
        "SSO + SAML",
        "Audit logs",
        "On-prem / VPC deploy",
        "SLA & dedicated CSM",
      ],
    },
  ]
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Simple, honest pricing</h2>
          <p className="mt-4 text-slate-600">Pay for what you use. Cancel any time. No hidden fees.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl border p-7 flex flex-col ${
                t.featured
                  ? "border-brand-600 bg-gradient-to-b from-brand-50/40 to-white shadow-xl shadow-brand-600/10 relative"
                  : "border-slate-200 bg-white"
              }`}
            >
              {t.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Most popular
                </div>
              )}
              <h3 className="font-semibold text-slate-900 text-lg">{t.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{t.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight">{t.price}</span>
                <span className="text-sm text-slate-500">/ {t.period}</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-600 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={t.href}
                className={`mt-7 inline-flex items-center justify-center h-10 px-4 rounded-md font-medium text-sm ${
                  t.featured
                    ? "bg-brand-600 hover:bg-brand-700 text-white"
                    : "bg-white border border-slate-300 hover:bg-slate-50 text-slate-900"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Docs() {
  const cards = [
    {
      icon: Rocket,
      title: "Quickstart",
      desc: "Run RecruitAI locally with Docker Compose in under 60 seconds.",
      code: `docker compose up --build
# Visit http://localhost:3000`,
    },
    {
      icon: Code2,
      title: "REST API",
      desc: "All operations exposed under /api/v1. JWT auth, JSON in/out.",
      code: `curl -X POST $API/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"...","password":"..."}'`,
    },
    {
      icon: Database,
      title: "LLM providers",
      desc: "Mock by default. Swap to OpenAI, Gemini, or DeepSeek per tenant.",
      code: `# /settings/llm in the dashboard
provider: openai
model:    gpt-4o-mini
api_key:  sk-...`,
    },
  ]
  return (
    <section id="docs" className="py-24 bg-slate-900 text-slate-100">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Built for builders</h2>
          <p className="mt-4 text-slate-400">REST first. Self-hostable. Predictable. Read the docs and ship today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map(({ icon: Icon, title, desc, code }) => (
            <div key={title} className="rounded-xl bg-slate-800/50 border border-slate-700 p-6">
              <div className="w-9 h-9 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-400">{desc}</p>
              <pre className="mt-4 text-[11px] text-emerald-300 bg-slate-950/70 border border-slate-800 rounded-md p-3 overflow-x-auto leading-relaxed">{code}</pre>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 h-10 px-5 rounded-md text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            Open API docs
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white h-10 px-5 rounded-md text-sm font-medium border border-slate-700"
          >
            <Github className="w-4 h-4" />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const faqs = [
    { q: "Do you train on my data?", a: "Never. RecruitAI is multi-tenant — your tenant's data is hard-isolated from every other and is never used to train any model." },
    { q: "Can I bring my own OpenAI key?", a: "Yes. Pro plans configure a tenant-level provider in /settings/llm. Mock provider is available for everyone with no key required." },
    { q: "Is RecruitAI open source?", a: "The reference implementation in this repo is open. Self-host with Docker, or run on Railway in two clicks." },
    { q: "How is hiring data secured?", a: "JWT auth, signed-URL CV downloads, bcrypt password hashing, tenant scoping on every query, and admin-only sensitive endpoints behind a separate key." },
  ]
  return (
    <section className="py-24">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-12">Frequently asked</h2>
        <div className="space-y-3">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group rounded-lg border border-slate-200 bg-white p-5 open:shadow-sm">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium text-slate-900">{q}</span>
                <span className="text-slate-400 group-open:rotate-180 transition">▾</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaBand() {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-emerald-600 text-white p-10 md:p-14 text-center shadow-xl shadow-brand-600/20">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Hire your next teammate this week</h2>
          <p className="mt-4 text-brand-50 max-w-xl mx-auto">
            Free for the first 3 jobs and 50 CVs / month. No credit card. Set up in under a minute.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/register"
              className="bg-white hover:bg-slate-100 text-slate-900 h-11 px-6 rounded-md inline-flex items-center gap-2 text-sm font-medium"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="bg-transparent hover:bg-white/10 text-white border border-white/30 h-11 px-6 rounded-md inline-flex items-center gap-2 text-sm font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center">
              <span className="text-white font-bold text-xs">R<span className="text-brand-500">.</span></span>
            </div>
            <span className="font-semibold tracking-tight">RecruitAI</span>
          </div>
          <p className="mt-3 text-slate-500 max-w-sm">An ATS built for speed. Open source. Self-hostable. Designed for small recruiting teams that want to ship.</p>
        </div>
        <div>
          <div className="font-semibold text-slate-900 mb-3">Product</div>
          <ul className="space-y-2 text-slate-600">
            <li><a href="#features" className="hover:text-slate-900">Features</a></li>
            <li><a href="#pricing" className="hover:text-slate-900">Pricing</a></li>
            <li><a href="#docs" className="hover:text-slate-900">Docs</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-slate-900 mb-3">Account</div>
          <ul className="space-y-2 text-slate-600">
            <li><Link href="/login" className="hover:text-slate-900">Sign in</Link></li>
            <li><Link href="/register" className="hover:text-slate-900">Sign up</Link></li>
            <li><Link href="/admin/login" className="hover:text-slate-900">Admin</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-10 pt-6 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between flex-wrap gap-3">
        <span>© {new Date().getFullYear()} RecruitAI. All rights reserved.</span>
        <span className="flex items-center gap-3">
          <Lock className="w-3.5 h-3.5" />
          Tenant-isolated. JWT-auth. SOC-2-ready architecture.
        </span>
      </div>
    </footer>
  )
}
