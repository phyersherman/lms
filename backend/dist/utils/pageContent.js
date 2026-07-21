"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSlug = exports.RESERVED_SLUGS = exports.validatePageContent = exports.emptyPageContent = void 0;
const crypto_1 = require("crypto");
const emptyPageContent = () => ({
    sections: [
        {
            id: (0, crypto_1.randomUUID)(),
            settings: { paddingY: 'medium' },
            columns: [{ id: (0, crypto_1.randomUUID)(), widthFraction: 1, blocks: [] }],
        },
    ],
});
exports.emptyPageContent = emptyPageContent;
// Structural validation of an editor-supplied content tree. Throws on invalid.
const validatePageContent = (content) => {
    if (!content || typeof content !== 'object' || !Array.isArray(content.sections)) {
        throw new Error('content must be an object with a sections array');
    }
    for (const section of content.sections) {
        if (!section || typeof section.id !== 'string' || !Array.isArray(section.columns)) {
            throw new Error('each section needs an id and columns array');
        }
        for (const column of section.columns) {
            if (!column || typeof column.id !== 'string' || !Array.isArray(column.blocks)) {
                throw new Error('each column needs an id and blocks array');
            }
            for (const block of column.blocks) {
                if (!block || typeof block.id !== 'string' || typeof block.type !== 'string') {
                    throw new Error('each block needs an id and type');
                }
            }
        }
    }
    return content;
};
exports.validatePageContent = validatePageContent;
// Slugs that collide with app routes and can never be used for site pages.
exports.RESERVED_SLUGS = new Set([
    'admin', 'api', 'login', 'logout', 'dashboard', 'my-courses', 'course', 'courses',
    'certificates', 'preview', 'blog', 'checkout', 'accept-invite', 'forgot-password',
    'reset-password', 'passwordless-login', 'passwordless-register', '_next', 'uploads',
    'sitemap.xml', 'robots.txt', 'favicon.ico',
]);
const validateSlug = (slug) => {
    const clean = slug.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
    if (clean === '')
        return ''; // homepage
    const first = clean.split('/')[0];
    if (exports.RESERVED_SLUGS.has(first))
        throw new Error(`slug "${first}" is reserved`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(clean)) {
        throw new Error('slug may only contain lowercase letters, numbers, hyphens and slashes');
    }
    return clean;
};
exports.validateSlug = validateSlug;
