using Microsoft.AspNetCore.Antiforgery;
using System.IO;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TestProject.Options;
using TestProject.Services;
using TestProject.Models;
using Microsoft.AspNetCore.Http.Features;

namespace TestProject {
    public class Program {
        public static void Main(string[] args) {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.Configure<FileBrowserOptions>(builder.Configuration.GetSection("FileBrowser"));
            builder.Services.AddSingleton<FileBrowserService>();
            builder.Services.AddProblemDetails();
            
            // Configure form options
            builder.Services.Configure<FormOptions>(options =>
            {
                options.ValueLengthLimit = int.MaxValue;
                options.MultipartBodyLengthLimit = int.MaxValue;
            });

            var app = builder.Build();

            app.UseExceptionHandler(errorApp =>
            {
                errorApp.Run(async context =>
                {
                    var exceptionFeature = context.Features.Get<IExceptionHandlerPathFeature>();
                    var exception = exceptionFeature?.Error;
                    var (statusCode, title) = exception switch
                    {
                        DirectoryNotFoundException => (StatusCodes.Status404NotFound, "Directory not found"),
                        FileNotFoundException => (StatusCodes.Status404NotFound, "File not found"),
                        InvalidOperationException => (StatusCodes.Status400BadRequest, "Invalid operation"),
                        ArgumentException => (StatusCodes.Status400BadRequest, "Invalid argument"),
                        _ => (StatusCodes.Status500InternalServerError, "Unexpected server error")
                    };

                    context.Response.StatusCode = statusCode;
                    context.Response.ContentType = "application/json";

                    var problem = new ProblemDetails
                    {
                        Status = statusCode,
                        Title = title,
                        Detail = exception?.Message,
                        Instance = context.Request.Path
                    };

                    var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("GlobalExceptionHandler");
                    if (exception is not null)
                    {
                        logger.LogError(exception, "Error while processing {Path}", context.Request.Path);
                    }

                    await context.Response.WriteAsJsonAsync(problem);
                });
            });

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.MapGet("/api/files/browse", (string? path, FileBrowserService service) =>
            {
                var result = service.Browse(path);
                return Results.Ok(result);
            });

            app.MapGet("/api/files/search", async Task<IResult> (string? path, string? q, FileBrowserService service, CancellationToken cancellationToken) =>
            {
                var results = await service.SearchAsync(path, q ?? string.Empty, cancellationToken);
                return Results.Ok(results);
            });

            app.MapPost("/api/files/upload", async Task<IResult> ([FromQuery] string? path, HttpRequest request, FileBrowserService service, CancellationToken cancellationToken) =>
            {
                if (!request.HasFormContentType)
                {
                    return Results.BadRequest("Content-Type must be multipart/form-data");
                }

                IFormCollection form;
                try
                {
                    form = await request.ReadFormAsync(cancellationToken);
                }
                catch (Exception)
                {
                    return Results.BadRequest("Failed to read form");
                }

                if (form.Files.Count == 0)
                {
                    return Results.BadRequest("File is required");
                }

                foreach (var file in form.Files)
                {
                    if (file == null)
                    {
                        return Results.BadRequest("Invalid file");
                    }

                    await service.SaveFileAsync(path, file, cancellationToken);
                }

                return Results.Created($"/api/files/browse?path={Uri.EscapeDataString(path ?? string.Empty)}", null);
            }).DisableAntiforgery();

            app.MapGet("/api/files/download", (string path, FileBrowserService service) =>
            {
                var download = service.GetDownloadStream(path);
                return Results.File(download.Stream, download.ContentType, download.FileName);
            });

            app.MapGet("/api/files/preview", ([FromQuery] string path, FileBrowserService service) =>
            {
                try
                {
                    var preview = service.GetFilePreview(path);
                    return Results.Ok(preview);
                }
                catch (FileNotFoundException)
                {
                    return Results.NotFound(new { error = "File not found" });
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
            });

            app.MapDelete("/api/files/delete", (FileBrowserService service, [FromQuery] string path, [FromQuery] bool recursive = false) =>
            {
                if (string.IsNullOrWhiteSpace(path))
                {
                    return Results.BadRequest(new { error = "Path is required" });
                }

                try
                {
                    service.DeletePath(path, recursive);
                    return Results.Ok(new { message = "Item deleted successfully" });
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
                catch (FileNotFoundException)
                {
                    return Results.NotFound(new { error = "Item not found" });
                }
            });

            app.MapPost("/api/files/copy", ([FromBody] CopyMoveRequest request, FileBrowserService service) =>
            {
                if (string.IsNullOrWhiteSpace(request.Source) || string.IsNullOrWhiteSpace(request.Destination))
                {
                    return Results.BadRequest(new { error = "Source and destination paths are required" });
                }

                try
                {
                    service.CopyPath(request.Source, request.Destination);
                    return Results.Ok(new { message = "Item copied successfully" });
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
                catch (FileNotFoundException)
                {
                    return Results.NotFound(new { error = "Source item not found" });
                }
            });

            app.MapPost("/api/files/move", ([FromBody] CopyMoveRequest request, FileBrowserService service) =>
            {
                if (string.IsNullOrWhiteSpace(request.Source) || string.IsNullOrWhiteSpace(request.Destination))
                {
                    return Results.BadRequest(new { error = "Source and destination paths are required" });
                }

                try
                {
                    service.MovePath(request.Source, request.Destination);
                    return Results.Ok(new { message = "Item moved successfully" });
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
                catch (FileNotFoundException)
                {
                    return Results.NotFound(new { error = "Source item not found" });
                }
            });

            app.Run();
        }
    }
}