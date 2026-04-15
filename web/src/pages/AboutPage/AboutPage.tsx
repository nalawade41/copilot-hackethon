const hasPacs = typeof window !== 'undefined' && !!window.pacs;

export function AboutPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 text-sm text-slate-300 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-slate-100 mb-2">
            Copilot DICOM Viewer — Hackathon POC
          </h1>
          <p className="leading-relaxed text-slate-400">
            A working demo showing how EAssist Copilot can receive and display dental X-rays
            using <span className="text-slate-200">DICOM</span> — the universal medical imaging
            standard that every X-ray machine, sensor, and clinic software in the world already speaks.
          </p>
        </div>

        {/* What we built */}
        <section className="rounded-lg border border-accent/30 bg-accent/5 p-5">
          <h2 className="text-base font-medium text-slate-100 mb-3">What we built</h2>
          <ul className="space-y-1.5 text-slate-300 leading-relaxed list-disc list-inside marker:text-slate-600">
            <li>A <span className="text-slate-100">DICOM viewer</span> that runs in the browser and as a desktop app</li>
            <li>Three ways to load an image: <span className="text-slate-100">browser-only</span>, <span className="text-slate-100">backend server</span>, and <span className="text-slate-100">PACS integration</span></li>
            <li>All <span className="text-slate-100">three industry-standard protocols</span> for clinic ⇄ Copilot image transfer (covering 100% of dental imaging vendors)</li>
            <li>A <span className="text-slate-100">simulated vendor</span> that mirrors what real clinic software does — auto-pushes new X-rays to Copilot the moment they're "captured"</li>
          </ul>
        </section>

        {/* Modes overview */}
        <div>
          <h2 className="text-base font-medium text-slate-100 mb-3">
            Viewing modes (sidebar on the left)
          </h2>
          <p className="text-slate-400 mb-4">
            Each mode is a different way Copilot can get a DICOM image. Same viewer, different source.
          </p>
        </div>

        {/* 1. Browser Only */}
        <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
          <h3 className="text-slate-100 font-medium flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-accent/20 text-accent text-xs font-bold">1</span>
            Browser Only
          </h3>
          <p className="leading-relaxed mb-2">
            DICOM file is decoded <span className="text-slate-100">entirely in your browser</span> — nothing leaves your computer.
          </p>
          <p className="text-xs text-slate-500">
            <span className="text-slate-400 font-medium">Best for:</span> private previews, offline work, full brightness/contrast control.
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Tech: React + Cornerstone3D
          </p>
        </section>

        {/* 2. Server Based */}
        <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
          <h3 className="text-slate-100 font-medium flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-accent/20 text-accent text-xs font-bold">2</span>
            Server Based
          </h3>
          <p className="leading-relaxed mb-2">
            DICOM file is uploaded to a <span className="text-slate-100">backend server</span> which converts it to a regular image and sends it back.
          </p>
          <p className="text-xs text-slate-500">
            <span className="text-slate-400 font-medium">Best for:</span> demonstrating where AI analysis, auto-measurements, or report generation would plug in on the server side.
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Tech: .NET 8 + fo-dicom
          </p>
        </section>

        {/* 3. PACS — three sub-modes */}
        {hasPacs && (
          <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-5">
            <h3 className="text-slate-100 font-medium flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-accent/20 text-accent text-xs font-bold">3</span>
              PACS Integration <span className="text-slate-500 font-normal text-xs">(three sub-modes)</span>
            </h3>
            <p className="leading-relaxed mb-3">
              Copilot connects directly to clinic imaging software — no manual file picking. Three sidebar entries
              show the <span className="text-slate-100">three different protocols</span> we built support for:
            </p>
            <ul className="space-y-1.5 text-slate-300 text-xs leading-relaxed list-disc list-inside marker:text-slate-600 mb-3">
              <li><span className="text-slate-100">DICOMweb (Poll)</span> — Copilot asks the clinic "any new X-rays?" every 2 seconds</li>
              <li><span className="text-slate-100">DIMSE C-STORE</span> — Clinic sends new X-rays to Copilot the moment they're captured (classic TCP)</li>
              <li><span className="text-slate-100">STOW-RS</span> — Same as DIMSE but over modern HTTP</li>
            </ul>
            <p className="text-xs text-slate-500">
              Each study in the list shows which protocol delivered it (tagged in its description), so you can see them flow into the right tab as you upload.
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Tech: Electron desktop app + Orthanc (open-source DICOM server)
            </p>
          </section>
        )}

        {/* The three servers */}
        <div>
          <h2 className="text-base font-medium text-slate-100 mb-2">
            The three servers in this demo — and what they represent
          </h2>
          <p className="text-slate-400 mb-4">
            Our POC runs <span className="text-slate-200">three independent servers</span> in the cloud.
            Each one stands in for a different piece of a real Copilot + clinic setup.
          </p>
        </div>

        <div className="rounded-md border border-slate-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Server in our demo</th>
                <th className="text-left px-4 py-2.5 font-medium">What it represents in real life</th>
                <th className="text-left px-4 py-2.5 font-medium">Role in the demo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="px-4 py-3 align-top">
                  <span className="text-slate-100 font-medium">Vendor Sim Orthanc</span>
                  <div className="text-slate-600 mt-1">copilot-vendor-sim-production…</div>
                </td>
                <td className="px-4 py-3 align-top">
                  The clinic's <span className="text-slate-100">imaging software</span> sitting next to the X-ray machine — DEXIS, Carestream, Sidexis, Planmeca, etc.
                </td>
                <td className="px-4 py-3 align-top">
                  You upload a DICOM file here to "simulate" a tech taking an X-ray. It then auto-pushes the image to Copilot via DIMSE and STOW-RS.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">
                  <span className="text-slate-100 font-medium">Gateway Orthanc</span>
                  <div className="text-slate-600 mt-1">copilot-hackethon-production…</div>
                </td>
                <td className="px-4 py-3 align-top">
                  Copilot's <span className="text-slate-100">cloud receiver</span> — where incoming images from vendors land before Copilot displays them.
                </td>
                <td className="px-4 py-3 align-top">
                  Listens on all three protocols. The desktop app polls this server every 2 seconds for new studies.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">
                  <span className="text-slate-100 font-medium">.NET Backend Server</span>
                  <div className="text-slate-600 mt-1">copilot-backend-production…</div>
                </td>
                <td className="px-4 py-3 align-top">
                  Copilot's <span className="text-slate-100">processing backend</span> — where AI analysis, automated measurements, and report generation would live in production.
                </td>
                <td className="px-4 py-3 align-top">
                  Powers the "Server Based" mode. Reads DICOM files, converts to standard images, and streams them back to the viewer.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rounded-md bg-slate-950/60 border border-slate-800 p-3 text-xs text-slate-400 font-mono">
          You upload to <span className="text-slate-200">Vendor Sim</span> → it auto-forwards via DIMSE + STOW-RS → <span className="text-slate-200">Gateway</span> receives → Copilot polls Gateway → image appears
        </div>

        {/* Protocols */}
        <div>
          <h2 className="text-base font-medium text-slate-100 mb-2">
            The three protocols — and which clinics support each
          </h2>
          <p className="text-slate-400 mb-4">
            All three are official DICOM standards. The difference is <span className="text-slate-200">who initiates the transfer</span> and <span className="text-slate-200">how widely supported</span> each one is across vendors.
          </p>
        </div>

        <div className="rounded-md border border-slate-800 overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Protocol</th>
                <th className="text-left px-4 py-2.5 font-medium">Direction</th>
                <th className="text-left px-4 py-2.5 font-medium">Vendor coverage</th>
                <th className="text-left px-4 py-2.5 font-medium">Clinic side setup</th>
                <th className="text-left px-4 py-2.5 font-medium">Copilot side setup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="px-4 py-3 align-top">
                  <span className="text-slate-100 font-medium">DIMSE C-STORE</span>
                  <div className="text-slate-600 mt-1">Classic TCP, since 1993</div>
                </td>
                <td className="px-4 py-3 align-top">Clinic → Copilot (push)</td>
                <td className="px-4 py-3 align-top">
                  <span className="text-green-400 font-medium">~100%</span>
                  <div className="text-slate-600 mt-1">Universal — every DICOM device</div>
                </td>
                <td className="px-4 py-3 align-top">
                  Clinic IT adds Copilot as a <span className="text-slate-100">DICOM destination</span> in their PACS — 3 fields: <span className="text-slate-200">hostname, port, AE Title</span>. One-time, ~2 min.
                </td>
                <td className="px-4 py-3 align-top">
                  Expose a <span className="text-slate-100">public TCP endpoint</span> + give the clinic those 3 values.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">
                  <span className="text-slate-100 font-medium">STOW-RS</span>
                  <div className="text-slate-600 mt-1">Modern HTTP, since ~2015</div>
                </td>
                <td className="px-4 py-3 align-top">Clinic → Copilot (push)</td>
                <td className="px-4 py-3 align-top">
                  <span className="text-amber-400 font-medium">~50–60%</span>
                  <div className="text-slate-600 mt-1">Most modern PACS, growing</div>
                </td>
                <td className="px-4 py-3 align-top">
                  Clinic IT adds Copilot's <span className="text-slate-100">HTTPS URL</span> as a STOW endpoint in their PACS. One-time, ~2 min.
                </td>
                <td className="px-4 py-3 align-top">
                  Expose a <span className="text-slate-100">public HTTPS endpoint</span> + give the clinic the URL.
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top">
                  <span className="text-slate-100 font-medium">DICOMweb (QIDO/WADO)</span>
                  <div className="text-slate-600 mt-1">Modern HTTP, since ~2015</div>
                </td>
                <td className="px-4 py-3 align-top">Copilot → Clinic (poll)</td>
                <td className="px-4 py-3 align-top">
                  <span className="text-amber-400 font-medium">~50–60%</span>
                  <div className="text-slate-600 mt-1">Most modern PACS, growing</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="text-green-400 font-medium">None.</span> Clinic just shares their PACS URL (and credentials, if any). Nothing to install or change.
                </td>
                <td className="px-4 py-3 align-top">
                  Add the <span className="text-slate-100">clinic's PACS URL</span> in Copilot's settings.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
          <span className="text-slate-400 font-medium">Bottom line:</span> by supporting all three, Copilot can integrate with
          <span className="text-slate-200"> any clinic in the dental market</span> — newer ones via HTTP, older ones via classic DIMSE.
        </p>

        {/* What's real vs demo stand-in */}
        <div>
          <h2 className="text-base font-medium text-slate-100 mb-2">
            What's real vs. demo stand-in
          </h2>
          <p className="text-slate-400 mb-4">
            Everything Copilot does is production-shaped. The pieces that change in a real deployment are external to Copilot.
          </p>
        </div>

        <div className="rounded-md border border-slate-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">In this demo</th>
                <th className="text-left px-4 py-2.5 font-medium">In a real clinic</th>
                <th className="text-left px-4 py-2.5 font-medium">Copilot change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="px-4 py-3">You upload a sample DICOM to the Vendor Sim</td>
                <td className="px-4 py-3">X-ray machine captures and stores automatically</td>
                <td className="px-4 py-3">None — same DICOM data either way</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Vendor Sim Orthanc auto-forwards uploads</td>
                <td className="px-4 py-3">Real vendor software (DEXIS, Carestream, Planmeca, Sidexis…) does the forwarding</td>
                <td className="px-4 py-3">Swap the destination URL in vendor settings — Copilot speaks the same protocols</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Gateway Orthanc hosted on Railway (cloud)</td>
                <td className="px-4 py-3">Same gateway hosted on Copilot's production cloud (AWS / Azure)</td>
                <td className="px-4 py-3">Change deployment target — code stays the same</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Backend server on a developer laptop / Railway</td>
                <td className="px-4 py-3">Backend server in Copilot's production cloud</td>
                <td className="px-4 py-3">Change one URL in settings</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Points to ponder — open product decisions */}
        <div>
          <h2 className="text-base font-medium text-slate-100 mb-2">
            Points to ponder — open product decisions
          </h2>
          <p className="text-slate-400 mb-4">
            A few trade-offs the POC surfaces that we'll need to take a call on before going to production.
          </p>
        </div>

        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              Decision needed
            </span>
            <h3 className="text-slate-100 font-medium">Storage format — PNG vs original DICOM</h3>
          </div>
          <p className="leading-relaxed text-slate-300">
            In <span className="text-slate-100">Server Based</span> mode today, we convert each DICOM to a
            <span className="text-slate-100"> PNG</span> on the backend before sending it to the viewer.
            That keeps payloads small and snappy in the browser, but it
            <span className="text-slate-100"> strips out everything DICOM carries beyond the pixels</span> — patient info,
            study description, modality, body part, manufacturer, acquisition parameters, and so on.
          </p>

          <div className="rounded-md border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-800/60 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Option</th>
                  <th className="text-left px-4 py-2.5 font-medium">File size</th>
                  <th className="text-left px-4 py-2.5 font-medium">Metadata preserved</th>
                  <th className="text-left px-4 py-2.5 font-medium">Trade-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="px-4 py-3 align-top">
                    <span className="text-slate-100 font-medium">PNG</span>
                    <div className="text-slate-600 mt-1">Converted on backend</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="text-green-400 font-medium">Small</span>
                    <div className="text-slate-600 mt-1">~100–500 KB typical</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="text-red-400 font-medium">No</span>
                    <div className="text-slate-600 mt-1">Patient info, modality, etc. all lost</div>
                  </td>
                  <td className="px-4 py-3 align-top">Fast on slow internet, but no clinical context to drive AI, reports, or measurements.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top">
                    <span className="text-slate-100 font-medium">Original DICOM</span>
                    <div className="text-slate-600 mt-1">Stored as-is</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="text-amber-400 font-medium">Large</span>
                    <div className="text-slate-600 mt-1">~1 MB to 40–50 MB per study</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className="text-green-400 font-medium">Yes</span>
                    <div className="text-slate-600 mt-1">Full clinical record retained</div>
                  </td>
                  <td className="px-4 py-3 align-top">Painful on slow clinic internet (rural offices, smaller practices) — uploads and viewer loads can stall.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400">
            <span className="text-slate-300 font-medium">Worth considering:</span> a <span className="text-slate-200">hybrid approach</span> —
            store the original DICOM (so we never lose clinical metadata) but generate a small PNG/JPEG preview alongside it.
            Viewer loads the lightweight preview by default; full DICOM fetched only when needed (zoom, brightness/contrast, AI re-analysis).
            That gives us metadata fidelity without punishing clinics on slow connections.
          </p>
        </section>

        {/* Key takeaway */}
        <section className="rounded-lg border border-accent/30 bg-accent/5 p-5">
          <h3 className="text-slate-100 font-medium mb-2">Key takeaway</h3>
          <p className="leading-relaxed">
            This POC proves Copilot can plug into <span className="text-slate-100 font-medium">any clinic's existing imaging system</span>,
            using whichever of the three industry-standard protocols that clinic supports — with no per-vendor custom work.
            What you see here is the same integration shape we'd ship to a real EAssist clinic on day one.
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
