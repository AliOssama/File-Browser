// State management module

export const state = {
    path: '',
    query: '',
    isUploading: false,
    isLoading: false,
    selectedItemForMove: null,
    selectedItemForCopy: null,
    currentPage: 0,
    allEntries: [],
    displayedEntries: []
};

// State update functions
export function setState(updates) {
    Object.assign(state, updates);
}

export function getState() {
    return { ...state };
}
