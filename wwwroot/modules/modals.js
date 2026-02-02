// Preview and modal management

import { dom, showStatus } from './ui.js';
import { getFilePreview, deleteItem, moveItem, copyItem } from './api.js';
import { ERROR_MESSAGES } from './config.js';
import { getFileName } from './formatting.js';

/**
 * Show the move modal for an item
 * @param {string} relativePath - Item path
 * @param {Object} state - Current state
 * @param {Function} onComplete - Callback when move is complete
 */
export async function showMoveModal(relativePath, state, onComplete) {
    state.selectedItemForMove = relativePath;
    dom.moveDestinationInput.value = '';
    dom.moveModal.classList.add('open');
    dom.moveDestinationInput.focus();
    
    // Handle move confirmation
    const handleConfirm = async () => {
        const destinationPath = dom.moveDestinationInput.value.trim();
        if (!state.selectedItemForMove || !destinationPath) {
            return;
        }

        try {
            await moveItem(state.selectedItemForMove, destinationPath);
            showStatus('Item moved successfully.', 'success');
            state.selectedItemForMove = null;
            dom.moveModal.classList.remove('open');
            await onComplete();
        } catch (error) {
            showStatus(error instanceof Error ? error.message : ERROR_MESSAGES.FAILED_TO_MOVE, 'error');
        }
    };
    
    // Bind one-time listener
    dom.moveConfirmBtn.onclick = handleConfirm;
}

/**
 * Show the copy modal for an item
 * @param {string} relativePath - Item path
 * @param {Object} state - Current state
 * @param {Function} onComplete - Callback when copy is complete
 */
export async function showCopyModal(relativePath, state, onComplete) {
    state.selectedItemForCopy = relativePath;
    dom.copyDestinationInput.value = '';
    dom.copyModal.classList.add('open');
    dom.copyDestinationInput.focus();
    
    // Handle copy confirmation
    const handleConfirm = async () => {
        const destinationPath = dom.copyDestinationInput.value.trim();
        if (!state.selectedItemForCopy || !destinationPath) {
            return;
        }

        try {
            await copyItem(state.selectedItemForCopy, destinationPath);
            showStatus('Item copied successfully.', 'success');
            state.selectedItemForCopy = null;
            dom.copyModal.classList.remove('open');
            await onComplete();
        } catch (error) {
            showStatus(error instanceof Error ? error.message : ERROR_MESSAGES.FAILED_TO_COPY, 'error');
        }
    };
    
    // Bind one-time listener
    dom.copyConfirmBtn.onclick = handleConfirm;
}

/**
 * Confirm and delete an item
 * @param {string} relativePath - Item path
 * @param {boolean} isDirectory - Whether the item is a directory
 * @param {Function} onComplete - Callback when delete is complete
 */
export async function confirmDeleteItem(relativePath, isDirectory = false, onComplete) {
    const message = isDirectory 
        ? 'Are you sure you want to delete this directory and all its contents?'
        : 'Are you sure you want to delete this item?';
    
    if (!confirm(message)) {
        return;
    }

    try {
        await deleteItem(relativePath, isDirectory);
        showStatus('Item deleted successfully.', 'success');
        await onComplete();
    } catch (error) {
        showStatus(error instanceof Error ? error.message : ERROR_MESSAGES.FAILED_TO_DELETE, 'error');
    }
}

/**
 * Show the preview modal for a file
 * @param {string} relativePath - File path
 */
export async function showPreviewModal(relativePath) {
    dom.previewFileName.textContent = getFileName(relativePath);
    dom.previewModalBody.innerHTML = '<div class="preview-loading">Loading preview...</div>';
    dom.previewModal.classList.add('open');

    try {
        const preview = await getFilePreview(relativePath);
        
        if (preview?.errorMessage) {
            renderPreviewError(preview.errorMessage);
            return;
        }

        renderPreview(preview);
    } catch (error) {
        renderPreviewError(error instanceof Error ? error.message : ERROR_MESSAGES.FAILED_TO_LOAD_PREVIEW);
    }
}

/**
 * Render the appropriate preview based on type
 * @param {Object} preview - Preview data object
 */
function renderPreview(preview) {
    if (preview?.previewType === 'text') {
        renderTextPreview(preview.content);
    } else if (preview?.previewType === 'text-truncated') {
        renderTextPreview(preview.content);
        appendPreviewNote('Preview truncated to first 10,000 characters');
    } else if (preview?.previewType === 'image-base64') {
        renderImagePreview(preview.content);
    } else if (preview?.previewType === 'unsupported') {
        renderPreviewUnsupported();
    } else {
        renderPreviewError(ERROR_MESSAGES.UNKNOWN_PREVIEW_TYPE);
    }
}

/**
 * Render text preview
 * @param {string} content - Text content
 */
function renderTextPreview(content) {
    dom.previewModalBody.innerHTML = '';
    const pre = document.createElement('pre');
    pre.className = 'preview-text';
    pre.textContent = content;
    dom.previewModalBody.appendChild(pre);
}

/**
 * Render image preview
 * @param {string} dataUrl - Base64 data URL
 */
function renderImagePreview(dataUrl) {
    dom.previewModalBody.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'preview-image';
    img.src = dataUrl;
    img.alt = dom.previewFileName.textContent;
    dom.previewModalBody.appendChild(img);
}

/**
 * Render preview error
 * @param {string} message - Error message
 */
function renderPreviewError(message) {
    dom.previewModalBody.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'preview-error';
    div.textContent = `Error: ${message}`;
    dom.previewModalBody.appendChild(div);
}

/**
 * Render unsupported preview message
 */
function renderPreviewUnsupported() {
    dom.previewModalBody.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'preview-unsupported';
    div.innerHTML = '<strong>Preview Not Available</strong><p>This file type does not support inline preview. Try downloading the file instead.</p>';
    dom.previewModalBody.appendChild(div);
}

/**
 * Append a note to the preview (like truncation warning)
 * @param {string} text - Note text
 */
function appendPreviewNote(text) {
    const note = document.createElement('div');
    note.style.marginTop = '1rem';
    note.style.padding = '0.75rem';
    note.style.backgroundColor = '#fef3c7';
    note.style.borderLeft = '4px solid #f59e0b';
    note.textContent = text;
    dom.previewModalBody.appendChild(note);
}

/**
 * Close the preview modal
 */
export function closePreviewModal() {
    dom.previewModal.classList.remove('open');
}

/**
 * Close move modal
 */
export function closeMoveModal() {
    dom.moveModal.classList.remove('open');
}

/**
 * Close copy modal
 */
export function closeCopyModal() {
    dom.copyModal.classList.remove('open');
}
