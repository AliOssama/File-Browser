# File Browser
A web-based file browsing application with search, upload/download, and file management capabilities. 
Features a responsive single-page application (SPA) built with vanilla JavaScript and ASP.NET Core backend using minimal APIs for a lightweight, focused REST service.

## Prerequisites
- **.NET 8 SDK
- A modern web browser (Chrome, Firefox, Safari, Edge)

## Running the Application

### 1. Configure the Root Directory

Edit `appsettings.json` to set your file browsing root directory:

**Windows example:**
```json
{
  "FileBrowser": {
    "RootPath": "C:\\MyFiles"
  }
}
```

**Linux/Mac example:**
```json
{
  "FileBrowser": {
    "RootPath": "/home/user/files"
  }
}
```

### 2. Run the Application

From the project directory:

```bash
dotnet run
```
Then navigate to https://localhost:7146

OR

From VS Code or Visual Studio, run the project using the built-in debugger.
The application will start and display the URL (typically `https://localhost:7146`).

### 3. Open in Browser

- Once you navigate and load the site
- Click the **folder icon** (floating button in top-left) to open the file browser dialog

## Features

- **Browse** - Navigate directories from the configured root with visual folder/file icons
- **Search** - Full-text search across all files and folders with real-time results (debounced)
- **Upload** - Upload single or multiple files to any directory
- **Download** - Download any file from the browser
- **Copy** - Copy files and folders to any destination
- **Move** - Move files and folders between directories
- **Delete** - Delete files and folders (with recursive deletion for non-empty directories)
- **Preview** - Preview files (Currently supports text files and images)
- **Deep Linking** - URLs reflect current directory and search state for shareable links
- **File Statistics** - Display file count, folder count, and total size for current directory
- **Path Validation** - Security measures prevent path traversal attacks

## How to Use

### Open File Browser

Click the floating **folder icon** button in the top-left corner to open the file browser dialog. The button bounces when the dialog is closed to draw attention.

### Browse Files

- **Navigate into folders** - Click on any folder name to open it
- **Go up one level** - Click the **Up** button to navigate to the parent directory
- **View current path** - The current path is displayed at the top of the dialog
- **Root indicator** - An empty path (/) represents the configured root directory

### Upload Files

1. Click the **Choose Files** button in the Upload section
2. Select one or more files from your computer
3. Click the **Upload** button
4. Files appear in the current directory immediately after upload completes
5. A success or error message displays at the bottom
6. If a file with the same name exists, it is automatically renamed (e.g., "document (1).txt")

**Note:** Multiple file uploads are processed sequentially.

### Search Files

1. Enter a search term in the **search box** (top-right of the dialog)
2. Results update automatically as you type (with 300ms debounce delay)
3. Results show all matching files and folders across the entire directory tree
4. Click on folders in search results to navigate into them
5. Click **Clear** to return to normal directory browsing

### Download Files

- Click the **Download** button on any file row
- The file downloads to your computer's default downloads folder
- The download uses the original filename

### Copy Files and Folders

1. Click the **Copy** button on the file or folder you want to copy
2. A modal dialog appears asking for the destination path
3. Enter a destination path or `/` for root
4. Click **Copy** to confirm
5. The item is copied to the destination
   - **Files** - Automatically renamed if a file with the same name exists (e.g., "file (copy 1).txt")
   - **Folders** - Automatically renamed if a folder with the same name exists (e.g., "MyFolder (copy 1)")
   - **Recursive** - All contents of folders are recursively copied

### Move Files and Folders

1. Click the **Move** button on the file or folder you want to move
2. A modal dialog appears asking for the destination path
3. Enter a destination path
4. Click **Move** to confirm
5. The item is moved to the new location
6. If an item with the same name already exists at the destination, it is automatically renamed (e.g., "file (1).txt")


### Delete Files and Folders

1. Click the **Delete** button on the file or folder
2. A confirmation dialog appears
   - **For files:** "Are you sure you want to delete this item?"
   - **For directories:** "Are you sure you want to delete this directory and all its contents?"
3. Click **OK** to confirm deletion
4. Items are permanently deleted (not sent to trash)

### Preview Files

1. Click the **Preview** button on a text or image file
2. A modal displays the file content
3. Click the **X** button or click outside the modal to close preview

**Preview Size Limits:**
- Text files: Max 1 MB (truncated at 10,000 characters for display)
- Images: Max 500 KB
- Unsupported file types show an informative message

## API Endpoints

All endpoints accept and return JSON. The API is RESTful and can be called directly.

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|-----------|
| GET | `/api/files/browse` | List directory contents | `path` (optional - relative path) |
| GET | `/api/files/search` | Search for files/folders | `path` (optional), `q` (search term) |
| POST | `/api/files/upload` | Upload file(s) | `path` (optional - target directory), form data |
| GET | `/api/files/download` | Download a file | `path` (required - relative file path) |
| GET | `/api/files/preview` | Get file preview | `path` (required - relative file path) |
| POST | `/api/files/copy` | Copy file/folder | Body: `{ "source": "path", "destination": "path" }` |
| POST | `/api/files/move` | Move file/folder | Body: `{ "source": "path", "destination": "path" }` |
| DELETE | `/api/files/delete` | Delete file/folder | `path` (required), `recursive` (optional - "true" for directories) |

### Request/Response Examples

**Browse directory:**
```
GET /api/files/browse?path=MyFolder
```

**Search files:**
```
GET /api/files/search?path=MyFolder&q=document
```

**Copy item:**
```
POST /api/files/copy
Content-Type: application/json

{
  "source": "Documents/old.txt",
  "destination": "Archive/"
}
```

## Project Structure

```
TestProject/
|-- Program.cs                      # API routes and middleware configuration
|-- appsettings.json                # Application configuration
|-- Models/
|   |-- FileSystemEntry.cs          # File/folder metadata
|   |-- BrowseResult.cs             # Browse API response
|   |-- CopyMoveRequest.cs          # Copy/move request body
|   |-- FilePreview.cs              # File preview response
|   |-- FileBrowserOptions.cs       # Configuration options
|-- Services/
|   |-- FileBrowserService.cs       # Core file operation logic
|-- wwwroot/
    |-- index.html                  # Main HTML page with styles
    |-- app.js                      # Application initialization and main event handling
    |-- modules/
        |-- api.js                  # API client functions
        |-- config.js               # Constants and configuration
        |-- formatting.js           # Utility functions (formatting, paths, etc.)
        |-- modals.js               # Modal dialogs (preview, copy, move, delete)
        |-- render.js               # HTML rendering for file listings
        |-- state.js                # Client-side state management
        |-- ui.js                   # DOM element caching and UI utilities
