const hasPacs = typeof window !== 'undefined' && !!window.pacs;

export function AboutPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 text-sm text-slate-300 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-slate-100 mb-2">
            Copilot DICOM Viewer
          </h1>
          <p className="leading-relaxed text-slate-400">
            A hackathon prototype demonstrating how EAssist Copilot can display dental X-rays and
            medical images using the <span className="text-slate-200">DICOM standard</span> — the
            universal format used by every imaging device in healthcare.
          </p>
        </div>

        {/* Modes overview */}
        <div>
          <h2 className="text-base font-medium text-slate-100 mb-3">
            Three ways to view images
          </h2>
          <p className="text-slate-400 mb-4">
            Use the sidebar on the left to switch between modes. Each demonstrates a different
            integration path — all using the same viewer.
          </p>
        </div>

        {/* 1. Browser Only */}
        <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
          <h3 className="text-slate-100 font-medium flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-accent/20 text-accent text-xs font-bold">1</span>
            Browser Only
          </h3>
          <p className="leading-relaxed mb-3">
            The DICOM file is processed <span className="text-slate-100">entirely in your browser</span>.
            Nothing leaves your computer — the image never touches a server.
          </p>
          <div className="bg-slate-950/60 border border-slate-800 rounded-md p-3 text-xs text-slate-400 font-mono mb-3">
            You pick a file → Browser decodes it → Image appears on screen
          </div>
          <p className="text-xs text-slate-500">
            <span className="text-slate-400 font-medium">Best for:</span> Quick previews, privacy-sensitive
            files, working offline. You get full brightness/contrast control because the raw image
            data stays in the browser.
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Technology: React + Cornerstone3D (open-source medical imaging library)
          </p>
        </section>

        {/* 2. Server Based */}
        <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
          <h3 className="text-slate-100 font-medium flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-accent/20 text-accent text-xs font-bold">2</span>
            Server Based
          </h3>
          <p className="leading-relaxed mb-3">
            The DICOM file is uploaded to a <span className="text-slate-100">backend server</span> which
            reads the medical data, converts it to a regular image (PNG), and sends it back.
          </p>
          <div className="bg-slate-950/60 border border-slate-800 rounded-md p-3 text-xs text-slate-400 font-mono mb-3">
            You pick a file → Server converts it to PNG → Image appears on screen
          </div>
          <p className="text-xs text-slate-500">
            <span className="text-slate-400 font-medium">Best for:</span> Demonstrating that the same
            viewer works with a backend processing pipeline. In production, this path could add
            AI analysis, automated measurements, or report generation on the server before returning results.
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Technology: .NET 8 + fo-dicom (open-source DICOM library for .NET)
          </p>
        </section>

        {/* 3. PACS */}
        {hasPacs && (
          <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
            <h3 className="text-slate-100 font-medium flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-accent/20 text-accent text-xs font-bold">3</span>
              PACS (Picture Archiving &amp; Communication System)
            </h3>
            <p className="leading-relaxed mb-3">
              Instead of you manually picking a file, the app <span className="text-slate-100">automatically
              detects new X-rays</span> as they arrive in an imaging system — just like it would in
              a real dental clinic.
            </p>
            <div className="bg-slate-950/60 border border-slate-800 rounded-md p-3 text-xs text-slate-400 font-mono mb-3">
              Tech takes X-ray → Imaging software stores it → Copilot detects it within 2 seconds → Image appears
            </div>
            <p className="text-xs text-slate-500">
              <span className="text-slate-400 font-medium">How it works:</span> Copilot checks the imaging
              system every 2 seconds using a healthcare standard called DICOMweb. When a new study
              appears, it fetches the image data and displays it automatically. No manual upload needed.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Technology: Electron (desktop app) + Orthanc (open-source DICOM server simulating clinic software)
            </p>
          </section>
        )}

        {/* ─── Integration models ─── */}
        <div>
          <h2 className="text-base font-medium text-slate-100 mb-2">
            How Copilot connects to clinic imaging systems
          </h2>
          <p className="text-slate-400 mb-4">
            There are two standard ways for Copilot to get images from a clinic's X-ray system.
            Both use the DICOM standard — the difference is <span className="text-slate-200">who initiates
            the transfer</span>.
          </p>
        </div>

        {/* Pull model */}
        <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-green-500/15 text-green-400 text-[10px] font-bold uppercase tracking-wider">
              Built in this demo
            </span>
          </div>
          <h3 className="text-slate-100 font-medium mb-2">
            Pull model — Copilot asks for images
          </h3>
          <p className="leading-relaxed mb-3">
            Copilot periodically checks the clinic's imaging system: <span className="text-slate-200">"Do you
            have any new X-rays?"</span> When something new appears, Copilot downloads it and displays it.
            This is called <span className="text-slate-200">polling</span>.
          </p>
          <div className="bg-slate-950/60 border border-slate-800 rounded-md p-3 text-xs text-slate-400 font-mono mb-3">
            Copilot checks every 2 seconds → "Any new studies?" → Downloads new images → Displays them
          </div>
          <div className="space-y-2 mb-3">
            <p className="text-xs text-slate-500">
              <span className="text-slate-400 font-medium">Protocol:</span> DICOMweb (HTTP-based) — a modern
              standard adopted since ~2015 and increasingly supported by most major imaging vendors.
            </p>
            <p className="text-xs text-slate-500">
              <span className="text-slate-400 font-medium">Clinic setup required:</span> None. The clinic's
              imaging system is already running. Copilot just needs the system's network address
              (hostname/URL) entered in settings.
            </p>
            <p className="text-xs text-slate-500">
              <span className="text-slate-400 font-medium">Who configures:</span> EAssist onboarding team
              enters one URL in Copilot's settings. The clinic doesn't change anything on their end.
            </p>
          </div>
          <div className="rounded-md border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Copilot needs</th>
                  <th className="text-left px-3 py-2 font-medium">Clinic needs to do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="px-3 py-2">Clinic's PACS URL entered in settings</td>
                  <td className="px-3 py-2">Nothing — their system is already running</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Vendor support:</span>
            <span className="text-xs text-slate-400">Orthanc, Carestream (newer), Google Cloud Healthcare, dcm4chee, and growing — most modern PACS support DICOMweb</span>
          </div>
        </section>

        {/* Push model */}
        <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              Production upgrade (not yet built)
            </span>
          </div>
          <h3 className="text-slate-100 font-medium mb-2">
            Push model — Imaging system sends images to Copilot
          </h3>
          <p className="leading-relaxed mb-3">
            Instead of Copilot checking repeatedly, the clinic's imaging system <span className="text-slate-200">automatically
            sends new X-rays to Copilot the moment they're captured</span>. This is how most
            hospital systems work today — it's instant and doesn't require constant polling.
          </p>
          <div className="bg-slate-950/60 border border-slate-800 rounded-md p-3 text-xs text-slate-400 font-mono mb-3">
            Tech takes X-ray → Imaging software sends it to Copilot instantly → Image appears
          </div>
          <div className="space-y-2 mb-3">
            <p className="text-xs text-slate-500">
              <span className="text-slate-400 font-medium">Protocol:</span> DIMSE C-STORE (TCP-based) —
              the original DICOM transfer standard, supported by <span className="text-slate-300">every</span> imaging
              device since the 1990s. Also available over HTTP via STOW-RS (part of DICOMweb).
            </p>
            <p className="text-xs text-slate-500">
              <span className="text-slate-400 font-medium">Clinic setup required:</span> A one-time
              configuration by the clinic's IT person. They add Copilot as a "DICOM destination" in
              their imaging software — entering Copilot's address, port, and identifier. Takes about 2 minutes.
            </p>
            <p className="text-xs text-slate-500">
              <span className="text-slate-400 font-medium">Who configures:</span> Clinic's IT admin
              adds 3 values to their PACS settings (we provide them). After that, every new X-ray
              flows to Copilot automatically.
            </p>
          </div>
          <div className="rounded-md border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Copilot needs</th>
                  <th className="text-left px-3 py-2 font-medium">Clinic needs to do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="px-3 py-2">A listening endpoint (open port or URL)</td>
                  <td className="px-3 py-2">Add Copilot as a destination in their PACS (3 fields, once)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Vendor support:</span>
            <span className="text-xs text-slate-400">Universal — every DICOM device supports DIMSE push. It's been the standard since the 1990s.</span>
          </div>
        </section>

        {/* Comparison */}
        <section>
          <h3 className="text-slate-100 font-medium mb-3">Pull vs Push — at a glance</h3>
          <div className="rounded-md border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium"></th>
                  <th className="text-left px-4 py-2.5 font-medium">Pull (what we built)</th>
                  <th className="text-left px-4 py-2.5 font-medium">Push (production upgrade)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="px-4 py-2.5 text-slate-400 font-medium">Who initiates</td>
                  <td className="px-4 py-2.5">Copilot asks for data</td>
                  <td className="px-4 py-2.5">Vendor sends data</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-400 font-medium">Speed</td>
                  <td className="px-4 py-2.5">~2 second delay (polling interval)</td>
                  <td className="px-4 py-2.5">Instant (sent on capture)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-400 font-medium">Protocol era</td>
                  <td className="px-4 py-2.5">Modern — DICOMweb (HTTP, since ~2015)</td>
                  <td className="px-4 py-2.5">Classic — DIMSE (TCP, since 1993) + modern STOW-RS option</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-400 font-medium">Clinic setup</td>
                  <td className="px-4 py-2.5">
                    <span className="text-green-400">None</span> — we just need their URL
                  </td>
                  <td className="px-4 py-2.5">
                    Minimal — IT adds Copilot as destination (3 fields, once)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-400 font-medium">Copilot setup</td>
                  <td className="px-4 py-2.5">Enter clinic's PACS URL</td>
                  <td className="px-4 py-2.5">Open a listening port or URL</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-400 font-medium">Vendor compatibility</td>
                  <td className="px-4 py-2.5">Most modern PACS (growing since 2015)</td>
                  <td className="px-4 py-2.5">
                    <span className="text-green-400">Universal</span> — every DICOM device since 1993
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-slate-400 font-medium">Best for</td>
                  <td className="px-4 py-2.5">Quick onboarding, modern clinics</td>
                  <td className="px-4 py-2.5">High-volume clinics, real-time workflows, older equipment</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            <span className="text-slate-400 font-medium">Recommendation for production:</span> Support
            both. Start with pull (zero clinic setup, works today) and add push as a premium
            feature for clinics that need real-time delivery or have older equipment that doesn't
            support DICOMweb.
          </p>
        </section>

        {/* Production story */}
        <div>
          <h2 className="text-base font-medium text-slate-100 mb-3">
            What's real vs. what's a demo stand-in
          </h2>
          <p className="text-slate-400 mb-4">
            Some pieces in this demo are simplified versions of what a real clinic deployment would look like.
            Here's what stays and what swaps out:
          </p>
        </div>

        <div className="rounded-md border border-slate-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">In this demo</th>
                <th className="text-left px-4 py-2.5 font-medium">In a real clinic</th>
                <th className="text-left px-4 py-2.5 font-medium">What changes in Copilot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="px-4 py-3">Sample X-ray files you upload manually</td>
                <td className="px-4 py-3">X-ray machine captures the image automatically</td>
                <td className="px-4 py-3">Nothing — Copilot receives the same DICOM data either way</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Backend server runs on your laptop or Render</td>
                <td className="px-4 py-3">Backend runs on a cloud server (AWS, Azure, etc.)</td>
                <td className="px-4 py-3">Change the server URL in settings — no code changes</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Copilot polls for new images (pull model)</td>
                <td className="px-4 py-3">Vendor pushes images to Copilot (push model) or Copilot polls (both work)</td>
                <td className="px-4 py-3">Add a push receiver endpoint — pull still works as fallback</td>
              </tr>
              {hasPacs && (
                <>
                  <tr>
                    <td className="px-4 py-3">
                      <span className="text-slate-100">Orthanc</span> (free open-source imaging server) simulates the clinic's imaging software
                    </td>
                    <td className="px-4 py-3">
                      Real vendor software — <span className="text-slate-100">DEXIS, Carestream, Planmeca, Sidexis</span>, or any DICOM-capable vendor
                    </td>
                    <td className="px-4 py-3">
                      Swap the connection URL — Copilot speaks the same DICOM standard all vendors use
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">You drag a file into Orthanc's admin page to simulate a scan</td>
                    <td className="px-4 py-3">Dental tech takes an X-ray → vendor software stores it automatically</td>
                    <td className="px-4 py-3">No Copilot change — the image arrives via the same protocol</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Key takeaway */}
        <section className="rounded-lg border border-accent/30 bg-accent/5 p-5">
          <h3 className="text-slate-100 font-medium mb-2">Key takeaway</h3>
          <p className="leading-relaxed">
            Copilot uses <span className="text-slate-100 font-medium">DICOM</span> — the same standard
            every X-ray machine, dental sensor, and imaging software in the world already speaks.
            That means it works with <span className="text-slate-100">any vendor's equipment</span> out
            of the box, with no per-vendor customization. What you see in this demo is the
            same integration path a real EAssist clinic would use.
          </p>
        </section>

        {/* Sample data note */}
        <p className="text-xs text-slate-600 pb-4">
          All images shown are public de-identified DICOM test data (source: dicomlibrary-100).
          No real patient information is used in this demo.
        </p>
      </div>
    </div>
  );
}
