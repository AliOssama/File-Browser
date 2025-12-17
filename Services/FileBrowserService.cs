using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TestProject.Models;

namespace TestProject.Services;

public sealed class FileBrowserService
{
    private readonly string _rootPath;
    private readonly string _rootPathWithSeparator;
    private readonly ILogger<FileBrowserService> _logger;
    private readonly FileExtensionContentTypeProvider _contentTypeProvider = new();

    public FileBrowserService(IOptions<FileBrowserOptions> options, ILogger<FileBrowserService> logger)
    {
        _logger = logger;
        var configuredRoot = options.Value.RootPath;
        if (string.IsNullOrWhiteSpace(configuredRoot))
        {
            throw new InvalidOperationException("FileBrowser:RootPath is not configured.");
        }

        _rootPath = Path.GetFullPath(configuredRoot);
        Directory.CreateDirectory(_rootPath);
        _rootPathWithSeparator = _rootPath.EndsWith(Path.DirectorySeparatorChar)
            ? _rootPath
            : _rootPath + Path.DirectorySeparatorChar;
    }

    public BrowseResult Browse(string? relativePath)
    {
        var targetDirectory = ResolveDirectoryPath(relativePath);
        var entries = Directory.EnumerateFileSystemEntries(targetDirectory)
            .Select(ToEntry)
            .OrderByDescending(entry => entry.IsDirectory)
            .ThenBy(entry => entry.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var (totalBytes, fileCount, directoryCount) = CalculateTotals(entries);
        var normalizedPath = NormalizeRelativePath(Path.GetRelativePath(_rootPath, targetDirectory));

        return new BrowseResult(normalizedPath, entries, totalBytes, fileCount, directoryCount);
    }

    public Task<IReadOnlyList<FileSystemEntry>> SearchAsync(
        string? relativePath,
        string searchTerm,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
        {
            return Task.FromResult(Array.Empty<FileSystemEntry>() as IReadOnlyList<FileSystemEntry>);
        }

        // Return a properly async task
        return SearchAsyncInternal(relativePath, searchTerm, cancellationToken);
    }

    private async Task<IReadOnlyList<FileSystemEntry>> SearchAsyncInternal(
        string? relativePath,
        string searchTerm,
        CancellationToken cancellationToken)
    {
        var targetDirectory = ResolveDirectoryPath(relativePath);
        var matcher = searchTerm.Trim();
        var results = new List<FileSystemEntry>();

        // Yield to thread pool to avoid blocking
        await Task.Yield();

        // Use async enumeration approach for large directory trees
        var options = new EnumerationOptions { RecurseSubdirectories = true, IgnoreInaccessible = true };
        
        try
        {
            foreach (var path in Directory.EnumerateFileSystemEntries(targetDirectory, "*", options))
            {
                cancellationToken.ThrowIfCancellationRequested();
                
                var name = Path.GetFileName(path);
                if (name.Contains(matcher, StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        results.Add(ToEntry(path));
                    }
                    catch (UnauthorizedAccessException)
                    {
                        // Skip files we can't access
                        _logger.LogWarning("Skipped inaccessible entry during search: {Path}", path);
                    }
                }
            }
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("Access denied during search: {Message}", ex.Message);
        }

        return results;
    }

    public async Task SaveFileAsync(string? relativePath, IFormFile file, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(file);

        var targetDirectory = ResolveDirectoryPath(relativePath);
        var sanitizedName = SanitizeFileName(file.FileName);
        var destinationPath = Path.Combine(targetDirectory, sanitizedName);
        EnsureWithinRoot(destinationPath);

        // Handle duplicate filenames
        var counter = 1;
        var extension = Path.GetExtension(sanitizedName);
        var nameWithoutExt = Path.GetFileNameWithoutExtension(sanitizedName);

        while (File.Exists(destinationPath))
        {
            var newName = $"{nameWithoutExt} ({counter}){extension}";
            destinationPath = Path.Combine(targetDirectory, newName);
            counter++;
        }

        await using var destinationStream = File.Create(destinationPath);
        await file.CopyToAsync(destinationStream, cancellationToken);
    }

    public (FileStream Stream, string ContentType, string FileName) GetDownloadStream(string relativeFilePath)
    {
        if (string.IsNullOrWhiteSpace(relativeFilePath))
        {
            throw new ArgumentException("Relative file path is required.", nameof(relativeFilePath));
        }

        var absolutePath = ResolveAbsolutePath(relativeFilePath);
        if (!File.Exists(absolutePath))
        {
            throw new FileNotFoundException("File not found.", absolutePath);
        }

        if (!_contentTypeProvider.TryGetContentType(absolutePath, out var contentType))
        {
            contentType = "application/octet-stream";
        }

        var stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return (stream, contentType, Path.GetFileName(absolutePath));
    }

    public FilePreview GetFilePreview(string relativeFilePath)
    {
        if (string.IsNullOrWhiteSpace(relativeFilePath))
        {
            throw new ArgumentException("Relative file path is required.", nameof(relativeFilePath));
        }

        var absolutePath = ResolveAbsolutePath(relativeFilePath);
        if (!File.Exists(absolutePath))
        {
            throw new FileNotFoundException("File not found.", absolutePath);
        }

        var fileName = Path.GetFileName(absolutePath);
        var fileInfo = new FileInfo(absolutePath);

        // Max preview size: 1 MB for text, 500 KB for images
        const long maxTextSize = 1024 * 1024;
        const long maxImageSize = 500 * 1024;

        if (fileInfo.Length > maxTextSize)
        {
            return FilePreview.CreateError(fileName, "File too large for preview (max 1 MB)");
        }

        var extension = Path.GetExtension(absolutePath).ToLowerInvariant();
        var isTextFile = IsTextFile(extension);
        var isImageFile = IsImageFile(extension);

        if (isTextFile)
        {
            try
            {
                var content = File.ReadAllText(absolutePath);
                if (content.Length > 10000)
                {
                    content = content[..10000] + "\n\n[Preview truncated...]";
                    return FilePreview.TextPreview(fileName, content, fileInfo.Length);
                }
                return FilePreview.TextPreview(fileName, content);
            }
            catch (Exception ex)
            {
                return FilePreview.CreateError(fileName, $"Failed to read file: {ex.Message}");
            }
        }

        if (isImageFile)
        {
            if (fileInfo.Length > maxImageSize)
            {
                return FilePreview.CreateError(fileName, "Image file too large for preview (max 500 KB)");
            }

            try
            {
                var bytes = File.ReadAllBytes(absolutePath);
                var base64 = Convert.ToBase64String(bytes);
                var mimeType = GetImageMimeType(extension);
                var dataUrl = $"data:{mimeType};base64,{base64}";
                return FilePreview.ImagePreview(fileName, dataUrl);
            }
            catch (Exception ex)
            {
                return FilePreview.CreateError(fileName, $"Failed to read image: {ex.Message}");
            }
        }

        return FilePreview.Unsupported(fileName);
    }

    private static bool IsTextFile(string extension) => extension switch
    {
        ".txt" or ".md" or ".json" or ".xml" or ".html" or ".css" or ".js" or ".ts" or ".cs" or ".java" or ".py" or ".rb" or ".php" or ".cpp" or ".h" or ".log" or ".csv" or ".yml" or ".yaml" or ".toml" or ".conf" or ".config" => true,
        _ => false
    };

    private static bool IsImageFile(string extension) => extension switch
    {
        ".jpg" or ".jpeg" or ".png" or ".gif" or ".webp" or ".svg" or ".bmp" => true,
        _ => false
    };

    private static string GetImageMimeType(string extension) => extension switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".svg" => "image/svg+xml",
        ".bmp" => "image/bmp",
        _ => "image/octet-stream"
    };

