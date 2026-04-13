# Phase 2 — .NET Backend-Assisted DICOM Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Path note (post-restructure):** After this plan shipped, the front-end was moved into `web/`. Every `src/...` reference below is now `web/src/...`. Backend paths (`backend/...`) are unchanged. `samples/...` still resolves at the repo root.

**Goal:** Add a second rendering path to the DICOM viewer where a .NET backend parses DICOM files with `fo-dicom`, pre-renders frames to PNG, and serves them to the React frontend. Expose the choice via a client/server toggle in the UI, using the same `DicomSource` abstraction from Phase 1.

**Architecture:** ASP.NET Core 8 Minimal API (`backend/CopilotDicom.Api/`) with `fo-dicom` for parse + render. In-memory study cache keyed by GUID. Frontend gains a new `server-source.ts` implementing `DicomSource` by POSTing files and fetching PNG frames. A mode toggle in the toolbar picks between `fileSource` (Phase 1) and `serverSource` (Phase 2). Server-rendered mode loses client-side window/level interactivity — accepted trade-off.

**Tech Stack:** .NET 8 SDK, ASP.NET Core Minimal API, `fo-dicom` 5.x, xUnit for backend tests. Frontend additions: `server-source.ts` and a small toggle component.

**Spec:** `docs/superpowers/specs/2026-04-13-dicom-viewer-design.md` §5
**Depends on:** Phase 1 plan complete (`docs/superpowers/plans/2026-04-13-phase-1-frontend-viewer.md`)

---

## File Structure

```
copilot-hackethon/
├── backend/
│   ├── CopilotDicom.sln
│   ├── CopilotDicom.Api/
│   │   ├── Program.cs                  ← minimal API, CORS, DI
│   │   ├── Services/
│   │   │   ├── IDicomService.cs        ← interface for testability
│   │   │   └── DicomService.cs         ← fo-dicom parse + render + cache
│   │   ├── Models/
│   │   │   ├── Study.cs                ← in-memory record
│   │   │   └── UploadResponse.cs       ← JSON response shape
│   │   ├── appsettings.json
│   │   └── CopilotDicom.Api.csproj
│   └── CopilotDicom.Api.Tests/
│       ├── DicomServiceTests.cs
│       └── CopilotDicom.Api.Tests.csproj
└── src/
    ├── lib/
    │   └── server-source.ts            ← new: POST files → DicomSource
    ├── components/
    │   └── ModeToggle.tsx              ← new: client ↔ server switch
    ├── App.tsx                         ← modified: pick source by mode
    └── (Phase 1 files unchanged)
```

**Responsibility per file:**
- `Program.cs` — HTTP pipeline only. Routes delegate to `IDicomService`.
- `DicomService.cs` — all fo-dicom interactions; testable in isolation.
- `server-source.ts` — implements the `DicomSource<File[]>` interface from Phase 1 by round-tripping files through the backend.
- `ModeToggle.tsx` — pure presentation component.

---

## Task 1: Scaffold .NET backend project

**Files:**
- Create: `backend/CopilotDicom.sln`, `backend/CopilotDicom.Api/*`

- [ ] **Step 1: Create the solution + project**

From the project root:
```bash
mkdir -p backend
cd backend
dotnet new sln -n CopilotDicom
dotnet new webapi -n CopilotDicom.Api --no-https --use-minimal-apis --framework net8.0
dotnet sln add CopilotDicom.Api/CopilotDicom.Api.csproj
cd CopilotDicom.Api
rm -f WeatherForecast.cs  # remove template noise (may or may not exist)
cd ../..
```

- [ ] **Step 2: Add fo-dicom**

```bash
cd backend/CopilotDicom.Api
dotnet add package fo-dicom --version 5.1.2
dotnet add package fo-dicom.Imaging.ImageSharp --version 5.1.2
cd ../..
```

`fo-dicom.Imaging.ImageSharp` provides the PNG renderer — plain `fo-dicom` leaves rendering to a platform package.

- [ ] **Step 3: Verify it builds**

