// Configuration constants for the file browser application

export const CONFIG = {
    // Search debounce time (milliseconds)
    SEARCH_DEBOUNCE_TIME: 300,
    
    // Preview file size limits
    MAX_TEXT_PREVIEW_SIZE: 1024 * 1024, // 1 MB
    MAX_IMAGE_PREVIEW_SIZE: 500 * 1024, // 500 KB
    MAX_TEXT_PREVIEW_CHARS: 10000
};

// Map image extensions to MIME types
export const IMAGE_MIME_TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp'
};

// Error messages
export const ERROR_MESSAGES = {
    UNEXPECTED_ERROR: 'Unexpected error',
    NO_DATA_RECEIVED: 'No data received from server',
    FAILED_TO_MOVE: 'Failed to move item',
    FAILED_TO_COPY: 'Failed to copy item',
    FAILED_TO_DELETE: 'Failed to delete item',
    FAILED_TO_UPLOAD: 'Failed to upload files',
    FAILED_TO_LOAD_PREVIEW: 'Failed to load preview',
    UNKNOWN_PREVIEW_TYPE: 'Unknown preview type'
};
