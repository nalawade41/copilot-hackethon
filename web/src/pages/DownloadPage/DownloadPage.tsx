const MAC_URL = '/release/CopilotDICOMViewer-mac.dmg';
const WIN_URL = '/release/CopilotDICOMViewer-win.exe';

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
            <p className="mt-3 text-xs text-slate-600">
              First launch: right-click → Open (macOS blocks unsigned apps once)
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

        {/* Requirements */}
        <section>
          <h3 className="text-slate-100 font-medium mb-2">Requirements for PACS mode</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            PACS mode needs a DICOM server (Orthanc or clinic imaging software) reachable on the network.
            For the hackathon demo, run Orthanc locally via Docker:
          </p>
          <div className="bg-slate-950/60 border border-slate-800 rounded-md p-3 text-xs text-slate-400 font-mono mt-2">
            docker run --rm -d --name orthanc -p 8042:8042 jodogne/orthanc-plugins
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Then open the app → select PACS from the sidebar → upload a DICOM file to
            Orthanc at localhost:8042 → the study appears in the app within 2 seconds.
          </p>
        </section>

        <p className="text-xs text-slate-600 pb-4">
          Builds are unsigned (hackathon). Each platform shows a one-time security prompt on first launch.
        </p>
      </div>
    </div>
  );
}
