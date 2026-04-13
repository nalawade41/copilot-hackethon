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
