import { useState } from 'react';

// Hosted on S3 (public bucket). Keeping binaries out of the web bundle keeps
// Vercel deploys fast and avoids GitHub's 100MB file-size push rejection.
const DOWNLOAD_BASE = 'https://file-sahring-temp-bucket.s3.us-east-1.amazonaws.com';
const MAC_URL = `${DOWNLOAD_BASE}/CopilotDICOMViewer-mac.dmg`;
const WIN_URL = `${DOWNLOAD_BASE}/CopilotDICOMViewer-win.exe`;

const MAC_UNLOCK_CMD = 'xattr -cr "/Applications/Copilot DICOM Viewer.app"';

function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore; some browsers disallow clipboard in insecure contexts
    }
  };
  return (
    <div className="flex items-stretch rounded-md border border-red-500/40 bg-slate-950 overflow-hidden">
      <code className="flex-1 px-4 py-3 text-sm text-red-200 font-mono select-all whitespace-nowrap overflow-x-auto">
        {command}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="shrink-0 px-4 text-xs font-semibold uppercase tracking-wider bg-red-500/20 hover:bg-red-500/30 text-red-100 border-l border-red-500/40 transition-colors"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function DownloadPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 text-sm text-slate-300 space-y-6">

        <div>
          <h1 className="text-xl font-semibold text-slate-100 mb-2">
            Desktop App Downloads
          </h1>
          <p className="leading-relaxed text-slate-400">
            The desktop version of Copilot DICOM Viewer includes everything in the web app plus
            <span className="text-slate-200"> PACS mode</span> — automatic detection of new X-rays
            from an imaging system via the DICOMweb standard.
          </p>
        </div>

        {/* ───────────────────────────────────────────── */}
        {/* macOS "damaged" workaround — PROMINENT banner */}
        {/* ───────────────────────────────────────────── */}
        <section className="rounded-lg border-2 border-red-500/60 bg-red-500/10 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/25 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-red-300">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-200 leading-snug">
                macOS users — read this BEFORE opening the app
              </h2>
              <p className="text-sm text-red-100/90 mt-1">
                You will see <span className="font-semibold">&ldquo;Copilot DICOM Viewer&rdquo; is damaged and can&rsquo;t be opened.</span>{' '}
                The app is <span className="underline">not</span> actually damaged — this is a macOS quarantine check for unsigned hackathon builds. Follow the one-time fix below.
              </p>
            </div>
          </div>

          <div className="space-y-4">

            <div>
              <div className="text-xs uppercase tracking-wider text-red-300/80 font-bold mb-2">Step 1 — Install the app first</div>
              <p className="text-sm text-red-100/90 leading-relaxed">
                Download the <span className="font-mono text-red-100">.dmg</span> below, open it, and drag
                <span className="font-mono text-red-100"> Copilot DICOM Viewer</span> into the
                <span className="font-mono text-red-100"> Applications</span> folder. Don&rsquo;t try to open it yet.
              </p>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-red-300/80 font-bold mb-2">Step 2 — Open Terminal</div>
              <p className="text-sm text-red-100/90 leading-relaxed">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-red-100">⌘ + Space</kbd>{' '}
                to open Spotlight → type <span className="font-mono text-red-100">Terminal</span> → press Enter.
              </p>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-red-300/80 font-bold mb-2">Step 3 — Copy & run this command</div>
              <CopyableCommand command={MAC_UNLOCK_CMD} />
              <p className="text-xs text-red-100/70 leading-relaxed mt-2">
                Paste with <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-red-100">⌘ + V</kbd>, press{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-red-100">Enter</kbd>. No output = success.
                (You may be asked for your Mac password — that&rsquo;s normal.)
              </p>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-red-300/80 font-bold mb-2">Step 4 — Open the app normally</div>
              <p className="text-sm text-red-100/90 leading-relaxed">
                Double-click <span className="font-mono text-red-100">Copilot DICOM Viewer</span> from Applications or Launchpad. It will now open without the &ldquo;damaged&rdquo; error.
              </p>
            </div>

            <p className="text-xs text-red-200/70 pt-2 border-t border-red-500/30">
              <span className="font-semibold">Why is this needed?</span> The build isn&rsquo;t signed with an Apple Developer certificate (hackathon — no paid Apple account). macOS flags unsigned apps downloaded from browsers as &ldquo;damaged.&rdquo; The command above clears that flag. Only needs to be done once per install.
            </p>
          </div>
        </section>

        {/* Download cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Mac */}
          <a
            href={MAC_URL}
            download
            className="rounded-lg border border-slate-800 bg-slate-950/40 p-5 hover:border-accent/50 hover:bg-slate-950/60 transition-colors group block"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-slate-300">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </div>
              <div>
                <div className="text-slate-100 font-medium group-hover:text-accent transition-colors">macOS</div>
                <div className="text-xs text-slate-500">Apple Silicon (arm64)</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">.dmg installer</span>
              <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent">Download</span>
            </div>
            <p className="mt-3 text-xs text-red-300/90">
              ⚠ Run the unlock command above <span className="font-semibold">before first launch</span>.
            </p>
          </a>

          {/* Windows */}
          <a
            href={WIN_URL}
            download
            className="rounded-lg border border-slate-800 bg-slate-950/40 p-5 hover:border-accent/50 hover:bg-slate-950/60 transition-colors group block"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-300">
                  <path d="M3 12V6.75l8-1.25V12H3zm0 .5h8v6.5l-8-1.25V12.5zM11.5 12V5.35l9.5-1.6V12H11.5zm0 .5H21v7.75l-9.5-1.6V12.5z"/>
                </svg>
              </div>
              <div>
                <div className="text-slate-100 font-medium group-hover:text-accent transition-colors">Windows</div>
                <div className="text-xs text-slate-500">64-bit (x64)</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">.exe installer</span>
              <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent">Download</span>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              First launch: click "More info" → "Run anyway" on SmartScreen
            </p>
          </a>
        </div>

        {/* What's different */}
        <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
          <h3 className="text-slate-100 font-medium mb-3">What's in the desktop app that isn't in the web app?</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-accent mt-0.5">●</span>
              <div>
                <div className="text-slate-200 font-medium">PACS mode</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Automatically detects new X-rays as they arrive in the clinic's imaging system.
                  Polls via DICOMweb every 2 seconds — no manual file upload needed.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-accent mt-0.5">●</span>
              <div>
                <div className="text-slate-200 font-medium">No CORS restrictions</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Desktop apps can talk directly to imaging servers on the clinic's local network
                  without browser security restrictions getting in the way.
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-600 mt-0.5">●</span>
              <div>
                <div className="text-slate-400">Browser only + Server based modes</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Both web modes are also available in the desktop app — same codebase, same UI.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Getting started */}
        <section>
          <h3 className="text-slate-100 font-medium mb-2">Getting started with PACS mode</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            No local setup required — the desktop app connects to our hosted DICOM Gateway by default.
            Open the app → select one of the PACS items in the sidebar → upload a DICOM file to the
            vendor simulator (link shown inside the PACS view) → the study appears in the app
            within 2 seconds.
          </p>
        </section>

        <p className="text-xs text-slate-600 pb-4">
          Builds are unsigned (hackathon). Each platform shows a one-time security prompt on first launch.
        </p>
      </div>
    </div>
  );
}
