using System;

namespace TestProject.Models;

public sealed record FileSystemEntry(
    string Name,
    string RelativePath,
    bool IsDirectory,
    long SizeBytes,
    DateTimeOffset LastModified);
