using System;

namespace TestProject.Models;

public sealed record FilePreview(
    string FileName,
    string FileType,
    string PreviewType,
    string Content,
    string? ErrorMessage = null)
{
    public static FilePreview CreateError(string fileName, string message) =>
        new(fileName, string.Empty, "error", string.Empty, message);

    public static FilePreview TextPreview(string fileName, string content, long truncatedAt = 0) =>
        new(fileName, "text", truncatedAt > 0 ? "text-truncated" : "text", content);

    public static FilePreview ImagePreview(string fileName, string base64Content) =>
        new(fileName, "image", "image-base64", base64Content);

    public static FilePreview Unsupported(string fileName) =>
        new(fileName, "unsupported", "unsupported", string.Empty, "File type not supported for preview");
}
