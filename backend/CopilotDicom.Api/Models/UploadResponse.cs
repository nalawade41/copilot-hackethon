namespace CopilotDicom.Api.Models;

public sealed record UploadResponse(
    Guid StudyId,
    int FrameCount,
    string[] FrameUrls,
    StudyMetadata Metadata);