    public void DeletePath(string relativeItemPath, bool recursive = false)
    {
        if (string.IsNullOrWhiteSpace(relativeItemPath))
        {
            throw new ArgumentException("Item path is required.", nameof(relativeItemPath));
        }

        var absolutePath = ResolveAbsolutePath(relativeItemPath);
        
        // Check if the path exists before attempting to get attributes
        if (!File.Exists(absolutePath) && !Directory.Exists(absolutePath))
        {
            throw new FileNotFoundException($"Path not found: {absolutePath}");
        }

        var attributes = File.GetAttributes(absolutePath);
        var isDirectory = attributes.HasFlag(FileAttributes.Directory);

        if (isDirectory)
        {
            if (!recursive && Directory.EnumerateFileSystemEntries(absolutePath).Any())
            {
                throw new InvalidOperationException("Directory is not empty. Use recursive deletion to remove non-empty directories.");
            }
            if (recursive)
            {
                DeleteDirectoryRecursive(absolutePath);
            }
            else
            {
                Directory.Delete(absolutePath);
            }
            _logger.LogInformation("Deleted directory: {Path}", absolutePath);
        }
        else
        {
            File.Delete(absolutePath);
            _logger.LogInformation("Deleted file: {Path}", absolutePath);
        }
    }

    private static void DeleteDirectoryRecursive(string directoryPath)
    {
        foreach (var file in Directory.GetFiles(directoryPath))
        {
            File.Delete(file);
        }

        foreach (var subDir in Directory.GetDirectories(directoryPath))
        {
            DeleteDirectoryRecursive(subDir);
        }

        Directory.Delete(directoryPath);
    }

