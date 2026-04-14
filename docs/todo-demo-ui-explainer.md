# TODO — In-app explainer UI for the demo

**Context:** Stakeholders watching the hackathon demo need to understand where the hackathon boundaries end and where the production swap points are. The demo uses Orthanc as a stand-in; production would talk to real vendor software (DEXIS, Sidexis, Carestream, Planmeca, Vatech, etc.). Add UI copy + visuals inside the app that make this explicit.

---

## What to add

### 1. "About / How it works" panel (new route or overlay)

A short, illustrated explainer showing the two flows side by side. Short copy, one diagram. Linked from the sidebar footer or a `?` icon in the top bar.

**Text content (draft):**

> **Production flow (what a real EAssist clinic would have):**
> `[X-ray sensor]` → `[vendor capture software — DEXIS / Sidexis / Carestream / Planmeca]` → `[Copilot]`
>
> The vendor's software captures the image from their sensor over USB using their proprietary driver, stores it, and exposes it as DICOM (a federally-mandated healthcare imaging standard). Copilot connects at the DICOM layer — so it works with every vendor out of the box.
>
> **Hackathon demo flow (what you're seeing):**
> `[sample .dcm file]` → dragged into `[Orthanc — free open-source DICOM server]` → `[Copilot]`
>
> Orthanc is a free, open-source DICOM server that plays the same role vendor software plays in production. We use it so we can demonstrate DICOM integration on a laptop without needing trial installs of every dental vendor's product.
>
> **From Copilot's point of view, the two flows are identical** — both end in a standard DICOM endpoint. The protocol-level code that works against Orthanc in this demo works unchanged against DEXIS, Sidexis, or any DICOM-compliant vendor software.

### 2. Subtle badge in the sidebar or top bar when in PACS mode

Something like: `Source: Orthanc (demo stand-in for vendor PACS)` with a `?` → opens the About panel.

### 3. Swap-out checklist on the About panel

A three-row table / list:

| Hackathon demo | Production | What changes |
|---|---|---|
| Orthanc (Docker, localhost) | Clinic's vendor software (DEXIS / Sidexis / etc.) | Swap the DICOM endpoint URL — no Copilot code change |
| Sample `.dcm` files uploaded manually | Vendor software auto-exports after X-ray capture | No Copilot change — image arrives in same DICOM format |
| DICOMweb over `http://localhost:8042` | DICOMweb (or DIMSE) over clinic LAN with auth | Configure endpoint + credentials; DICOM protocol unchanged |

### 4. Legal / compliance note (optional polish)

> This demo uses public test DICOM data (source: dicomlibrary-100, de-identified). No real patient information is involved.

---

## Where this lives in the UI (suggestion)

- New `/about` or `/how-it-works` route — full-page explainer
- OR collapsible info panel at the top of the Server / PACS mode pages
- OR floating `?` button in the top-right corner of the toolbar

Pick one and wire it up when ready — all three are low-effort; the priority is that the explanation exists **somewhere visible** during the demo.

## Priority

Medium — not needed for the technical demo to work, but essential for stakeholders to correctly interpret what they're seeing. Do it before the final demo. Budget: 1–2 hours.
