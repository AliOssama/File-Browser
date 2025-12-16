namespace TestProject.Models;

public sealed record CopyMoveRequest(
    string Source,
    string Destination);
