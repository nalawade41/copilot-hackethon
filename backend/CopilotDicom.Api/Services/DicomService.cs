using System.Collections.Concurrent;
using CopilotDicom.Api.Models;
using FellowOakDicom;
using FellowOakDicom.Imaging;
using FellowOakDicom.Imaging.ImageSharp;
using Microsoft.Extensions.DependencyInjection;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;

namespace CopilotDicom.Api.Services;

public sealed class DicomService : IDicomService
{
    private readonly ConcurrentDictionary<Guid, Study> _cache = new();

    static DicomService()
    {
        // Use ImageSharp as fo-dicom's rendering backend (fo-dicom 5.x DI-based setup).
        new DicomSetupBuilder()
            .RegisterServices(s => s
                .AddFellowOakDicom()
                .AddImageManager<ImageSharpImageManager>())
            .Build();
    }

    public async Task<Study> IngestAsync(Stream dicomFile, CancellationToken ct)
    {
        using var ms = new MemoryStream();
        await dicomFile.CopyToAsync(ms, ct);
        ms.Position = 0;

        var dcm = await DicomFile.OpenAsync(ms);
        var ds = dcm.Dataset;

        var meta = NullToEmpty(new StudyMetadata(
            PatientName: ds.GetSingleValueOrDefault(DicomTag.PatientName, string.Empty),
            PatientId: ds.GetSingleValueOrDefault(DicomTag.PatientID, string.Empty),
            Modality: ds.GetSingleValueOrDefault(DicomTag.Modality, string.Empty),
            BodyPart: ds.GetSingleValueOrDefault(DicomTag.BodyPartExamined, string.Empty),
            StudyDate: ds.GetSingleValueOrDefault(DicomTag.StudyDate, string.Empty),
            Manufacturer: ds.GetSingleValueOrDefault(DicomTag.Manufacturer, string.Empty)));

        var image = new DicomImage(dcm.Dataset);
        var frameCount = Math.Max(1, image.NumberOfFrames);

        var frames = new byte[frameCount][];
        for (var i = 0; i < frameCount; i++)
        {
            var rendered = image.RenderImage(i);
            using var imgSharp = rendered.AsSharpImage();
            using var buffer = new MemoryStream();
            // Force 8-bit grayscale PNG output. DICOM X-rays are single-channel;
            // an RGBA encode bloats the payload and confuses viewers that show
            // the alpha channel as transparency.
            await imgSharp.SaveAsync(buffer, new PngEncoder
            {
                ColorType = PngColorType.Grayscale,
                BitDepth = PngBitDepth.Bit8,
            }, ct);
            frames[i] = buffer.ToArray();
        }

        var study = new Study(Guid.NewGuid(), frames, meta);
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
