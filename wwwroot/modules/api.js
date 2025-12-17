// API communication module

import { buildQuery } from './formatting.js';
import { ERROR_MESSAGES } from './config.js';

/**
 * Fetch JSON data from the API with error handling
 * @param {string} url - The API endpoint URL
 * @param {RequestInit} [options] - Fetch options
 * @returns {Promise<any>} The parsed JSON response
 * @throws {Error} If the response is not ok
 */
export async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
        const message = payload?.detail || payload?.title || response.statusText || 'Request failed';
        throw new Error(message);
    }

    return payload;
}

/**
 * Browse directory contents
 * @param {string} [relativePath] - Optional relative path to browse
 * @returns {Promise<any>} Browse result with entries and statistics
 */
export async function browsePath(relativePath) {
    return fetchJson(`/api/files/browse${buildQuery({ path: relativePath })}`);
}

/**
 * Search for files and directories
 * @param {string} [relativePath] - Optional path to search within
 * @param {string} searchTerm - Search term to look for
 * @returns {Promise<any[]>} Array of matching entries
 */
export async function searchFiles(relativePath, searchTerm) {
    if (!searchTerm || !searchTerm.trim()) {
        return [];
    }
    return fetchJson(`/api/files/search${buildQuery({ path: relativePath, q: searchTerm })}`);
}

/**
 * Upload files to the server
 * @param {File[]} files - Array of files to upload
 * @param {string} [targetPath] - Optional target directory path
 * @returns {Promise<void>}
 */
export async function uploadFiles(files, targetPath) {
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const url = `/api/files/upload${buildQuery({ path: targetPath })}`;
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const contentType = response.headers.get('content-type') ?? '';
        const isJson = contentType.includes('application/json');
        const payload = isJson ? await response.json() : null;

        if (!response.ok) {
            const message = payload?.error || payload?.detail || payload?.title || response.statusText || ERROR_MESSAGES.FAILED_TO_UPLOAD;
            throw new Error(message);
        }
    }
}

/**
 * Get download URL for a file
 * @param {string} relativeFilePath - Relative path to the file
 * @returns {string} Download URL
 */
export function getDownloadUrl(relativeFilePath) {
    return `/api/files/download${buildQuery({ path: relativeFilePath })}`;
}

/**
 * Get file preview data
 * @param {string} relativeFilePath - Relative path to the file
 * @returns {Promise<any>} Preview data object
 */
export async function getFilePreview(relativeFilePath) {
    return fetchJson(`/api/files/preview${buildQuery({ path: relativeFilePath })}`);
}

/**
 * Delete a file or directory
 * @param {string} relativeItemPath - Relative path to the item
 * @param {boolean} [isDirectory=false] - Whether the item is a directory
 * @returns {Promise<void>}
 */
export async function deleteItem(relativeItemPath, isDirectory = false) {
    const response = await fetch(`/api/files/delete${buildQuery({ path: relativeItemPath, recursive: isDirectory ? 'true' : '' })}`, {
        method: 'DELETE'
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
        const message = payload?.error || payload?.detail || response.statusText || ERROR_MESSAGES.FAILED_TO_DELETE;
        throw new Error(message);
    }
}

/**
 * Copy an item (file or directory)
 * @param {string} source - Source relative path
 * @param {string} destination - Destination relative path
 * @returns {Promise<void>}
 */
export async function copyItem(source, destination) {
    const response = await fetch('/api/files/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, destination })
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
        const message = payload?.error || payload?.detail || response.statusText || ERROR_MESSAGES.FAILED_TO_COPY;
        throw new Error(message);
    }
}

/**
 * Move an item (file or directory)
 * @param {string} source - Source relative path
 * @param {string} destination - Destination relative path
 * @returns {Promise<void>}
 */
export async function moveItem(source, destination) {
    const response = await fetch('/api/files/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, destination })
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
        const message = payload?.error || payload?.detail || response.statusText || ERROR_MESSAGES.FAILED_TO_MOVE;
        throw new Error(message);
    }
}