```bash
dotnet build backend/CopilotDicom.sln
```
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "chore: scaffold .NET 8 Minimal API backend"
```

---

## Task 2: Model types (`Study`, `UploadResponse`)

**Files:**
- Create: `backend/CopilotDicom.Api/Models/Study.cs`, `backend/CopilotDicom.Api/Models/UploadResponse.cs`

- [ ] **Step 1: Create `Study.cs`**

Create `backend/CopilotDicom.Api/Models/Study.cs`:
```csharp
namespace CopilotDicom.Api.Models;

/// <summary>
/// A loaded study kept in memory. One study = one or more frames rendered as PNG.
/// Keyed by <see cref="Id"/> in <see cref="Services.DicomService"/>'s cache.
/// </summary>
public sealed record Study(
    Guid Id,
    byte[][] FramePngs,
    StudyMetadata Metadata);

public sealed record StudyMetadata(
    string? PatientName,
    string? PatientId,
    string? Modality,
    string? BodyPart,
    string? StudyDate,
    string? Manufacturer);
```

- [ ] **Step 2: Create `UploadResponse.cs`**

Create `backend/CopilotDicom.Api/Models/UploadResponse.cs`:
```csharp
namespace CopilotDicom.Api.Models;

public sealed record UploadResponse(
    Guid StudyId,
    int FrameCount,
    string[] FrameUrls,
    StudyMetadata Metadata);
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat(backend): Study and UploadResponse models"
```

---

## Task 3: `IDicomService` + `DicomService` — parse, render, cache (TDD)

**Files:**
- Create: `backend/CopilotDicom.Api/Services/IDicomService.cs`, `backend/CopilotDicom.Api/Services/DicomService.cs`, `backend/CopilotDicom.Api.Tests/*`

- [ ] **Step 1: Create the test project**

```bash
cd backend
dotnet new xunit -n CopilotDicom.Api.Tests --framework net8.0
dotnet sln add CopilotDicom.Api.Tests/CopilotDicom.Api.Tests.csproj
cd CopilotDicom.Api.Tests
dotnet add reference ../CopilotDicom.Api/CopilotDicom.Api.csproj
cd ../..
```

- [ ] **Step 2: Create `IDicomService`**

Create `backend/CopilotDicom.Api/Services/IDicomService.cs`:
```csharp
using CopilotDicom.Api.Models;

namespace CopilotDicom.Api.Services;

public interface IDicomService
{
    /// <summary>Parse a DICOM file, render its frames to PNG, cache and return.</summary>
    Task<Study> IngestAsync(Stream dicomFile, CancellationToken ct);

    /// <summary>Look up a previously ingested study.</summary>
    Study? Get(Guid studyId);

    /// <summary>Get rendered PNG bytes for a specific frame of a study.</summary>
    byte[]? GetFrame(Guid studyId, int frameIndex);
}
```

- [ ] **Step 3: Write the failing tests**

Create `backend/CopilotDicom.Api.Tests/DicomServiceTests.cs`:
```csharp
using CopilotDicom.Api.Services;
using Xunit;

namespace CopilotDicom.Api.Tests;

public class DicomServiceTests
{
    // Path relative to the test bin/ directory. See csproj for the sample file copy rule.
    private static Stream OpenSample(string name) =>
        File.OpenRead(Path.Combine(AppContext.BaseDirectory, "samples", name));

    [Fact]
    public async Task Ingest_DentalPano_ExtractsPxModality()
    {
        var svc = new DicomService();
        await using var s = OpenSample("dental-pano.dcm");

        var study = await svc.IngestAsync(s, CancellationToken.None);

        Assert.Equal("PX", study.Metadata.Modality);
        Assert.Contains("jaw", study.Metadata.BodyPart ?? "", StringComparison.OrdinalIgnoreCase);
        Assert.Single(study.FramePngs);
        Assert.True(study.FramePngs[0].Length > 100, "Rendered PNG should be non-trivial in size");
    }

    [Fact]
    public async Task Ingest_MriSlice_ExtractsMrModality()
    {
        var svc = new DicomService();
        await using var s = OpenSample("image-000001.dcm");

        var study = await svc.IngestAsync(s, CancellationToken.None);

        Assert.Equal("MR", study.Metadata.Modality);
        Assert.Single(study.FramePngs);
        Assert.True(study.FramePngs[0].Length > 100);
    }

    [Fact]
    public void Get_UnknownStudy_ReturnsNull()
    {
        var svc = new DicomService();
        Assert.Null(svc.Get(Guid.NewGuid()));
    }

    [Fact]
    public async Task GetFrame_OutOfRange_ReturnsNull()
    {
        var svc = new DicomService();
        await using var s = OpenSample("dental-pano.dcm");
        var study = await svc.IngestAsync(s, CancellationToken.None);

        Assert.Null(svc.GetFrame(study.Id, 99));
        Assert.NotNull(svc.GetFrame(study.Id, 0));
    }
}
```

- [ ] **Step 4: Configure sample files to be copied to test output**

Edit `backend/CopilotDicom.Api.Tests/CopilotDicom.Api.Tests.csproj` — add a `<ItemGroup>` that copies the samples:

Replace the file's contents (or merge if already customized):
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <IsPackable>false</IsPackable>
    <Nullable>enable</Nullable>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.11.1" />
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\CopilotDicom.Api\CopilotDicom.Api.csproj" />
  </ItemGroup>

  <ItemGroup>
    <None Include="..\..\samples\dental-pano.dcm" Link="samples\dental-pano.dcm">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
    <None Include="..\..\samples\mri-knee\series-000001\image-000001.dcm" Link="samples\image-000001.dcm">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
  </ItemGroup>
</Project>
```

- [ ] **Step 5: Run tests — expect failure**

```bash
dotnet test backend/CopilotDicom.sln
```
Expected: FAIL — `DicomService` does not exist.

- [ ] **Step 6: Implement `DicomService`**

Create `backend/CopilotDicom.Api/Services/DicomService.cs`:
```csharp
using System.Collections.Concurrent;
using CopilotDicom.Api.Models;
using FellowOakDicom;
using FellowOakDicom.Imaging;
using FellowOakDicom.Imaging.ImageSharp;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;

namespace CopilotDicom.Api.Services;

public sealed class DicomService : IDicomService
{
    private readonly ConcurrentDictionary<Guid, Study> _cache = new();

    static DicomService()
    {
        // Tell fo-dicom to use ImageSharp as its rendering backend.
        ImageManager.SetImplementation(ImageSharpImageManager.Instance);
    }

    public async Task<Study> IngestAsync(Stream dicomFile, CancellationToken ct)
    {
        // Buffer to memory so fo-dicom can seek.
        using var ms = new MemoryStream();
        await dicomFile.CopyToAsync(ms, ct);
        ms.Position = 0;

        var dcm = await DicomFile.OpenAsync(ms);
        var ds = dcm.Dataset;

        var meta = new StudyMetadata(
            PatientName: ds.GetSingleValueOrDefault(DicomTag.PatientName, string.Empty),
            PatientId: ds.GetSingleValueOrDefault(DicomTag.PatientID, string.Empty),
            Modality: ds.GetSingleValueOrDefault(DicomTag.Modality, string.Empty),
            BodyPart: ds.GetSingleValueOrDefault(DicomTag.BodyPartExamined, string.Empty),
            StudyDate: ds.GetSingleValueOrDefault(DicomTag.StudyDate, string.Empty),
            Manufacturer: ds.GetSingleValueOrDefault(DicomTag.Manufacturer, string.Empty));

        var image = new DicomImage(dcm.Dataset);
        var frameCount = Math.Max(1, image.NumberOfFrames);

        var frames = new byte[frameCount][];
        for (var i = 0; i < frameCount; i++)
        {
            var rendered = image.RenderImage(i);
            using var imgSharp = rendered.AsSharpImage();
            using var buffer = new MemoryStream();
            await imgSharp.SaveAsync(buffer, new PngEncoder(), ct);
            frames[i] = buffer.ToArray();
        }

        var study = new Study(Guid.NewGuid(), frames, NullToEmpty(meta));
        _cache[study.Id] = study;
        return study;
    }

    public Study? Get(Guid studyId) =>
        _cache.TryGetValue(studyId, out var s) ? s : null;

    public byte[]? GetFrame(Guid studyId, int frameIndex)
    {
        if (!_cache.TryGetValue(studyId, out var study)) return null;
        if (frameIndex < 0 || frameIndex >= study.FramePngs.Length) return null;
        return study.FramePngs[frameIndex];
    }

    private static StudyMetadata NullToEmpty(StudyMetadata m) => m with
    {
        PatientName = string.IsNullOrWhiteSpace(m.PatientName) ? null : m.PatientName,
        PatientId = string.IsNullOrWhiteSpace(m.PatientId) ? null : m.PatientId,
        Modality = string.IsNullOrWhiteSpace(m.Modality) ? null : m.Modality,
        BodyPart = string.IsNullOrWhiteSpace(m.BodyPart) ? null : m.BodyPart,
        StudyDate = string.IsNullOrWhiteSpace(m.StudyDate) ? null : m.StudyDate,
        Manufacturer = string.IsNullOrWhiteSpace(m.Manufacturer) ? null : m.Manufacturer,
    };
}
```

- [ ] **Step 7: Run tests — expect pass**

```bash
dotnet test backend/CopilotDicom.sln
```
Expected: 4 tests pass. If the MRI test fails due to missing JPEG Lossless codec, install the codec package:
```bash
cd backend/CopilotDicom.Api
dotnet add package fo-dicom.Codecs --version 5.16.0
cd ../..
dotnet test backend/CopilotDicom.sln
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat(backend): DicomService with fo-dicom parse, render, in-memory cache"
```

---

## Task 4: Wire up `Program.cs` — endpoints, DI, CORS

**Files:**
- Modify: `backend/CopilotDicom.Api/Program.cs`

- [ ] **Step 1: Replace `Program.cs`**

Replace the contents of `backend/CopilotDicom.Api/Program.cs`:
```csharp
using CopilotDicom.Api.Models;
using CopilotDicom.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IDicomService, DicomService>();
builder.Services.AddCors(o =>
    o.AddDefaultPolicy(p => p
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

app.MapPost("/api/dicom/upload", async (HttpRequest req, IDicomService svc, CancellationToken ct) =>
{
    if (!req.HasFormContentType)
        return Results.BadRequest("multipart/form-data required");
    var form = await req.ReadFormAsync(ct);
    var file = form.Files["file"];
    if (file is null || file.Length == 0)
        return Results.BadRequest("missing 'file' part");

    await using var stream = file.OpenReadStream();
    var study = await svc.IngestAsync(stream, ct);

    var urls = Enumerable.Range(0, study.FramePngs.Length)
        .Select(i => $"/api/dicom/{study.Id}/frame/{i}")
        .ToArray();

    return Results.Ok(new UploadResponse(study.Id, study.FramePngs.Length, urls, study.Metadata));
})
.DisableAntiforgery();

app.MapGet("/api/dicom/{studyId:guid}/frame/{index:int}", (Guid studyId, int index, IDicomService svc) =>
{
    var png = svc.GetFrame(studyId, index);
    return png is null ? Results.NotFound() : Results.File(png, "image/png");
});

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.Run();
```

- [ ] **Step 2: Launch and smoke-test with curl**

```bash
cd backend/CopilotDicom.Api
dotnet run --urls http://localhost:5000 &
SERVER_PID=$!
sleep 3
curl -s http://localhost:5000/api/health
```
Expected: `{"status":"ok"}`.

- [ ] **Step 3: Upload the dental pano**

```bash
curl -s -X POST -F "file=@../../samples/dental-pano.dcm" http://localhost:5000/api/dicom/upload | head -c 500
```
Expected: JSON with `studyId`, `frameCount: 1`, `frameUrls`, `metadata.modality: "PX"`.

Grab the `studyId` from the output and fetch a frame:
```bash
curl -s http://localhost:5000/api/dicom/<studyId>/frame/0 -o /tmp/frame.png
file /tmp/frame.png
```
Expected: `/tmp/frame.png: PNG image data, ...`.

Kill the server:
```bash
kill $SERVER_PID
cd ../..
```

- [ ] **Step 4: Commit**

```bash
git add backend/CopilotDicom.Api/Program.cs
git commit -m "feat(backend): upload, frame, and health endpoints"
```

---

## Task 5: Frontend — `server-source.ts` (TDD with mocked fetch)

**Files:**
- Create: `src/lib/server-source.ts`, `tests/lib/server-source.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/server-source.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeServerSource } from '../../src/lib/server-source.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('serverSource', () => {
  it('POSTs each file and aggregates imageIds + metadata from the first', async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.endsWith('/api/dicom/upload')) {
        return new Response(
          JSON.stringify({
            studyId: 'aaa',
            frameCount: 1,
            frameUrls: ['/api/dicom/aaa/frame/0'],
            metadata: { modality: 'PX', bodyPart: 'Jaw region' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchSpy);

    const src = makeServerSource('http://localhost:5000');
    const file = new File([new Uint8Array([1, 2, 3])], 'a.dcm');

    const study = await src.load([file]);

    expect(study.imageIds).toEqual(['http://localhost:5000/api/dicom/aaa/frame/0']);
    expect(study.metadata.modality).toBe('PX');
    expect(study.metadata.bodyPart).toBe('Jaw region');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('handles multiple files by uploading each and concatenating frame URLs', async () => {
    let call = 0;
    const fetchSpy = vi.fn(async () => {
      call++;
      return new Response(
        JSON.stringify({
          studyId: `id-${call}`,
          frameCount: 1,
          frameUrls: [`/api/dicom/id-${call}/frame/0`],
          metadata: { modality: 'MR' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchSpy);

    const src = makeServerSource('http://localhost:5000');
    const files = [
      new File([new Uint8Array([1])], '1.dcm'),
      new File([new Uint8Array([2])], '2.dcm'),
    ];
    const study = await src.load(files);

    expect(study.imageIds).toHaveLength(2);
    expect(study.metadata.modality).toBe('MR');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects when given no files', async () => {
    const src = makeServerSource('http://localhost:5000');
    await expect(src.load([])).rejects.toThrow(/no files/i);
  });

  it('throws on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const src = makeServerSource('http://localhost:5000');
    await expect(src.load([new File([new Uint8Array([1])], 'a.dcm')])).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npm test -- tests/lib/server-source.test.ts
```
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `server-source`**

Create `src/lib/server-source.ts`:
```ts
import type { DicomSource } from './dicom-source.ts';
import type { LoadedStudy, StudyMetadata } from '../types.ts';

interface UploadResponse {
  studyId: string;
  frameCount: number;
  frameUrls: string[];
  metadata: Partial<StudyMetadata> & Record<string, string | undefined>;
}

/**
 * Creates a DicomSource that uploads each File to the backend and returns
 * absolute frame URLs as imageIds. Cornerstone can render `http:` imageIds
 * via its built-in web image loader (PNG input, not DICOM).
 */