    public void CopyPath(string relativeSourcePath, string relativeDestinationPath)
    {
        if (string.IsNullOrWhiteSpace(relativeSourcePath))
        {
            throw new ArgumentException("Source path is required.", nameof(relativeSourcePath));
        }

        if (string.IsNullOrWhiteSpace(relativeDestinationPath))
        {
            throw new ArgumentException("Destination path is required.", nameof(relativeDestinationPath));
        }

        var sourceAbsolutePath = ResolveAbsolutePath(relativeSourcePath);
        
        // Check if the source path exists before attempting to get attributes
        if (!File.Exists(sourceAbsolutePath) && !Directory.Exists(sourceAbsolutePath))
        {
            throw new FileNotFoundException($"Source path not found: {sourceAbsolutePath}");
        }

        var sourceAttributes = File.GetAttributes(sourceAbsolutePath);
        var isDirectory = sourceAttributes.HasFlag(FileAttributes.Directory);

        if (isDirectory)
        {
            CopyDirectory(sourceAbsolutePath, relativeDestinationPath);
        }
        else
        {
            CopyFile(sourceAbsolutePath, relativeDestinationPath);
        }
    }

    public void MovePath(string relativeSourcePath, string relativeDestinationPath)
    {
        if (string.IsNullOrWhiteSpace(relativeSourcePath))
        {
            throw new ArgumentException("Source path is required.", nameof(relativeSourcePath));
        }

        if (string.IsNullOrWhiteSpace(relativeDestinationPath))
        {
            throw new ArgumentException("Destination path is required.", nameof(relativeDestinationPath));
        }

        var sourceAbsolutePath = ResolveAbsolutePath(relativeSourcePath);
        
        // Check if the source path exists before attempting to get attributes
        if (!File.Exists(sourceAbsolutePath) && !Directory.Exists(sourceAbsolutePath))
        {
            throw new FileNotFoundException($"Source path not found: {sourceAbsolutePath}");
        }

        var sourceAttributes = File.GetAttributes(sourceAbsolutePath);
        var isDirectory = sourceAttributes.HasFlag(FileAttributes.Directory);

        if (isDirectory)
        {
            MoveDirectory(sourceAbsolutePath, relativeDestinationPath);
        }
        else
        {
            MoveFile(sourceAbsolutePath, relativeDestinationPath);
        }
    }

