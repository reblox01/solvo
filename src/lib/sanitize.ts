/**
 * Sanitize user-controllable strings to prevent XSS.
 * Use for any text that will be rendered into the DOM.
 */
export function isSafeObjectKey(key: string): boolean {
    const dangerousKeys = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty'];
    return typeof key === 'string' && key.length > 0 && key.length < 256 && !dangerousKeys.includes(key);
}

/**
 * Validate a LaTeX expression from the API before rendering.
 * Strips potentially dangerous content while preserving math notation.
 */
export function sanitizeLatex(expr: string): string {
    if (typeof expr !== 'string') return '';
    let cleaned = expr.replace(/<[^>]*>/g, '');
    cleaned = cleaned.replace(/javascript:/gi, '');
    cleaned = cleaned.replace(/data:/gi, '');
    cleaned = cleaned.replace(/on\w+\s*=/gi, '');
    return cleaned.trim();
}

/**
 * Validate API response data has expected structure.
 * Returns null if invalid, parsed data if valid.
 */
export function validateCalculateResponse(data: unknown): Array<{ expr: string; result: string; assign: boolean }> | null {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj.data)) return null;

    return obj.data.filter((item: unknown): item is { expr: string; result: string; assign: boolean } => {
        if (!item || typeof item !== 'object') return false;
        const entry = item as Record<string, unknown>;
        return (
            typeof entry.expr === 'string' &&
            typeof entry.result === 'string' &&
            entry.expr.length < 1000 &&
            entry.result.length < 1000
        );
    });
}

/**
 * Validate a file before upload.
 * Checks MIME type and file size.
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Only PNG, JPEG, GIF, and WebP are allowed.' };
    }
    if (file.size > maxSize) {
        return { valid: false, error: 'File too large. Maximum size is 10MB.' };
    }
    if (file.size === 0) {
        return { valid: false, error: 'File is empty.' };
    }
    return { valid: true };
}

/**
 * Escape a string for safe use in a download filename.
 */
export function sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
}