export function makeServerSource(baseUrl: string): DicomSource<File[]> {
  return {
    name: 'Server rendering (.NET)',

    async load(files: File[]): Promise<LoadedStudy> {
      if (files.length === 0) throw new Error('serverSource.load: no files provided');

      const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      const allImageIds: string[] = [];
      let firstMetadata: StudyMetadata = {};

      for (let i = 0; i < sorted.length; i++) {
        const file = sorted[i];
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${baseUrl}/api/dicom/upload`, { method: 'POST', body: form });
        if (!res.ok) throw new Error(`upload failed: ${res.status} ${res.statusText}`);
        const data = (await res.json()) as UploadResponse;

        for (const rel of data.frameUrls) {
          allImageIds.push(`${baseUrl}${rel}`);
        }

        if (i === 0) {
          firstMetadata = {
            patientName: data.metadata.patientName,
            patientId: data.metadata.patientId,
            modality: data.metadata.modality,
            bodyPart: data.metadata.bodyPart,
            studyDate: data.metadata.studyDate,
            manufacturer: data.metadata.manufacturer,
          };
        }
      }

      return { imageIds: allImageIds, metadata: firstMetadata };
    },
  };
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm test -- tests/lib/server-source.test.ts
```
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: serverSource DicomSource implementation"
```

---

## Task 6: Adapt `DicomViewer` to render plain-image URLs as well

`server-source` returns `http(s):` URLs pointing at PNGs. Cornerstone3D's dicom-image-loader doesn't handle those; we need a trivial loader for `image:` URLs or let the viewer fall through to an `<img>` fallback for non-DICOM imageIds.

The cleanest approach: register Cornerstone's standard web image loader (already bundled with `@cornerstonejs/core`) so PNG URLs become valid imageIds.

**Files:**
- Modify: `src/lib/cornerstone-init.ts`, `src/lib/server-source.ts`

- [ ] **Step 1: Register a web image loader**

Replace the contents of `src/lib/cornerstone-init.ts`:
```ts
import { init as csInit, imageLoader } from '@cornerstonejs/core';
import { init as csToolsInit } from '@cornerstonejs/tools';
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

let initialized = false;

/**
 * Load a plain PNG/JPEG from an HTTP URL and adapt it to Cornerstone's
 * expected image record shape. Registered under the `web:` scheme so
 * imageIds of the form `web:https://...` are renderable alongside DICOM.
 */
async function loadWebImage(imageId: string) {
  const url = imageId.replace(/^web:/, '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`web image fetch failed: ${res.status}`);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  // Convert RGBA → grayscale Uint8 for simplicity (PNG from server is already
  // grayscale, so any channel works). This avoids dealing with Cornerstone's
  // per-color-channel pipelines.
  const pixelData = new Uint8Array(bitmap.width * bitmap.height);
  for (let i = 0, j = 0; i < data.data.length; i += 4, j++) {
    pixelData[j] = data.data[i];
  }

  return {
    promise: Promise.resolve({
      imageId,
      minPixelValue: 0,
      maxPixelValue: 255,
      slope: 1,
      intercept: 0,
      windowCenter: 128,
      windowWidth: 256,
      getPixelData: () => pixelData,
      rows: bitmap.height,
      columns: bitmap.width,
      height: bitmap.height,
      width: bitmap.width,
      color: false,
      rgba: false,
      columnPixelSpacing: 1,
      rowPixelSpacing: 1,
      invert: false,
      sizeInBytes: pixelData.byteLength,
    }),
    cancelFn: undefined,
  };
}

export async function initCornerstone(): Promise<void> {
  if (initialized) return;
  await csInit();
  await csToolsInit();
  cornerstoneDICOMImageLoader.init({
    maxWebWorkers: Math.min(navigator.hardwareConcurrency || 1, 4),
  });
  // Register the plain web-image loader under `web:`
  imageLoader.registerImageLoader('web', loadWebImage as never);
  initialized = true;
}
```

- [ ] **Step 2: Update `server-source.ts` to prefix frame URLs with `web:`**

In `src/lib/server-source.ts`, change:
```ts
allImageIds.push(`${baseUrl}${rel}`);
```
to:
```ts
allImageIds.push(`web:${baseUrl}${rel}`);
```

Also update the test expectation in `tests/lib/server-source.test.ts`:
```ts
expect(study.imageIds).toEqual(['web:http://localhost:5000/api/dicom/aaa/frame/0']);
```

- [ ] **Step 3: Run tests**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: register web image loader so serverSource PNGs render in viewport"
```

---

## Task 7: `ModeToggle` component + wire into `App.tsx`

**Files:**
- Create: `src/components/ModeToggle.tsx`
- Modify: `src/App.tsx`, `src/components/Toolbar.tsx`

- [ ] **Step 1: Create `ModeToggle`**

Create `src/components/ModeToggle.tsx`:
```tsx
export type RenderMode = 'client' | 'server';

interface Props {
  mode: RenderMode;
  onChange: (mode: RenderMode) => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border border-slate-700 bg-slate-800 text-xs overflow-hidden">
      <button
        className={`px-3 py-1.5 ${mode === 'client' ? 'bg-accent text-slate-950' : 'text-slate-300 hover:bg-slate-700'}`}
        onClick={() => onChange('client')}
      >
        Client
      </button>
      <button
        className={`px-3 py-1.5 ${mode === 'server' ? 'bg-accent text-slate-950' : 'text-slate-300 hover:bg-slate-700'}`}
        onClick={() => onChange('server')}
      >
        Server
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add the toggle to `Toolbar`**

Modify `src/components/Toolbar.tsx` — add a `mode` and `onModeChange` prop, and render `<ModeToggle>`:
```tsx
import { FileDropZone } from './FileDropZone.tsx';
import { ModeToggle, type RenderMode } from './ModeToggle.tsx';

interface Props {
  onFiles: (files: File[]) => void;
  onReset: () => void;
  onToggleMetadata: () => void;
  metadataOpen: boolean;
  studyName: string | null;
  mode: RenderMode;
  onModeChange: (m: RenderMode) => void;
}

export function Toolbar({
  onFiles, onReset, onToggleMetadata, metadataOpen, studyName, mode, onModeChange,
}: Props) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-slate-800 bg-slate-950">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold tracking-tight shrink-0">
          Copilot — <span className="text-accent">DICOM</span>
        </span>
        {studyName && (
          <span className="text-xs text-slate-500 truncate">· {studyName}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle mode={mode} onChange={onModeChange} />
        <FileDropZone onFiles={onFiles} compact />
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-sm rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700"
        >
          Close
        </button>
        <button
          onClick={onToggleMetadata}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            metadataOpen
              ? 'bg-accent text-slate-950 border-accent'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
          }`}
        >
          Metadata
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Update `App.tsx` to switch source by mode**

Modify `src/App.tsx` — import both sources, pick one based on mode:

Replace the `onFiles` callback and related pieces. Full new `App.tsx`:
```tsx
import { useCallback, useMemo, useState } from 'react';
import { fileSource } from './lib/file-source.ts';
import { makeServerSource } from './lib/server-source.ts';
import type { LoadedStudy } from './types.ts';
import { FileDropZone } from './components/FileDropZone.tsx';
import { DicomViewer } from './components/DicomViewer.tsx';
import { SliceScrubber } from './components/SliceScrubber.tsx';
import { MetadataPanel } from './components/MetadataPanel.tsx';
import { Toolbar } from './components/Toolbar.tsx';
import type { RenderMode } from './components/ModeToggle.tsx';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:5000';
const serverSource = makeServerSource(SERVER_URL);

export default function App() {
  const [mode, setMode] = useState<RenderMode>('client');
  const [study, setStudy] = useState<LoadedStudy | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataOpen, setMetadataOpen] = useState(true);
  const [studyName, setStudyName] = useState<string | null>(null);

  const onFiles = useCallback(async (files: File[]) => {
    setLoading(true);
    setError(null);
    try {
      const source = mode === 'client' ? fileSource : serverSource;
      const loaded = await source.load(files);
      setStudy(loaded);
      setCurrentIndex(0);
      setStudyName(files.length === 1 ? files[0].name : `${files.length} slices`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  const onReset = useCallback(() => {
    if (study) {
      for (const id of study.imageIds) {
        if (id.startsWith('wadouri:blob:')) {
          URL.revokeObjectURL(id.replace(/^wadouri:/, ''));
        }
      }
    }
    setStudy(null);
    setCurrentIndex(0);
    setStudyName(null);
    setError(null);
  }, [study]);

  const onModeChange = useCallback((m: RenderMode) => {
    setMode(m);
    // Close the current study on mode switch — a study loaded in one mode
    // isn't valid in the other (imageId schemes differ).
    onReset();
  }, [onReset]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Loading…
        </div>
      );
    }
    if (!study) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <FileDropZone onFiles={onFiles} />
            {error && <div className="mt-4 text-sm text-red-400">{error}</div>}
            <div className="mt-4 text-center text-xs text-slate-500">
              Rendering mode: <span className="text-slate-300">{mode}</span>
              {mode === 'server' && <> — backend must be running at <code>{SERVER_URL}</code></>}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <DicomViewer
            imageIds={study.imageIds}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
          />
          <SliceScrubber
            total={study.imageIds.length}
            current={currentIndex}
            onChange={setCurrentIndex}
          />
        </div>
        {metadataOpen && <MetadataPanel metadata={study.metadata} />}
      </div>
    );
  }, [loading, study, error, onFiles, currentIndex, metadataOpen, mode]);

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        onFiles={onFiles}
        onReset={onReset}
        onToggleMetadata={() => setMetadataOpen((o) => !o)}
        metadataOpen={metadataOpen}
        studyName={studyName}
        mode={mode}
        onModeChange={onModeChange}
      />
      {content}
    </div>
  );
}
```

- [ ] **Step 4: End-to-end smoke test**

Terminal 1:
```bash
cd backend/CopilotDicom.Api
dotnet run --urls http://localhost:5000
```
Terminal 2:
```bash
npm run dev
```
In browser:
1. Toggle mode to **Client**. Drop `samples/dental-pano.dcm`. Expected: renders (Phase 1 behavior).
2. Click "Close". Toggle mode to **Server**. Drop `samples/dental-pano.dcm`. Expected: renders (server-rendered PNG), metadata shows `PX`/Jaw region. No window/level interactivity in server mode — that's expected.

Stop both servers.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: client/server rendering mode toggle"
```

---

## Task 8: Update documentation

**Files:**
- Modify: `README.md`, `backend/README.md` (create)

- [ ] **Step 1: Update root `README.md`**

Add a "Backend" section to `README.md`:
```markdown
## Backend (optional — for Phase 2 server-rendering mode)

    cd backend/CopilotDicom.Api
    dotnet run --urls http://localhost:5000

Then flip the client/server toggle in the top bar. The backend parses DICOM with
fo-dicom and pre-renders frames to PNG; the frontend renders those PNGs as
imageIds. Backend is stateless and in-memory — restart clears everything.

## Test backend

    dotnet test backend/CopilotDicom.sln
```

- [ ] **Step 2: Create `backend/README.md`**

Create `backend/README.md`:
```markdown
# CopilotDicom.Api

ASP.NET Core 8 Minimal API — parses DICOM via fo-dicom and serves rendered PNG frames.

## Endpoints

- `POST /api/dicom/upload` (multipart, field `file`) → `UploadResponse` JSON
- `GET  /api/dicom/{studyId}/frame/{index}` → `image/png`
- `GET  /api/health` → `{"status":"ok"}`

## Run

    dotnet run --urls http://localhost:5000

CORS is open to `http://localhost:5173` only. Change in `Program.cs` if needed.

## Deploy (future)

AWS Lambda via `Amazon.Lambda.AspNetCoreServer`. Not in scope for the hackathon.
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "docs: backend README and updated root README"
```

---

## Done criteria for Phase 2

- [ ] `dotnet test backend/CopilotDicom.sln` — all tests pass
- [ ] `npm test` — all frontend tests pass (including `server-source` tests)
- [ ] Manual: client mode still works (regression check)
- [ ] Manual: server mode renders the dental pano with correct metadata
- [ ] Manual: server mode renders at least one MRI slice
- [ ] No CORS errors in browser console when using server mode

---

## Self-Review Notes

**Spec coverage (§5):**
- Backend accepts `.dcm` and parses with fo-dicom: Task 3 ✓
- Renders frames to PNG: Task 3 ✓
- JSON response shape matches spec: Task 2 (UploadResponse), Task 4 (endpoint) ✓
- `GET /api/dicom/{studyId}/frame/{index}` → PNG: Task 4 ✓
- In-memory `Dictionary<Guid, Study>`: Task 3 (ConcurrentDictionary) ✓
- CORS for localhost:5173: Task 4 ✓
- Mode toggle UI: Task 7 ✓
- Same React viewport works for both: Task 6 + Task 7 ✓
- Accepted trade-off — server mode loses W/L: documented in spec, behaves correctly ✓

**Placeholder scan:** None.

**Type consistency:** `Study`, `StudyMetadata`, `UploadResponse`, `IDicomService`, `DicomService`, `makeServerSource`, `RenderMode`, `ModeToggle` — all consistent across tasks.
