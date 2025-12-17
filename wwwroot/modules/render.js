// Rendering module for file listings

import { dom, setListingMessage, updateStats } from './ui.js';
import { formatBytes, formatDate, normalizeClientPath, getFileName } from './formatting.js';
import { showMoveModal, showCopyModal, confirmDeleteItem, showPreviewModal } from './modals.js';
import { getDownloadUrl } from './api.js';

/**
 * Render browse results
 * @param {Object} result - Browse result from API
 */
export function renderBrowseResults(result) {
    if (!result) {
        setListingMessage('No data received from server.');
        return;
    }

    const entries = Array.isArray(result.entries) ? result.entries : [];
    renderEntries(entries);
    updateStats({
        files: result.fileCount ?? 0,
        folders: result.directoryCount ?? 0,
        size: formatBytes(result.totalBytes ?? 0)
    });
}

/**
 * Render search results
 * @param {Array} entries - Array of entries
 * @param {Object} [state] - Application state for callback binding
 * @param {Function} [onLoadData] - Callback to reload data
 * @param {Function} [persistCallback] - Callback to persist state
 */
export function renderSearchResults(entries, state = null, onLoadData = null, persistCallback = null) {
    const list = Array.isArray(entries) ? entries : [];
    renderEntries(list, true, state, onLoadData, persistCallback);

    let files = 0;
    let folders = 0;
    let totalBytes = 0;
    for (const entry of list) {
        if (entry?.isDirectory) {
            folders += 1;
        } else {
            files += 1;
            totalBytes += entry?.sizeBytes ?? 0;
        }
    }

    updateStats({ files, folders, size: formatBytes(totalBytes) });
}

/**
 * Render entries in the listing table
 * @param {Array} entries - Array of file/directory entries
 * @param {boolean} [isSearch=false] - Whether this is a search result
 * @param {Object} [state] - Application state for callback binding
 * @param {Function} [onLoadData] - Callback to reload data
 * @param {Function} [persistCallback] - Callback to persist state and reload
 */
export function renderEntries(entries, isSearch = false, state = null, onLoadData = null, persistCallback = null) {
    if (!entries.length) {
        const message = isSearch && state?.query
            ? `No matches for "${state.query}".`
            : 'Directory is empty.';
        setListingMessage(message);
        return;
    }

    dom.listingBody.innerHTML = '';
    for (const entry of entries) {
        const rowFragment = dom.entryTemplate.content.cloneNode(true);
        const row = rowFragment.querySelector('tr');
        const relativePath = normalizeClientPath(entry?.relativePath ?? '');

        const nameCell = row.querySelector('.entry-name');
        const sizeCell = row.querySelector('.entry-size');
        const modifiedCell = row.querySelector('.entry-modified');
        const actionsCell = row.querySelector('.entry-actions');

        // Render name cell with icon
        if (entry?.isDirectory) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'link-button';
            button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg><span>${entry.name || '(unnamed folder)'}</span>`;
            button.addEventListener('click', () => navigateToPath(relativePath, state, { clearQuery: true, persistCallback }));
            nameCell.replaceChildren(button);
        } else {
            const container = document.createElement('div');
            container.style.display = 'inline-flex';
            container.style.alignItems = 'flex-start';
            container.style.gap = '0.5rem';
            container.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg><span>${entry?.name || '(unnamed file)'}</span>`;
            nameCell.replaceChildren(container);
        }

        // Render size and date cells
        sizeCell.textContent = entry?.isDirectory ? '--' : formatBytes(entry?.sizeBytes ?? 0);
        modifiedCell.textContent = entry?.lastModified ? formatDate(entry.lastModified) : '--';

        // Render action buttons
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'actions';

        // Download button for files
        if (!entry?.isDirectory) {
            const downloadBtn = document.createElement('button');
            downloadBtn.type = 'button';
            downloadBtn.className = 'action-btn';
            downloadBtn.textContent = 'Download';
            downloadBtn.addEventListener('click', () => {
                window.location.href = getDownloadUrl(relativePath);
            });
            actionsWrapper.appendChild(downloadBtn);
        }

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'action-btn copy';
        copyBtn.textContent = 'Copy';
        if (state && onLoadData) {
            copyBtn.addEventListener('click', () => showCopyModal(relativePath, state, onLoadData));
        }
        actionsWrapper.appendChild(copyBtn);

        // Move button
        const moveBtn = document.createElement('button');
        moveBtn.type = 'button';
        moveBtn.className = 'action-btn move';
        moveBtn.textContent = 'Move';
        if (state && onLoadData) {
            moveBtn.addEventListener('click', () => showMoveModal(relativePath, state, onLoadData));
        }
        actionsWrapper.appendChild(moveBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'action-btn delete';
        deleteBtn.textContent = 'Delete';
        if (onLoadData) {
            deleteBtn.addEventListener('click', () => confirmDeleteItem(relativePath, entry?.isDirectory ?? false, onLoadData));
        }
        actionsWrapper.appendChild(deleteBtn);

        // Preview button for files
        if (!entry?.isDirectory) {
            const previewBtn = document.createElement('button');
            previewBtn.type = 'button';
            previewBtn.className = 'action-btn preview';
            previewBtn.textContent = 'Preview';
            previewBtn.addEventListener('click', () => showPreviewModal(relativePath));
            actionsWrapper.appendChild(previewBtn);
        }

        actionsCell.replaceChildren(actionsWrapper);
        dom.listingBody.appendChild(row);
    }
}

/**
 * Navigate to a path in the file system
 * @param {string} newPath - New path to navigate to
 * @param {Object} state - Application state
 * @param {Object} [options={}] - Navigation options
 */
function navigateToPath(newPath, state, options = {}) {
    if (!state) return;
    
    state.path = normalizeClientPath(newPath);
    if (options.clearQuery) {
        state.query = '';
        dom.searchInput.value = '';
    }
    
    // Call persistCallback if provided, otherwise call onNavigate
    if (options.persistCallback) {
        options.persistCallback();
    } else if (options.onNavigate) {
        options.onNavigate();
    }
}

/**
 * Apply normalized path to state and update URL if needed
 * @param {string} rawPath - Raw path from server
 * @param {Object} state - Application state
 * @param {Function} updateUrl - Function to update URL
 */
export function applyNormalizedPath(rawPath, state, updateUrl) {
    const normalized = normalizeClientPath(rawPath ?? '');
    if (state.path !== normalized) {
        state.path = normalized;
        updateUrl(true);
    }
}
