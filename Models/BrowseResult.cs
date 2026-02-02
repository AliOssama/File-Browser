namespace TestProject.Models;

public sealed record BrowseResult(
    string CurrentPath,
    IReadOnlyList<FileSystemEntry> Entries,
    long TotalBytes,
    int FileCount,
    int DirectoryCount)
{
    public static BrowseResult Empty(string currentPath) => new(
        currentPath,
        Array.Empty<FileSystemEntry>(),
        0,
        0,
        0);
}
