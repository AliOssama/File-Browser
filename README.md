# File Browser

A web-based file browsing application with search, upload/download, and file management capabilities.

## Quick Start

### Prerequisites
- .NET 8 SDK

### Running the Application

1. **Configure the root directory** in `appsettings.json`:
   ```json
   {
     "FileBrowser": {
       "RootPath": "C:\\MyFiles"  // Windows
     }
   }
   ```
   Or on Linux/Mac:
   ```json
   {
     "FileBrowser": {
       "RootPath": "/home/user/files"
     }
   }
   ```

2. **Run the application**:
   ```bash
   cd TestProject
   dotnet run
   ```

3. **Open in browser**:
   - Navigate to `https://localhost:5001`
   - Click the file browser button (folder icon) to open the dialog

## Features

- **Browse** - Navigate directories from the configured root
- **Search** - Full-text search across all files and folders
- **Upload** - Upload single or multiple files
- **Download** - Download any file
- **Copy** - Copy files and folders
- **Move** - Move files and folders
- **Delete** - Delete files and folders
- **Preview** - Preview text files and images
- **Deep Linking** - URLs reflect current directory and search state

## How to Use

### Open File Browser
Click the folder icon button in the top-left corner to open the file browser dialog.

### Browse Files
- Click on folders to navigate into them
- Click "Up" button to go to parent directory
- Current path shown at top

### Upload Files
1. Click file input field or drag files onto it
2. Click "Upload" button
3. Files appear in current directory after upload

### Search Files
1. Enter search term in search box
2. Click "Search" button
3. Results shown as table of matching files/folders
4. Click "Clear" to return to directory browsing

### Download Files
Click the filename to download any file to your computer.

### Copy/Move Files
1. Click "Copy" or "Move" button on the file/folder
2. Enter destination path (relative path from root, or "/" for root)
3. Click "Copy" or "Move" button to confirm

### Delete Files
1. Click "Delete" button on file or folder
2. Confirm deletion
3. File/folder deleted (works with full directories)

### Preview Files
Click "Preview" on text or image files to view content in modal.

## API Endpoints

All endpoints return JSON.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files/browse` | List directory contents |
| GET | `/api/files/search` | Search files |
| POST | `/api/files/upload` | Upload files |
| GET | `/api/files/download` | Download file |
| GET | `/api/files/preview` | Get file preview |
| POST | `/api/files/copy` | Copy file/folder |
| POST | `/api/files/move` | Move file/folder |
| DELETE | `/api/files/delete` | Delete file/folder |

**Query Parameters:**
- `path` - Relative path (encoded)
- `q` - Search term
- `recursive` - For delete operations

## Project Structure

```
TestProject/
??? Program.cs                    # API routes and middleware
??? Services/
?   ??? FileBrowserService.cs     # File operations
??? Models/
?   ??? FileSystemEntry.cs        # File/folder data
?   ??? BrowseResult.cs           # Browse response
?   ??? CopyMoveRequest.cs        # Move/copy request
?   ??? FilePreview.cs            # Preview response
??? Options/
?   ??? FileBrowserOptions.cs     # Configuration
??? wwwroot/
    ??? index.html                # UI page
    ??? app.js                    # Main coordinator
    ??? modules/                  # JavaScript modules
        ??? config.js             # Constants and config
        ??? state.js              # State management
        ??? api.js                # API calls
        ??? ui.js                 # DOM manipulation
        ??? render.js             # HTML rendering
        ??? modals.js             # Dialog management
        ??? formatting.js         # Utilities
```

## Configuration

Edit `appsettings.json` to change:
- `RootPath` - Base directory for browsing (required)
- `Logging` - Log levels for debugging

## Technical Details

- **Backend**: ASP.NET Core 8 with REST API
- **Frontend**: Vanilla JavaScript (ES6 modules, no frameworks)
- **Architecture**: Modular JavaScript with clear separation of concerns
- **Performance**: DOM caching, async search, smart preview limits
- **Security**: Path validation, input sanitization, directory escape prevention
