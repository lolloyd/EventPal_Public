import Link from "next/link";
import { ArrowRight, Lock, Key, Camera, CheckCircle2, Shield, QrCode, Sparkles, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/app/theme";

export const instant = false;

function GoogleIcon({ className = "w-4 h-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

const errorMessages: Record<string, string> = {
  unauthorized_domain: "Your Google account domain is not authorized for this event space.",
  admin_required: "Organizer privileges are required to access that area. Sign in with an organizer account.",
  invalid_oauth_state: "The sign-in attempt timed out or was interrupted. Please try again.",
  token_exchange_failed: "Google sign-in could not be completed. Please try again.",
  missing_email_claim: "Your Google account did not supply an email address.",
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const errorCode = params?.error;
  const userEmail = params?.email;
  const errorMessage = errorCode
    ? errorMessages[errorCode] || "Sign-in could not be completed. Please try again."
    : null;

  return (
    <div className="w-full bg-surface text-on-surface antialiased selection:bg-electric-lime selection:text-charcoal-ink">
      {/* ── STICKY EDITORIAL HEADER ── */}
      <header className="sticky top-0 left-0 w-full z-50 bg-paper-bright/95 backdrop-blur-md border-b border-charcoal-ink/10 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-20 w-full px-5 sm:px-8 lg:px-12 flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo & 35mm Tag */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link className="flex items-baseline gap-1.5 tracking-tight group" href="/">
              <span className="font-display-hero text-2xl sm:text-3xl font-bold text-charcoal-ink group-hover:text-primary transition-colors">
                heyPal!
              </span>
              <span className="text-label-mono-tag uppercase px-1.5 py-0.5 rounded-none bg-charcoal-ink text-paper-bright font-bold">
                35mm
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-surface-container rounded-none shadow-brutal-sm">
              <span className="w-2 h-2 rounded-full bg-electric-lime animate-pulse" />
              <span className="text-label-caps tracking-widest text-on-surface uppercase">
                Private Event Albums
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-surface-container-low p-1 rounded-none border border-charcoal-ink/10 shadow-brutal-sm">
            <a
              className="px-3.5 py-1.5 text-label-caps uppercase transition-all bg-primary text-on-primary font-bold shadow-brutal-sm"
              href="#field-notes"
            >
              Field Notes
            </a>
            <a
              className="px-3.5 py-1.5 text-label-caps uppercase text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
              href="#how-it-works"
            >
              How It Works
            </a>
            <a
              className="px-3.5 py-1.5 text-label-caps uppercase text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
              href="#archive-mechanics"
            >
              Archive Mechanics
            </a>
            <a
              className="px-3.5 py-1.5 text-label-caps uppercase text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
              href="#privacy"
            >
              Privacy
            </a>
          </nav>

          {/* Actions: Theme Toggle & Organizer Access */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              className="btn-brutal inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-on-primary text-label-caps uppercase font-bold tracking-wider rounded-none shadow-brutal hover:bg-primary-dark"
              href="/api/auth/google?callbackUrl=%2Fadmin"
            >
              <span>Organizer Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="w-full">
        {/* ── SECTION 1: HERO & FIELD NOTES CONTACT SHEET ── */}
        <section id="field-notes" className="w-full px-5 sm:px-8 lg:px-12 pt-10 sm:pt-14 pb-16 lg:pb-24 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Manifesto & Access Gateway (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-start">
              {/* Overline Annotation */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-[2px] bg-primary" />
                <span className="text-label-caps uppercase text-on-surface-variant tracking-widest font-bold">
                  For the people who were there
                </span>
              </div>

              {/* Dramatic Bodoni Headline */}
              <h1 className="font-display-hero text-4xl sm:text-5xl lg:text-[68px] text-charcoal-ink tracking-tight mb-4 leading-[0.96]">
                The moments <br />
                <span className="italic font-normal text-secondary underline decoration-primary/40 decoration-wavy decoration-2">
                  worth keeping.
                </span>
              </h1>

              {/* Editorial Description */}
              <p className="font-body-lg text-lg text-on-surface-variant max-w-lg mb-4 leading-relaxed">
                One shared place for the photos, faces, and little details that make an event yours.
              </p>

              {/* Signature Slogan Tag & Badge */}
              <div className="flex items-center gap-2.5 mb-8 flex-wrap">
                <div className="px-3 py-1.5 bg-tertiary-fixed text-on-tertiary-fixed rounded-none shadow-brutal-sm border border-charcoal-ink/10">
                  <span className="text-label-caps font-bold tracking-wider uppercase text-charcoal-ink">
                    Bawal Epal; use heyPal!
                  </span>
                </div>
                <span className="text-label-mono-tag text-on-surface-variant uppercase tracking-wider font-semibold">
                  Living Catalog EP—25
                </span>
              </div>

              {/* Error Message Display */}
              {errorMessage && (
                <div
                  className="p-4 mb-6 bg-red-500/10 border-2 border-red-500 text-red-700 dark:text-red-300 shadow-brutal-sm flex items-start gap-3 rounded-none"
                  role="alert"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm leading-snug">{errorMessage}</p>
                    {userEmail && (
                      <p className="text-xs mt-1 opacity-90">
                        Attempted with: <strong>{userEmail}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Primary Action Trigger: Continue with Google */}
              <div className="flex flex-col gap-1.5 max-w-md mb-8">
                <a
                  className="btn-brutal group relative flex items-center justify-between px-6 py-4 bg-charcoal-ink text-paper-bright rounded-none shadow-brutal-coral hover:bg-black"
                  href="/api/auth/google?callbackUrl=%2Fevents"
                >
                  <div className="flex items-center gap-3">
                    <GoogleIcon className="w-5 h-5 shrink-0" />
                    <span className="font-body-md text-base font-bold tracking-wide">
                      Continue with Google
                    </span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary-fixed transition-transform group-hover:translate-x-1" />
                </a>
                <div className="flex items-center gap-1.5 px-1 text-on-surface-variant pt-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-xs text-on-surface-variant">
                    Sign in with your authorized Google account
                  </span>
                </div>
              </div>

              {/* Access Protocol Credential Card */}
              <div className="p-4 bg-surface-container rounded-none shadow-brutal max-w-md flex items-center justify-between border border-charcoal-ink/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-none bg-surface-container-highest flex items-center justify-center text-charcoal-ink shadow-brutal-sm">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-label-mono-tag uppercase text-on-surface-variant">Access Protocol</p>
                    <p className="text-sm font-bold text-on-surface">Google sign-in. Private by default.</p>
                  </div>
                </div>
                <span className="text-label-mono-tag uppercase px-2 py-1 rounded-none bg-primary text-on-primary font-bold shadow-brutal-sm">
                  PROTECTED
                </span>
              </div>
            </div>

            {/* Right Column: Avant-Garde Field Notes Poster Grid (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-2 mt-8 lg:mt-0">
              {/* Header Index Bar */}
              <div className="flex items-center justify-between pb-1 border-b border-charcoal-ink/10">
                <span className="text-label-mono-tag uppercase font-bold tracking-wider text-charcoal-ink">
                  HEYPAL! / FIELD NOTES
                </span>
                <span className="text-label-mono-tag uppercase text-on-surface-variant tracking-widest font-bold">
                  01 — 04
                </span>
              </div>

              {/* 2x2 Tactile Card Mosaic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Plate 01: The Gathering (Deep Green) */}
                <div className="btn-brutal group relative p-6 bg-secondary text-on-secondary rounded-none shadow-brutal-lg overflow-hidden min-h-[220px] flex flex-col justify-between">
                  <svg
                    className="absolute right-3 top-3 w-28 h-28 text-white/10 pointer-events-none group-hover:rotate-45 transition-transform duration-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                  >
                    <circle cx="50" cy="50" r="40" />
                    <line x1="10" x2="90" y1="50" y2="50" />
                    <line x1="50" x2="50" y1="10" y2="90" />
                    <line x1="20" x2="80" y1="20" y2="80" />
                  </svg>
                  <div className="flex items-center justify-between text-white/80">
                    <span className="text-label-mono-tag uppercase tracking-widest font-bold">PLATE 01</span>
                    <span className="text-label-mono-tag uppercase">ISO 400</span>
                  </div>
                  <div className="relative z-10 pt-10">
                    <h3 className="font-display-hero text-2xl leading-tight mb-1 text-white">The Gathering</h3>
                    <p className="text-xs text-white/80">Opening remarks &amp; team arrivals</p>
                  </div>
                </div>

                {/* Plate 02: Good Company (Vivid Coral) */}
                <div className="btn-brutal group relative p-6 bg-primary text-on-primary rounded-none shadow-brutal-lg overflow-hidden min-h-[220px] flex flex-col justify-between">
                  <svg
                    className="absolute right-3 top-3 w-28 h-28 text-white/10 pointer-events-none group-hover:scale-110 transition-transform duration-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                  >
                    <circle cx="50" cy="50" r="42" />
                    <circle cx="50" cy="50" r="28" strokeDasharray="4 4" />
                    <line x1="50" x2="50" y1="0" y2="100" />
                  </svg>
                  <div className="flex items-center justify-between text-white/80">
                    <span className="text-label-mono-tag uppercase tracking-widest font-bold">PLATE 02</span>
                    <span className="text-label-mono-tag uppercase font-bold">35MM FL</span>
                  </div>
                  <div className="relative z-10 pt-10">
                    <h3 className="font-display-hero text-2xl leading-tight mb-1 text-white">Good Company</h3>
                    <p className="text-xs text-white/80">Candid laughter around the tables</p>
                  </div>
                </div>

                {/* Plate 03: One for the Album (Slate Blue) */}
                <div className="btn-brutal group relative p-6 bg-slate-blue text-charcoal-ink rounded-none shadow-brutal-lg overflow-hidden min-h-[220px] flex flex-col justify-between">
                  <svg
                    className="absolute right-3 top-3 w-28 h-28 text-charcoal-ink/10 pointer-events-none group-hover:translate-x-2 transition-transform duration-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                  >
                    <rect height="60" width="60" x="20" y="20" />
                    <circle cx="50" cy="50" r="20" />
                  </svg>
                  <div className="flex items-center justify-between text-charcoal-ink/80">
                    <span className="text-label-mono-tag uppercase tracking-widest font-bold">PLATE 03</span>
                    <span className="text-label-mono-tag uppercase font-bold">F/2.8</span>
                  </div>
                  <div className="relative z-10 pt-10">
                    <h3 className="font-display-hero text-2xl leading-tight mb-1 text-charcoal-ink">One for the Album</h3>
                    <p className="text-xs text-charcoal-ink/85">Group portraits &amp; milestones</p>
                  </div>
                </div>

                {/* Plate 04: Remember This Bit (Tertiary Ochre) */}
                <div className="btn-brutal group relative p-6 bg-tertiary-fixed-dim text-charcoal-ink rounded-none shadow-brutal-lg overflow-hidden min-h-[220px] flex flex-col justify-between">
                  <svg
                    className="absolute right-3 top-3 w-28 h-28 text-charcoal-ink/10 pointer-events-none group-hover:scale-95 transition-transform duration-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                  >
                    <polygon points="50,15 90,85 10,85" />
                    <circle cx="50" cy="58" r="16" />
                  </svg>
                  <div className="flex items-center justify-between text-charcoal-ink/80">
                    <span className="text-label-mono-tag uppercase tracking-widest font-bold">PLATE 04</span>
                    <span className="text-label-mono-tag uppercase font-bold">ARCHIVAL RAW</span>
                  </div>
                  <div className="relative z-10 pt-10">
                    <h3 className="font-display-hero text-2xl leading-tight mb-1 text-charcoal-ink">Remember This Bit</h3>
                    <p className="text-xs text-charcoal-ink/85">Unplanned moments, kept together</p>
                  </div>
                </div>
              </div>

              {/* Footer Caption */}
              <div className="flex items-center justify-between pt-2 text-label-mono-tag text-on-surface-variant uppercase font-semibold">
                <span>COLLECTED TOGETHER</span>
                <span className="font-bold text-primary">EP — 01</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: ARCHIVE MECHANICS (PROTOCOLS 01 - 03) ── */}
        <section id="archive-mechanics" className="w-full px-5 sm:px-8 lg:px-12 py-16 lg:py-24 bg-surface-container-low border-y border-charcoal-ink/10">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-[2px] bg-primary" />
                  <span className="text-label-caps uppercase text-primary tracking-widest font-bold">Archive mechanics</span>
                </div>
                <h2 className="font-display-hero text-3xl sm:text-4xl lg:text-5xl leading-tight text-charcoal-ink">
                  A good event deserves <br />
                  <span className="italic font-normal text-on-surface-variant">more than a group chat.</span>
                </h2>
              </div>
              <div className="max-w-xs">
                <p className="text-base text-on-surface-variant leading-relaxed">
                  Bring every guest’s perspective into one place, with organizers choosing what gets reviewed and shared.
                </p>
              </div>
            </div>

            {/* 3-Column Protocol Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Protocol 01 Card */}
              <div className="btn-brutal group flex flex-col justify-between p-6 bg-paper-bright rounded-none shadow-brutal-lg border border-charcoal-ink/10">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-label-mono-tag uppercase tracking-widest text-primary font-bold">PROTOCOL 01</span>
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display-hero text-2xl text-charcoal-ink mb-2 leading-snug">Private by default</h3>
                  <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                    Google-account sign-in keeps event albums strictly within your organization or approved guests.
                  </p>
                </div>
                <div className="relative w-full aspect-[4/3] rounded-none overflow-hidden shadow-brutal-sm bg-surface-container">
                  <div className="w-full h-full bg-gradient-to-tr from-secondary/80 via-secondary/40 to-primary/30 flex items-center justify-center p-6 text-white text-center">
                    <div className="space-y-1">
                      <Lock className="w-8 h-8 mx-auto text-electric-lime" />
                      <p className="text-xs uppercase tracking-widest font-mono text-white/90">Zero Data Leakage</p>
                      <p className="text-xs text-white/70">Authenticated Sessions</p>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-charcoal-ink text-paper-bright rounded-none text-label-mono-tag uppercase font-bold tracking-widest">
                    PRIVATE GOOGLE ACCESS
                  </div>
                </div>
              </div>

              {/* Protocol 02 Card */}
              <div className="btn-brutal group flex flex-col justify-between p-6 bg-paper-bright rounded-none shadow-brutal-lg border border-charcoal-ink/10">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-label-mono-tag uppercase tracking-widest text-primary font-bold">PROTOCOL 02</span>
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display-hero text-2xl text-charcoal-ink mb-2 leading-snug">Thoughtful review</h3>
                  <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                    Organizers review, moderate, and curate submissions before they join the shared public stream.
                  </p>
                </div>
                <div className="relative w-full aspect-[4/3] rounded-none overflow-hidden shadow-brutal-sm bg-surface-container">
                  <div className="w-full h-full bg-gradient-to-tr from-primary/80 via-primary/50 to-tertiary-fixed/40 flex items-center justify-center p-6 text-white text-center">
                    <div className="space-y-1">
                      <Sparkles className="w-8 h-8 mx-auto text-white" />
                      <p className="text-xs uppercase tracking-widest font-mono text-white/90">Curated Stream</p>
                      <p className="text-xs text-white/70">Approved Photos Only</p>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-on-primary rounded-none text-label-mono-tag uppercase font-bold tracking-widest shadow-brutal-sm">
                    ORGANIZER CURATED
                  </div>
                </div>
              </div>

              {/* Protocol 03 Card */}
              <div className="btn-brutal group flex flex-col justify-between p-6 bg-paper-bright rounded-none shadow-brutal-lg border border-charcoal-ink/10">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-label-mono-tag uppercase tracking-widest text-primary font-bold">PROTOCOL 03</span>
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display-hero text-2xl text-charcoal-ink mb-2 leading-snug">Shared on your terms</h3>
                  <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                    Generate instant printable QR table tents, run live photo carousels, and spin interactive raffle wheels.
                  </p>
                </div>
                <div className="relative w-full aspect-[4/3] rounded-none overflow-hidden shadow-brutal-sm bg-surface-container">
                  <div className="w-full h-full bg-gradient-to-tr from-secondary/80 via-slate-blue/60 to-surface-container flex items-center justify-center p-6 text-white text-center">
                    <div className="space-y-1">
                      <Camera className="w-8 h-8 mx-auto text-electric-lime" />
                      <p className="text-xs uppercase tracking-widest font-mono text-white/90">Live Projection</p>
                      <p className="text-xs text-white/70">Wheel + Fullscreen Wall</p>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-secondary text-on-secondary rounded-none text-label-mono-tag uppercase font-bold tracking-widest shadow-brutal-sm">
                    QR + LIVE PHOTO WALL
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: STEP-BY-STEP WORKFLOW / LIVING TIMELINE ── */}
        <section id="how-it-works" className="w-full px-5 sm:px-8 lg:px-12 py-16 lg:py-24 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Narrative Title Left (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-[2px] bg-primary" />
                <span className="text-label-caps uppercase text-on-surface-variant tracking-widest font-bold">
                  From the first scan to the last photo
                </span>
              </div>
              <h2 className="font-display-hero text-3xl sm:text-4xl lg:text-5xl text-charcoal-ink mb-4 leading-tight">
                Gather the moments. <br />
                <span className="italic font-normal text-secondary">Keep them together.</span>
              </h2>
              <p className="text-base text-on-surface-variant max-w-sm mb-6 leading-relaxed">
                A three-stroke cadence designed for effortless curation without friction, group chat compression, or lost memories.
              </p>
              <div className="inline-flex items-center gap-2.5 px-3.5 py-2 bg-surface-container rounded-none shadow-brutal-sm border border-charcoal-ink/10">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-label-mono-tag uppercase tracking-wider font-bold text-charcoal-ink">
                  High Resolution Preservation // Self-Contained Storage
                </span>
              </div>
            </div>

            {/* Sequenced Rows Right (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4 mt-8 lg:mt-0">
              {/* Step 01 */}
              <div className="btn-brutal group flex items-start gap-5 p-6 bg-surface-container-low hover:bg-paper-bright rounded-none shadow-brutal-sm border border-charcoal-ink/10">
                <span className="font-display-hero text-4xl text-primary font-bold leading-none shrink-0">01</span>
                <div className="flex-1">
                  <h3 className="font-display-hero text-xl text-charcoal-ink mb-1">Set up the event</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Organizers add the details, upload a cover banner, and generate print-ready table tent QR codes.
                  </p>
                </div>
              </div>

              {/* Step 02 */}
              <div className="btn-brutal group flex items-start gap-5 p-6 bg-surface-container-low hover:bg-paper-bright rounded-none shadow-brutal-sm border border-charcoal-ink/10">
                <span className="font-display-hero text-4xl text-secondary font-bold leading-none shrink-0">02</span>
                <div className="flex-1">
                  <h3 className="font-display-hero text-xl text-charcoal-ink mb-1">Guests add their photos</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Attendees scan the QR code and instantly upload camera shots or photo library images with offline retry.
                  </p>
                </div>
              </div>

              {/* Step 03 */}
              <div className="btn-brutal group flex items-start gap-5 p-6 bg-surface-container-low hover:bg-paper-bright rounded-none shadow-brutal-sm border border-charcoal-ink/10">
                <span className="font-display-hero text-4xl text-slate-blue font-bold leading-none shrink-0">03</span>
                <div className="flex-1">
                  <h3 className="font-display-hero text-xl text-charcoal-ink mb-1">Review, celebrate, and export</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Stream photos to the live wall, spin the raffle wheel for prizes, and download full ZIP archives on demand.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: FULL-WIDTH MAGNETIC ACTION BANNER ── */}
        <section className="w-full px-5 sm:px-8 lg:px-12 pb-16 lg:pb-24 max-w-7xl mx-auto">
          <div className="w-full p-8 sm:p-12 lg:p-16 bg-secondary text-on-secondary rounded-none shadow-brutal-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 pointer-events-none select-none opacity-10 text-white font-display-hero text-[160px] sm:text-[200px] leading-none font-bold">
              EPAL
            </div>
            <div className="relative z-10 max-w-xl">
              <span className="text-label-mono-tag uppercase tracking-widest text-secondary-fixed block mb-2 font-bold">
                COLLECTIVE ARCHIVAL DIRECTIVE
              </span>
              <p className="font-body-lg text-xl sm:text-2xl text-white font-light leading-snug">
                For the moments that belong to your people.
              </p>
            </div>
            <div className="relative z-10">
              <a
                className="btn-brutal inline-flex items-center gap-3 px-6 py-4 bg-tertiary-fixed text-charcoal-ink font-bold rounded-none shadow-brutal hover:bg-electric-lime transition-colors"
                href="/api/auth/google?callbackUrl=%2Fevents"
              >
                <span className="font-display-hero text-lg italic tracking-tight font-bold">
                  Bawal Epal; use heyPal!
                </span>
                <ArrowRight className="w-5 h-5 font-bold" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── BROADHEADER EDITORIAL FOOTER ── */}
      <footer id="privacy" className="w-full bg-paper-bright text-charcoal-ink border-t border-charcoal-ink/10">
        <div className="w-full px-5 sm:px-8 lg:px-12 pt-14 pb-10 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
            <div className="max-w-3xl">
              <p className="text-label-caps uppercase tracking-widest text-primary mb-1">
                Plate Protocol // Living Catalog 2026
              </p>
              <h2 className="font-display-hero text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight leading-none text-charcoal-ink">
                heyPal! <span className="italic font-normal text-secondary lowercase">/ Made for moments shared</span>
              </h2>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-2">
              <div className="px-3.5 py-2 bg-surface-container shadow-brutal-sm rounded-none border border-charcoal-ink/10">
                <p className="text-label-mono-tag uppercase text-on-surface font-bold tracking-wider">
                  Archival Status: Ephemeral Protected
                </p>
                <p className="text-label-mono-tag text-on-surface-variant uppercase">
                  Zero Third-Party Advertising // Sovereign Local Storage
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-secondary">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-label-mono-tag uppercase font-bold">Verified Archival Format</span>
              </div>
            </div>
          </div>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 py-8 bg-surface-container-low px-6 rounded-none border border-charcoal-ink/10">
            <div className="flex flex-col gap-2">
              <span className="text-label-caps text-primary uppercase font-bold">01 // Access</span>
              <a className="text-sm text-on-surface hover:text-primary transition-colors" href="/api/auth/google?callbackUrl=%2Fevents">
                Attendee Album Sign In
              </a>
              <a className="text-sm text-on-surface hover:text-primary transition-colors" href="/api/auth/google?callbackUrl=%2Fadmin">
                Organizer Director Terminal
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-label-caps text-primary uppercase font-bold">02 // Protocols</span>
              <a className="text-sm text-on-surface hover:text-primary transition-colors" href="#field-notes">
                Editorial Field Notes
              </a>
              <a className="text-sm text-on-surface hover:text-primary transition-colors" href="#archive-mechanics">
                Curated Moderation Flow
              </a>
              <a className="text-sm text-on-surface hover:text-primary transition-colors" href="#how-it-works">
                Live QR &amp; Wheel Architecture
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-label-caps text-primary uppercase font-bold">03 // Guarantee</span>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Photos stored directly in your solution's private Events storage. No cloud vendor lock-in.
              </p>
              <span className="text-label-mono-tag text-charcoal-ink font-bold">Bawal Epal; use heyPal!</span>
            </div>
            <div className="flex flex-col justify-between items-start gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-none bg-chromatic-violet shadow-brutal-sm" />
                <span className="w-3.5 h-3.5 rounded-none bg-electric-lime shadow-brutal-sm" />
                <span className="w-3.5 h-3.5 rounded-none bg-primary shadow-brutal-sm" />
                <span className="w-3.5 h-3.5 rounded-none bg-slate-blue shadow-brutal-sm" />
              </div>
              <span className="text-label-mono-tag text-on-surface-variant tracking-widest">
                Edition 04.2 / Brutalist Broadside
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-label-mono-tag text-on-surface-variant border-t border-charcoal-ink/10 pt-4">
            <p>© {new Date().getFullYear()} heyPal!. All rights reserved.</p>
            <p className="tracking-wider">Strict Raw Archival Format • High-Fashion Editorial Direction</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
