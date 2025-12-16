// Utility functions for formatting and text manipulation

export function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 bytes';
    }
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '--';
    }
    return date.toLocaleString();
}

export function normalizeClientPath(path) {
    return (path ?? '').replace(/\\/g, '/');
}

export function getFileExtension(path) {
    return path ? path.substring(path.lastIndexOf('.')).toLowerCase() : '';
}

export function getFileName(path) {
    return path ? path.split('/').pop() : 'Unknown';
}

export function buildQuery(params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value) {
            search.set(key, value);
        }
    }
    const query = search.toString();
    return query ? `?${query}` : '';
}

export function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '\n\n[Preview truncated...]';
}
