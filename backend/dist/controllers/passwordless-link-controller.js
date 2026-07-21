"use strict";
/**
 * Passwordless Link Management Controller
 *
 * Admin endpoints for managing passwordless access links
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPasswordlessLink = createPasswordlessLink;
exports.getPasswordlessLinks = getPasswordlessLinks;
exports.getPasswordlessLinkById = getPasswordlessLinkById;
exports.updatePasswordlessLink = updatePasswordlessLink;
exports.togglePasswordlessLink = togglePasswordlessLink;
exports.deletePasswordlessLink = deletePasswordlessLink;
const passwordless_access_service_1 = __importDefault(require("../services/passwordless-access-service"));
/**
 * ADMIN: Create a new passwordless access link
 * POST /api/tenants/:tenantId/passwordless-links
 * Body: { name, courseIds, organization?, maxUses?, expiresAt? }
 */
async function createPasswordlessLink(req, res) {
    try {
        const tenantId = req.params.tenantId;
        const { name, courseIds, organization, maxUses, expiresAt } = req.body;
        // Validate required fields
        if (!name)
            return res.status(400).json({ error: 'Link name is required' });
        if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
            return res.status(400).json({ error: 'At least one course ID is required' });
        }
        // Verify user has access to this tenant
        const user = req.user;
        const isGlobalAdmin = user.tenantId === null && user.role === 'admin';
        if (!isGlobalAdmin && user.tenantId !== tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const link = await passwordless_access_service_1.default.createPasswordlessLink({
            tenantId,
            courseIds,
            name,
            organization,
            maxUses: maxUses ? parseInt(maxUses) : undefined,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            createdBy: user.id,
        });
        // Generate the full URL for the link
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const linkUrl = `${baseUrl}/course-access?token=${link.token}`;
        res.status(201).json({
            ...link,
            url: linkUrl,
        });
    }
    catch (error) {
        console.error('[Passwordless Links] Create error:', error);
        res.status(400).json({ error: error.message || 'Failed to create link' });
    }
}
/**
 * ADMIN: Get all passwordless links for a tenant
 * GET /api/tenants/:tenantId/passwordless-links
 * Query: ?courseId={courseId} (optional filter)
 */
async function getPasswordlessLinks(req, res) {
    try {
        const tenantId = req.params.tenantId;
        const { courseId } = req.query;
        // Verify user has access to this tenant
        const user = req.user;
        const isGlobalAdmin = user.tenantId === null && user.role === 'admin';
        if (!isGlobalAdmin && user.tenantId !== tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const links = await passwordless_access_service_1.default.getPasswordlessLinks(tenantId, courseId);
        // Add full URLs to each link
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const linksWithUrls = links.map(link => ({
            ...link,
            url: `${baseUrl}/course-access?token=${link.token}`,
        }));
        res.json(linksWithUrls);
    }
    catch (error) {
        console.error('[Passwordless Links] Get links error:', error);
        res.status(500).json({ error: 'Failed to fetch links' });
    }
}
/**
 * ADMIN: Get a single passwordless link by ID
 * GET /api/passwordless-links/:id
 */
async function getPasswordlessLinkById(req, res) {
    try {
        const id = req.params.id;
        const link = await passwordless_access_service_1.default.getPasswordlessLinkById(id);
        // Verify user has access to this tenant
        const user = req.user;
        const isGlobalAdmin = user.tenantId === null && user.role === 'admin';
        if (!isGlobalAdmin && user.tenantId !== link.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Add full URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const linkWithUrl = {
            ...link,
            url: `${baseUrl}/course-access?token=${link.token}`,
        };
        res.json(linkWithUrl);
    }
    catch (error) {
        console.error('[Passwordless Links] Get link error:', error);
        res.status(404).json({ error: error.message || 'Link not found' });
    }
}
/**
 * ADMIN: Update a passwordless link
 * PUT /api/passwordless-links/:id
 * Body: { name?, organization?, maxUses?, expiresAt?, isActive? }
 */
async function updatePasswordlessLink(req, res) {
    try {
        const id = req.params.id;
        const { name, organization, maxUses, expiresAt, isActive } = req.body;
        // Get the link first to check access
        const existingLink = await passwordless_access_service_1.default.getPasswordlessLinkById(id);
        // Verify user has access to this tenant
        const user = req.user;
        const isGlobalAdmin = user.tenantId === null && user.role === 'admin';
        if (!isGlobalAdmin && user.tenantId !== existingLink.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const updated = await passwordless_access_service_1.default.updatePasswordlessLink(id, {
            name,
            organization,
            maxUses: maxUses !== undefined ? parseInt(maxUses) : undefined,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            isActive,
        });
        // Add full URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const linkWithUrl = {
            ...updated,
            url: `${baseUrl}/course-access?token=${updated.token}`,
        };
        res.json(linkWithUrl);
    }
    catch (error) {
        console.error('[Passwordless Links] Update error:', error);
        res.status(400).json({ error: error.message || 'Failed to update link' });
    }
}
/**
 * ADMIN: Toggle a passwordless link's active status
 * POST /api/passwordless-links/:id/toggle
 */
async function togglePasswordlessLink(req, res) {
    try {
        const id = req.params.id;
        // Get the link first to check access
        const existingLink = await passwordless_access_service_1.default.getPasswordlessLinkById(id);
        // Verify user has access to this tenant
        const user = req.user;
        const isGlobalAdmin = user.tenantId === null && user.role === 'admin';
        if (!isGlobalAdmin && user.tenantId !== existingLink.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const updated = await passwordless_access_service_1.default.togglePasswordlessLink(id);
        res.json({
            message: `Link ${updated.isActive ? 'activated' : 'deactivated'}`,
            isActive: updated.isActive,
        });
    }
    catch (error) {
        console.error('[Passwordless Links] Toggle error:', error);
        res.status(400).json({ error: error.message || 'Failed to toggle link' });
    }
}
/**
 * ADMIN: Delete a passwordless link
 * DELETE /api/passwordless-links/:id
 */
async function deletePasswordlessLink(req, res) {
    try {
        const id = req.params.id;
        // Get the link first to check access
        const existingLink = await passwordless_access_service_1.default.getPasswordlessLinkById(id);
        // Verify user has access to this tenant
        const user = req.user;
        const isGlobalAdmin = user.tenantId === null && user.role === 'admin';
        if (!isGlobalAdmin && user.tenantId !== existingLink.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await passwordless_access_service_1.default.deletePasswordlessLink(id);
        res.json({ message: 'Passwordless link deleted successfully' });
    }
    catch (error) {
        console.error('[Passwordless Links] Delete error:', error);
        res.status(400).json({ error: error.message || 'Failed to delete link' });
    }
}
