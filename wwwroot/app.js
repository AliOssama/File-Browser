// Main application entry point

import { state, setState, resetPagination } from './modules/state.js';
import { dom, setListingMessage, updateStaticUi, toggleBrowserDialog, showStatus, clearFileInput, getSelectedFiles } from './modules/ui.js';
import { browsePath, searchFiles, uploadFiles, getDownloadUrl } from './modules/api.js';
import { renderBrowseResults, renderSearchResults, renderEntries, applyNormalizedPath } from './modules/render.js';
import { closeMoveModal, closeCopyModal, closePreviewModal } from './modules/modals.js';
import { normalizeClientPath, getFileExtension, formatBytes } from './modules/formatting.js';
import { CONFIG, ERROR_MESSAGES } from './modules/config.js';

// Initialize the application
function init() {
    readStateFromUrl();
    bindEvents();
    updateStaticUi(state);
    void loadData();
}

/**
 * Read application state from URL parameters
 */
function readStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    setState({
        path: normalizeClientPath(params.get('path') ?? ''),
        query: params.get('query') ?? ''
    });
    dom.searchInput.value = state.query;
}

/**
 * Bind all event listeners
 */
function bindEvents() {
    // Search form submit
    dom.searchForm.addEventListener('submit', event => {
        event.preventDefault();
        setState({ query: dom.searchInput.value.trim() });
        persistState();
    });

    // Debounced search input (search as you type)
    let searchTimeout;
    dom.searchInput.addEventListener('input', () => {
        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        // Wait 300ms after user stops typing before searching
        searchTimeout = setTimeout(() => {
            setState({ query: dom.searchInput.value.trim() });
            persistState();
        }, 300);
    });

    dom.clearSearchBtn.addEventListener('click', () => {
        if (!state.query) {
            return;
        }
        setState({ query: '' });
        dom.searchInput.value = '';
        persistState();
    });

    // Navigation
    dom.navigateUpBtn.addEventListener('click', () => {
        if (!state.path) {
            return;
        }
        const segments = state.path.split('/').filter(Boolean);
        segments.pop();
        setState({ path: segments.join('/') });
        persistState();
    });

    // Upload
    dom.uploadBtn.addEventListener('click', () => {
        void handleUpload();
    });

    // Browser history
    window.addEventListener('popstate', () => {
        readStateFromUrl();
        updateStaticUi(state);
        void loadData();
    });

    // Dialog management
    dom.openBrowserBtn.addEventListener('click', () => {
        toggleBrowserDialog(true);
    });

    dom.closeBrowserBtn.addEventListener('click', () => {
        toggleBrowserDialog(false);
    });

    // Modal close buttons
    dom.moveCancelBtn.addEventListener('click', closeMoveModal);
    dom.copyCancelBtn.addEventListener('click', closeCopyModal);
    dom.previewModalClose.addEventListener('click', closePreviewModal);

    // Close modals on background click
    dom.previewModal.addEventListener('click', (event) => {
        if (event.target === dom.previewModal) {
            closePreviewModal();
        }
    });
}

/**
 * Load data based on current state (browse or search)
 */
async function loadData() {
    setState({ isLoading: true });
    setListingMessage('Loading...');
    updateStaticUi(state);
    resetPagination();

    try {
        if (state.query) {
            const results = await searchFiles(state.path, state.query);
            renderSearchResults(results, state, loadData, persistState);
        } else {
            const browseResult = await browsePath(state.path);
            applyNormalizedPath(browseResult?.currentPath ?? '', state, updateUrlFromState);
            renderBrowseResults(browseResult);
            
            // Render entries with state and callbacks
            if (browseResult?.entries) {
                renderEntries(browseResult.entries, false, state, loadData, persistState);
            }
        }
    } catch (error) {
        showError(error instanceof Error ? error.message : ERROR_MESSAGES.UNEXPECTED_ERROR);
    } finally {
        setState({ isLoading: false });
        updateStaticUi(state);
    }
}

/**
 * Show error in the UI
 */
function showError(message) {
    setListingMessage(message);
    updateStats({ files: 0, folders: 0, size: '0 bytes' });
    showStatus(message, 'error');
}

/**
 * Update statistics display
 */
function updateStats(stats) {
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
 * Handle file upload
 */
async function handleUpload() {
    const files = getSelectedFiles();
    
    if (files.length === 0) {
        return;
    }
    
    if (state.isUploading) {
        return;
    }

    setState({ isUploading: true });
    updateStaticUi(state);
    showStatus('Uploading...', 'info');

    try {
        await uploadFiles(files, state.path);
        
        showStatus(`Uploaded ${files.length} file(s).`, 'success');
        clearFileInput();
        await loadData();
    } catch (error) {
        showStatus(error instanceof Error ? error.message : ERROR_MESSAGES.FAILED_TO_UPLOAD, 'error');
    } finally {
        setState({ isUploading: false });
        updateStaticUi(state);
    }
}

/**
 * Persist state to URL and reload data
 */
function persistState() {
    updateUrlFromState();
    updateStaticUi(state);
    resetPagination();
    void loadData();
}

/**
 * Update URL from current state
 */
function updateUrlFromState(replace = false) {
    const params = new URLSearchParams();
    if (state.path) {
        params.set('path', state.path);
    }
    if (state.query) {
        params.set('query', state.query);
    }

    const newUrl = params.toString() ? `?${params}` : window.location.pathname;
    if (replace) {
        window.history.replaceState({}, '', newUrl);
    } else {
        window.history.pushState({}, '', newUrl);
    }
}

// Start the application
init();
