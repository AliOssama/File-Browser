// DOM element caching and UI utilities

export const dom = {
    // Navigation and search
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    
    // Statistics
    stats: document.getElementById('stats'),
    
    // Upload section
    fileInput: document.getElementById('fileInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    uploadStatus: document.getElementById('uploadStatus'),
    
    // Listing table
    listingBody: document.getElementById('listingBody'),
    navigateUpBtn: document.getElementById('navigateUpBtn'),
    currentRoot: document.getElementById('currentRoot'),
    entryTemplate: document.getElementById('entry-row-template'),
    
    // Modals for move/copy/preview
    moveModal: document.getElementById('moveModal'),
    moveDestinationInput: document.getElementById('moveDestinationInput'),
    moveCancelBtn: document.getElementById('moveCancelBtn'),
    moveConfirmBtn: document.getElementById('moveConfirmBtn'),
    
    copyModal: document.getElementById('copyModal'),
    copyDestinationInput: document.getElementById('copyDestinationInput'),
    copyCancelBtn: document.getElementById('copyCancelBtn'),
    copyConfirmBtn: document.getElementById('copyConfirmBtn'),
    
    previewModal: document.getElementById('previewModal'),
    previewModalClose: document.getElementById('previewModalClose'),
    previewFileName: document.getElementById('previewFileName'),
    previewModalBody: document.getElementById('previewModalBody'),
    
    // Dialog
    browserDialog: document.getElementById('browserDialog'),
    openBrowserBtn: document.getElementById('openBrowserBtn'),
    closeBrowserBtn: document.getElementById('closeBrowserBtn')
};

/**
 * Set a listing message (empty state, loading, error)
 * @param {string} message - Message to display
 */
export function setListingMessage(message) {
    dom.listingBody.innerHTML = '';
    const row = document.createElement('tr');
    row.className = 'message-row';
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = message;
    row.appendChild(cell);
    dom.listingBody.appendChild(row);
}

/**
 * Update statistics display
 * @param {Object} stats - Statistics object with files, folders, size properties
 */
export function updateStats(stats) {
    const mappings = Array.from(dom.stats.querySelectorAll('[data-stat]'));
    for (const element of mappings) {
        const key = element.dataset.stat;
        if (key === 'files') {
            element.textContent = `${stats.files} files`;
        } else if (key === 'folders') {
            element.textContent = `${stats.folders} folders`;
        } else if (key === 'size') {
            element.textContent = stats.size;
        }
    }
}

/**
 * Update static UI elements (buttons, breadcrumb, etc)
 * @param {Object} state - Current application state
 */
export function updateStaticUi(state) {
    const breadcrumbPath = state.path || '/';
    dom.currentRoot.textContent = state.query
        ? `Current path: ${breadcrumbPath} (search: ${state.query})`
        : `Current path: ${breadcrumbPath}`;
    dom.navigateUpBtn.disabled = !state.path || state.isLoading;
    dom.uploadBtn.disabled = state.isUploading;
    dom.fileInput.disabled = state.isUploading;
}

/**
 * Show or hide the browser dialog
 * @param {boolean} show - Whether to show or hide
 */
export function toggleBrowserDialog(show) {
    if (show) {
        dom.browserDialog.showModal();
        document.body.classList.add('dialog-shown');
    } else {
        dom.browserDialog.close();
        document.body.classList.remove('dialog-shown');
    }
}

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} [type='info'] - Message type: 'info', 'success', 'error'
 */
export function showStatus(message, type = 'info') {
    dom.uploadStatus.textContent = message;
    dom.uploadStatus.className = `status-${type}`;
}

/**
 * Clear file input
 */
export function clearFileInput() {
    dom.fileInput.value = '';
}

/**
 * Get selected files from input
 * @returns {File[]} Array of selected files
 */
export function getSelectedFiles() {
    return Array.from(dom.fileInput.files ?? []);
}
