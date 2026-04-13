using CopilotDicom.Api.Models;
using CopilotDicom.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IDicomService, DicomService>();
builder.Services.AddCors(o =>
    o.AddDefaultPolicy(p => p
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod()));

// No antiforgery service registered — no CSRF threat model for a hackathon demo.
// Default port is 5050 (not 5000) because macOS AirPlay Receiver hijacks 5000.

var app = builder.Build();

app.UseCors();

// Lightweight request logger — prints method + path for every request so we
// can see exactly what the browser is sending.
app.Use(async (ctx, next) =>
{
    Console.WriteLine($"→ {ctx.Request.Method} {ctx.Request.Path}{ctx.Request.QueryString} (Origin: {ctx.Request.Headers.Origin})");
    await next();
    Console.WriteLine($"← {ctx.Response.StatusCode} {ctx.Request.Method} {ctx.Request.Path}");
});

app.MapPost("/api/dicom/upload",
    async (HttpRequest req, IDicomService svc, CancellationToken ct) =>
    {
        if (!req.HasFormContentType)
        {
            // Support raw-body upload too (frontend can skip FormData if it wants).
            if (req.ContentLength is null or 0)
                return Results.BadRequest("empty body");
            var study0 = await svc.IngestAsync(req.Body, ct);
            return BuildResponse(study0);
        }

        var form = await req.ReadFormAsync(ct);
        var file = form.Files["file"];
        if (file is null || file.Length == 0)
            return Results.BadRequest("missing 'file' part");

        await using var stream = file.OpenReadStream();
        var study = await svc.IngestAsync(stream, ct);
        return BuildResponse(study);
    });

app.MapGet("/api/dicom/{studyId:guid}/frame/{index:int}",
    (Guid studyId, int index, IDicomService svc) =>
    {
        var png = svc.GetFrame(studyId, index);
        if (png is null) return Results.NotFound();

        // DEBUG: mirror every served frame under the project's debug-frames/
        // folder (relative to the dotnet process cwd, i.e. backend/CopilotDicom.Api).
        // var debugDir = Path.Combine(Directory.GetCurrentDirectory(), "debug-frames");
        // Directory.CreateDirectory(debugDir);
        // var debugPath = Path.Combine(debugDir, $"{studyId}_{index}.png");
        // File.WriteAllBytes(debugPath, png);
        // Console.WriteLine($"[debug] wrote served frame to {debugPath} ({png.Length} bytes)");

        return Results.File(png, "image/png");
    });

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.Run();

static IResult BuildResponse(Study study)
{
    var urls = Enumerable.Range(0, study.FramePngs.Length)
        .Select(i => $"/api/dicom/{study.Id}/frame/{i}")
        .ToArray();
    return Results.Ok(new UploadResponse(study.Id, study.FramePngs.Length, urls, study.Metadata));
}
