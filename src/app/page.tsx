import Link from "next/link";
import { ArrowRight, Lock, Key, Camera, CheckCircle2, Shield, QrCode, Sparkles, AlertCircle, Plus } from "lucide-react";
import { ThemeToggle } from "@/app/theme";

export const dynamic = "force-dynamic";

function GoogleIcon({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
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
    <div className="w-full bg-[#fbfbf9] text-slate-900 antialiased selection:bg-amber-200 selection:text-slate-900 font-sans">
      {/* ── HEADER ── */}
      <header className="sticky top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="h-20 w-full px-5 sm:px-8 lg:px-12 flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo & Tag */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link className="flex items-baseline gap-2 tracking-tight group" href="/">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight group-hover:text-primary transition-colors">
                heyPal!
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-white">
                35mm
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-slate-700">
                Private event albums
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-2">
            <a
              className="px-4 py-2 text-xs uppercase font-bold tracking-wider text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
              href="#field-notes"
            >
              Field notes
            </a>
            <a
              className="px-4 py-2 text-xs uppercase font-bold tracking-wider text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
              href="#archive-mechanics"
            >
              Archive mechanics
            </a>
            <a
              className="px-4 py-2 text-xs uppercase font-bold tracking-wider text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
              href="#how-it-works"
            >
              How it works
            </a>
            <a
              className="px-4 py-2 text-xs uppercase font-bold tracking-wider text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors"
              href="#privacy"
            >
              Privacy
            </a>
          </nav>

          {/* Actions: Theme Toggle, Create Event & Organizer Access */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              className="btn-brutal inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-charcoal-ink bg-paper-bright text-charcoal-ink hover:bg-tertiary-fixed text-xs font-bold uppercase tracking-wider shadow-brutal-sm transition-all"
              href="/api/auth/google?callbackUrl=%2Fadmin%2Fevents%2Fnew"
              title="Create a new event"
            >
              <Plus className="w-3.5 h-3.5 text-charcoal-ink shrink-0" />
              <span className="text-charcoal-ink">Create Event</span>
            </a>
            <a
              className="btn-brutal hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-primary hover:bg-primary-dark !text-white text-xs font-bold uppercase tracking-wider border-2 border-charcoal-ink shadow-brutal-sm transition-all"
              href="/api/auth/google?callbackUrl=%2Fadmin"
            >
              <span className="!text-white">Terminal</span>
              <ArrowRight className="w-3.5 h-3.5 !text-white" />
            </a>
          </div>
        </div>
      </header>

      <main className="w-full">
        {/* ── SECTION 1: HERO & FIELD NOTES ── */}
        <section id="field-notes" className="w-full px-5 sm:px-8 lg:px-12 pt-12 sm:pt-16 pb-16 lg:pb-24 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
            {/* Left Column: Manifesto & Access Gateway (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-start">
              {/* Overline Annotation */}
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-6 h-0.5 bg-primary rounded-full" />
                <span className="text-xs uppercase text-slate-500 tracking-widest font-bold">
                  For the people who were there
                </span>
              </div>

              {/* High-Readability Hero Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold text-slate-950 tracking-tight mb-5 leading-[1.06]">
                The moments <br />
                <span className="text-primary italic font-extrabold">
                  worth keeping.
                </span>
              </h1>

              {/* Clear Description */}
              <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed mb-6 max-w-lg">
                One shared place for the photos, faces, and little details that make an event yours.
              </p>

              {/* Signature Slogan Tag & Badge */}
              <div className="flex items-center gap-3 mb-8 flex-wrap">
                <div className="px-3.5 py-1.5 bg-amber-100 text-amber-950 border border-amber-300 rounded-lg shadow-xs font-extrabold text-xs uppercase tracking-wider">
                  Don't be Epal; use heyPal!
                </div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Private &bull; Sovereign &bull; Instant
                </span>
              </div>

              {/* Error Message Display */}
              {errorMessage && (
                <div
                  className="p-4 mb-6 bg-red-50 border border-red-300 text-red-800 rounded-xl shadow-xs flex items-start gap-3"
                  role="alert"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <p className="font-bold text-sm leading-snug">{errorMessage}</p>
                    {userEmail && (
                      <p className="text-xs mt-1 text-red-700">
                        Attempted with: <strong>{userEmail}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Primary Action Trigger: Continue with Google (Ultra High Contrast) */}
              <div className="flex flex-col gap-2 max-w-md mb-8">
                <a
                  className="group relative flex items-center justify-between px-6 py-4.5 bg-slate-950 hover:bg-black rounded-xl shadow-lg border border-slate-900 transition-all hover:translate-y-[-1px]"
                  href="/api/auth/google?callbackUrl=%2Fevents"
                  style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-xs">
                      <GoogleIcon className="w-5 h-5" />
                    </div>
                    <span className="text-base sm:text-lg font-bold text-white tracking-wide">
                      Continue with your Google account
                    </span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/90 transition-transform group-hover:translate-x-1" />
                </a>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 pt-1 text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-600 font-medium">
                      Google account sign-in
                    </span>
                  </div>
                  <a
                    href="/api/auth/google?callbackUrl=%2Fadmin%2Fevents%2Fnew"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Host an event</span>
                  </a>
                </div>
              </div>

              {/* Access Protocol Credential Card */}
              <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200 max-w-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Access protocol</p>
                    <p className="text-sm font-bold text-slate-900">Google account sign-in. Private by default.</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Protected
                </span>
              </div>
            </div>

            {/* Right Column: 2x2 Field Notes Cards (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-3 mt-8 lg:mt-0">
              {/* Header Index Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  heyPal! / Field notes
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  01 — 04
                </span>
              </div>

              {/* 2x2 High-Contrast Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Plate 01: The Gathering (Deep Emerald) */}
                <div className="p-6 bg-[#0f3a33] text-white rounded-xl shadow-md border border-[#092621] min-h-[210px] flex flex-col justify-between hover:translate-y-[-2px] transition-transform">
                  <div className="flex items-center justify-between text-emerald-200/90">
                    <span className="text-xs font-bold uppercase tracking-widest">Plate 01</span>
                    <span className="text-xs font-semibold uppercase tracking-wider">ISO 400</span>
                  </div>
                  <div className="pt-6">
                    <h3 className="text-2xl font-bold text-white mb-1.5 leading-snug">The Gathering</h3>
                    <p className="text-sm text-emerald-100/90 font-medium">Opening remarks &amp; team arrivals</p>
                  </div>
                </div>

                {/* Plate 02: Good Company (Rich Coral) */}
                <div className="p-6 bg-[#c85038] text-white rounded-xl shadow-md border border-[#a73823] min-h-[210px] flex flex-col justify-between hover:translate-y-[-2px] transition-transform">
                  <div className="flex items-center justify-between text-rose-200/90">
                    <span className="text-xs font-bold uppercase tracking-widest">Plate 02</span>
                    <span className="text-xs font-semibold uppercase tracking-wider">35MM FL</span>
                  </div>
                  <div className="pt-6">
                    <h3 className="text-2xl font-bold text-white mb-1.5 leading-snug">Good Company</h3>
                    <p className="text-sm text-rose-100/90 font-medium">Candid laughter around the tables</p>
                  </div>
                </div>

                {/* Plate 03: One for the Album (Deep Slate Navy) */}
                <div className="p-6 bg-[#1e293b] text-white rounded-xl shadow-md border border-[#0f172a] min-h-[210px] flex flex-col justify-between hover:translate-y-[-2px] transition-transform">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-xs font-bold uppercase tracking-widest">Plate 03</span>
                    <span className="text-xs font-semibold uppercase tracking-wider">f/2.8</span>
                  </div>
                  <div className="pt-6">
                    <h3 className="text-2xl font-bold text-white mb-1.5 leading-snug">One for the Album</h3>
                    <p className="text-sm text-slate-300 font-medium">Group portraits &amp; milestones</p>
                  </div>
                </div>

                {/* Plate 04: Remember This Bit (Crisp Golden Card) */}
                <div className="p-6 bg-[#fef3c7] text-slate-900 rounded-xl shadow-md border-2 border-[#f59e0b]/40 min-h-[210px] flex flex-col justify-between hover:translate-y-[-2px] transition-transform">
                  <div className="flex items-center justify-between text-amber-950 font-bold">
                    <span className="text-xs uppercase tracking-widest">Plate 04</span>
                    <span className="text-xs uppercase tracking-wider">ARCHIVAL RAW</span>
                  </div>
                  <div className="pt-6">
                    <h3 className="text-2xl font-bold text-slate-950 mb-1.5 leading-snug">Remember This Bit</h3>
                    <p className="text-sm text-slate-700 font-medium">Unplanned moments, kept together</p>
                  </div>
                </div>
              </div>

              {/* Footer Caption */}
              <div className="flex items-center justify-between pt-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>Collected together</span>
                <span className="text-primary font-extrabold">HP &mdash; 01</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: ARCHIVE MECHANICS ── */}
        <section id="archive-mechanics" className="w-full px-5 sm:px-8 lg:px-12 py-16 lg:py-24 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-0.5 bg-primary rounded-full" />
                  <span className="text-xs uppercase text-primary tracking-widest font-bold">Archive mechanics</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-slate-950 tracking-tight">
                  A good event deserves <br />
                  <span className="text-slate-600 font-semibold">more than a group chat.</span>
                </h2>
              </div>
              <div className="max-w-md">
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                  Bring every guest&apos;s perspective into one place, with organizers choosing what gets reviewed and shared.
                </p>
              </div>
            </div>

            {/* 3-Column Protocol Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Protocol 01 Card */}
              <div className="flex flex-col justify-between p-7 bg-[#fbfbf9] rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-widest text-primary font-bold">Protocol 01</span>
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-950 mb-2 leading-snug">Private by default</h3>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    Google account sign-in keeps event albums secure and verified.
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">Google account access</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Authenticated guest participation</p>
                </div>
              </div>

              {/* Protocol 02 Card */}
              <div className="flex flex-col justify-between p-7 bg-[#fbfbf9] rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-widest text-primary font-bold">Protocol 02</span>
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-950 mb-2 leading-snug">Thoughtful review</h3>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    Organizers can review submissions before they join the shared album.
                  </p>
                </div>
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-950">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-900">Organizer curated</p>
                  <p className="text-xs text-rose-700 mt-0.5">Quality and privacy in your control</p>
                </div>
              </div>

              {/* Protocol 03 Card */}
              <div className="flex flex-col justify-between p-7 bg-[#fbfbf9] rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-widest text-primary font-bold">Protocol 03</span>
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-950 mb-2 leading-snug">Shared on your terms</h3>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    Create a QR code for guests, then share a public photo wall when it suits the event.
                  </p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-950">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-900">QR + Optional public wall</p>
                  <p className="text-xs text-blue-700 mt-0.5">Interactive raffle wheel &amp; projection</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: STEP-BY-STEP WORKFLOW ── */}
        <section id="how-it-works" className="w-full px-5 sm:px-8 lg:px-12 py-16 lg:py-24 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Narrative Title Left (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-0.5 bg-primary rounded-full" />
                <span className="text-xs uppercase text-slate-500 tracking-widest font-bold">
                  From the first scan to the last photo
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 mb-4 leading-tight tracking-tight">
                Gather the moments. <br />
                <span className="text-primary italic font-extrabold">Keep them together.</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-600 mb-6 leading-relaxed font-normal">
                A simple, elegant flow for organizers and guests without app store downloads, logins, or messy group chats.
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-900">
                  High Resolution Preservation
                </span>
              </div>
            </div>

            {/* Sequenced Rows Right (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4 mt-8 lg:mt-0">
              {/* Step 01 */}
              <div className="flex items-start gap-5 p-6 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-xs transition-colors">
                <span className="text-3xl sm:text-4xl font-extrabold text-primary shrink-0 leading-none">01</span>
                <div>
                  <h3 className="text-xl font-bold text-slate-950 mb-1">Set up the event</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Organizers add the details and prepare a guest QR code.
                  </p>
                </div>
              </div>

              {/* Step 02 */}
              <div className="flex items-start gap-5 p-6 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-xs transition-colors">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-800 shrink-0 leading-none">02</span>
                <div>
                  <h3 className="text-xl font-bold text-slate-950 mb-1">Guests add their photos</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Everyone contributes to the same event album with their Google account.
                  </p>
                </div>
              </div>

              {/* Step 03 */}
              <div className="flex items-start gap-5 p-6 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-xs transition-colors">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-700 shrink-0 leading-none">03</span>
                <div>
                  <h3 className="text-xl font-bold text-slate-950 mb-1">Review and share</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-normal">
                    Organizers curate submissions and can enable a public photo wall.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: CALL TO ACTION BANNER ── */}
        <section className="w-full px-5 sm:px-8 lg:px-12 pb-16 lg:pb-24 max-w-7xl mx-auto">
          <div className="w-full p-8 sm:p-12 lg:p-14 bg-slate-950 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border border-slate-900">
            <div className="max-w-xl">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold block mb-2">
                Don't be Epal; use heyPal!
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                For the moments that belong to your people.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-xl shadow-md transition-all text-sm"
                href="/api/auth/google?callbackUrl=%2Fadmin%2Fevents%2Fnew"
              >
                <Plus className="w-4 h-4 text-primary" />
                <span>Create an event</span>
              </a>
              <a
                className="inline-flex items-center justify-center gap-3 px-7 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-md transition-all text-sm"
                href="/api/auth/google?callbackUrl=%2Fevents"
              >
                <span>Find your album</span>
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer id="privacy" className="w-full bg-white text-slate-800 border-t border-slate-200">
        <div className="w-full px-5 sm:px-8 lg:px-12 pt-12 pb-10 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-slate-950 tracking-tight">heyPal!</span>
              <span className="text-xs font-semibold text-slate-500">Private event albums</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600 font-medium">
              <a className="hover:text-primary transition-colors" href="/api/auth/google?callbackUrl=%2Fevents">
                Guest sign in
              </a>
              <a className="hover:text-primary transition-colors" href="/api/auth/google?callbackUrl=%2Fadmin">
                Organizer sign in
              </a>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
            <p>&copy; 2026 heyPal!. All rights reserved.</p>
            <p className="font-semibold text-slate-700">Don't be Epal; use heyPal!</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
