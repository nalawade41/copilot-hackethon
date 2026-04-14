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
                <td className="px-4 py-3">Backend server runs on your laptop</td>
                <td className="px-4 py-3">Backend runs on a cloud server (AWS, Azure, etc.)</td>
                <td className="px-4 py-3">Change the server URL in settings — no code changes</td>
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