    private void CopyFile(string sourceAbsolutePath, string relativeDestinationPath)
    {
        var sourceName = Path.GetFileName(sourceAbsolutePath);
        var destinationDirectory = ResolveDirectoryPath(relativeDestinationPath);
        var destinationPath = Path.Combine(destinationDirectory, sourceName);
        EnsureWithinRoot(destinationPath);

        var counter = 1;
        var extension = Path.GetExtension(sourceName);
        var nameWithoutExt = Path.GetFileNameWithoutExtension(sourceName);

        while (File.Exists(destinationPath))
        {
            var newName = $"{nameWithoutExt} (copy {counter}){extension}";
            destinationPath = Path.Combine(destinationDirectory, newName);
            counter++;
        }

        File.Copy(sourceAbsolutePath, destinationPath);
        _logger.LogInformation("Copied file from {Source} to {Destination}", sourceAbsolutePath, destinationPath);
    }

    private void CopyDirectory(string sourceAbsolutePath, string relativeDestinationPath)
    {
        var sourceName = Path.GetFileName(sourceAbsolutePath);
        var destinationParentPath = ResolveDirectoryPath(relativeDestinationPath);
        var destinationPath = Path.Combine(destinationParentPath, sourceName);
        EnsureWithinRoot(destinationPath);

        var counter = 1;

        while (Directory.Exists(destinationPath))
        {
            var newName = $"{sourceName} (copy {counter})";
            destinationPath = Path.Combine(destinationParentPath, newName);
            counter++;
        }

        Directory.CreateDirectory(destinationPath);

        // Copy all files
        foreach (var file in Directory.GetFiles(sourceAbsolutePath))
        {
            var destFile = Path.Combine(destinationPath, Path.GetFileName(file));
            File.Copy(file, destFile);
        }

        // Recursively copy all subdirectories
        foreach (var subDir in Directory.GetDirectories(sourceAbsolutePath))
        {
            var subDirName = Path.GetFileName(subDir);
            var destSubDir = Path.Combine(destinationPath, subDirName);
            CopyDirectoryRecursive(subDir, destSubDir);
        }

        _logger.LogInformation("Copied directory from {Source} to {Destination}", sourceAbsolutePath, destinationPath);
    }

    private static void CopyDirectoryRecursive(string sourceDir, string destinationDir)
    {
        Directory.CreateDirectory(destinationDir);

        foreach (var file in Directory.GetFiles(sourceDir))
        {
            var destFile = Path.Combine(destinationDir, Path.GetFileName(file));
            File.Copy(file, destFile);
        }

        foreach (var subDir in Directory.GetDirectories(sourceDir))
        {
            var subDirName = Path.GetFileName(subDir);
            var destSubDir = Path.Combine(destinationDir, subDirName);
            CopyDirectoryRecursive(subDir, destSubDir);
        }
    }

