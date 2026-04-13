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
