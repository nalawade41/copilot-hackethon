using CopilotDicom.Api.Services;
using Xunit;

namespace CopilotDicom.Api.Tests;

public class DicomServiceTests
{
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
        Assert.True(study.FramePngs[0].Length > 100);
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