    private void MoveFile(string sourceAbsolutePath, string relativeDestinationPath)
    {
        var sourceName = Path.GetFileName(sourceAbsolutePath);
        var destinationDirectory = ResolveDirectoryPath(relativeDestinationPath);
        var destinationAbsolutePath = Path.Combine(destinationDirectory, sourceName);
        EnsureWithinRoot(destinationAbsolutePath);

        if (string.Equals(sourceAbsolutePath, destinationAbsolutePath, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Source and destination paths cannot be the same.");
        }

        // Handle duplicate filenames by renaming
        var counter = 1;
        var extension = Path.GetExtension(sourceName);
        var nameWithoutExt = Path.GetFileNameWithoutExtension(sourceName);

        while (File.Exists(destinationAbsolutePath))
        {
            var newName = $"{nameWithoutExt} ({counter}){extension}";
            destinationAbsolutePath = Path.Combine(destinationDirectory, newName);
            counter++;
        }

        File.Move(sourceAbsolutePath, destinationAbsolutePath);
        _logger.LogInformation("Moved file from {Source} to {Destination}", sourceAbsolutePath, destinationAbsolutePath);
    }

    private void MoveDirectory(string sourceAbsolutePath, string relativeDestinationPath)
    {
        var sourceName = Path.GetFileName(sourceAbsolutePath);
        var destinationDirectory = ResolveDirectoryPath(relativeDestinationPath);
        var destinationAbsolutePath = Path.Combine(destinationDirectory, sourceName);
        EnsureWithinRoot(destinationAbsolutePath);

        if (string.Equals(sourceAbsolutePath, destinationAbsolutePath, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Source and destination paths cannot be the same.");
        }

        // Handle duplicate directory names by renaming
        var counter = 1;

        while (Directory.Exists(destinationAbsolutePath))
        {
            var newName = $"{sourceName} ({counter})";
            destinationAbsolutePath = Path.Combine(destinationDirectory, newName);
            counter++;
        }

        Directory.Move(sourceAbsolutePath, destinationAbsolutePath);
        _logger.LogInformation("Moved directory from {Source} to {Destination}", sourceAbsolutePath, destinationAbsolutePath);
    }

    private string ResolveDirectoryPath(string? relativePath)
    {
        var absolutePath = ResolveAbsolutePath(relativePath);
        if (!Directory.Exists(absolutePath))
        {
            throw new DirectoryNotFoundException($"Directory not found: {absolutePath}");
        }

        return absolutePath;
    }

    private string ResolveAbsolutePath(string? relativePath)
    {
        var sanitized = NormalizeRelativePath(relativePath);
        var combined = Path.Combine(_rootPath, sanitized);
        var fullPath = Path.GetFullPath(combined);
        
        // Validate path is within root BEFORE checking existence
        EnsureWithinRoot(fullPath);
        
        return fullPath;
    }

    private void EnsureWithinRoot(string absolutePath)
    {
        var isSameAsRoot = string.Equals(absolutePath, _rootPath, StringComparison.OrdinalIgnoreCase);
        var isChild = absolutePath.StartsWith(_rootPathWithSeparator, StringComparison.OrdinalIgnoreCase);
        if (!isSameAsRoot && !isChild)
        {
            _logger.LogWarning("Blocked path traversal attempt: {Path}", absolutePath);
            throw new InvalidOperationException("Access outside the configured root is not permitted.");
        }
    }

    private static string NormalizeRelativePath(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath) || relativePath == ".")
        {
            return string.Empty;
        }

        var normalized = relativePath.Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar)
            .TrimStart(Path.DirectorySeparatorChar);
        return normalized;
    }

    private FileSystemEntry ToEntry(string absolutePath)
    {
        var attributes = File.GetAttributes(absolutePath);
        var isDirectory = attributes.HasFlag(FileAttributes.Directory);

        var size = isDirectory ? 0 : new FileInfo(absolutePath).Length;
        var lastModified = isDirectory
            ? Directory.GetLastWriteTimeUtc(absolutePath)
            : File.GetLastWriteTimeUtc(absolutePath);

        return new FileSystemEntry(
            Path.GetFileName(absolutePath),
            NormalizeRelativePath(Path.GetRelativePath(_rootPath, absolutePath)),
            isDirectory,
            size,
            lastModified);
    }

    private static (long totalBytes, int fileCount, int directoryCount) CalculateTotals(IEnumerable<FileSystemEntry> entries)
    {
        long totalBytes = 0;
        var fileCount = 0;
        var directoryCount = 0;

        foreach (var entry in entries)
        {
            if (entry.IsDirectory)
            {
                directoryCount++;
            }
            else
            {
                fileCount++;
                totalBytes += entry.SizeBytes;
            }
        }

        return (totalBytes, fileCount, directoryCount);
    }

    private static string SanitizeFileName(string fileName)
    {
        var sanitized = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(sanitized))
        {
            throw new InvalidOperationException("File name is invalid.");
        }

        return sanitized;
    }
}
