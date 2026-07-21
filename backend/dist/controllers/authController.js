"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const authService_1 = __importDefault(require("../services/authService"));
const emailService = __importStar(require("../services/emailService"));
const loginAttemptTracker_1 = require("../middleware/loginAttemptTracker");
function cookieOptions(maxAgeDays) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
        path: '/'
    };
}
// Login sets an HttpOnly cookie with JWT and returns the user object.
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'email and password required' });
    // Check if user is rate limited
    if ((0, loginAttemptTracker_1.isRateLimited)(email)) {
        const resetTime = (0, loginAttemptTracker_1.getResetTime)(email);
        return res.status(429).json({
            error: 'Too many failed login attempts',
            rateLimitInfo: {
                remainingAttempts: 0,
                resetTimeSeconds: resetTime,
                message: `Too many failed attempts. Please try again in ${resetTime} seconds.`
            }
        });
    }
    // Pass tenantId from tenantResolver middleware (if available)
    const result = await authService_1.default.authenticate(email, password, req.tenantId);
    if (!result) {
        (0, loginAttemptTracker_1.recordFailedAttempt)(email);
        const remainingAttempts = (0, loginAttemptTracker_1.getRemainingAttempts)(email);
        return res.status(401).json({
            error: 'invalid credentials',
            rateLimitInfo: {
                remainingAttempts,
                message: remainingAttempts > 0
                    ? `Incorrect email or password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
                    : 'Too many failed attempts. Please try again later.'
            }
        });
    }
    // Clear failed attempts on successful login
    (0, loginAttemptTracker_1.clearAttempts)(email);
    const accessToken = result.accessToken;
    const refresh = result.refresh;
    // set access token (short-lived)
    res.cookie('token', accessToken, cookieOptions(0.0104)); // ~15 minutes
    // set refresh token (long-lived)
    const refreshMaxDays = 30;
    res.cookie('refreshToken', refresh.token, cookieOptions(refreshMaxDays));
    res.json({ user: { id: result.user.id, email: result.user.email, role: result.user.role, tenantId: result.user.tenantId } });
};
const register = async (req, res) => {
    const { email, password, tenantId, fullName } = req.body;
    if (!email || !password || !tenantId)
        return res.status(400).json({ error: 'email, password, tenantId required' });
    const user = await authService_1.default.register(email, password, tenantId, fullName);
    res.status(201).json({ id: user.id, email: user.email });
};
const logout = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
        try {
            await authService_1.default.revokeRefreshToken(refreshToken);
        }
        catch (e) { /* ignore */ }
    }
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.json({ ok: true });
};
const refresh = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken)
        return res.status(401).json({ error: 'missing refresh token' });
    const user = await authService_1.default.verifyRefreshToken(refreshToken);
    if (!user)
        return res.status(401).json({ error: 'invalid refresh token' });
    // rotate: revoke old and issue new
    try {
        await authService_1.default.revokeRefreshToken(refreshToken);
    }
    catch (e) { }
    const newRefresh = await authService_1.default.createRefreshToken(user.id);
    const newAccess = authService_1.default.createAccessToken(user);
    res.cookie('token', newAccess, cookieOptions(0.0104));
    res.cookie('refreshToken', newRefresh.token, cookieOptions(30));
    res.json({ user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId } });
};
/**
 * POST /auth/accept-invite
 * User accepts an invite and sets their password
 */
const acceptInvite = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }
        const user = await authService_1.default.acceptInvite(token, password);
        // Send welcome email (non-blocking)
        try {
            await emailService.sendWelcomeEmail(user.email, user.fullName || user.email, user.tenantId || undefined);
        }
        catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the request if welcome email fails
        }
        res.json({
            success: true,
            message: 'Password set successfully. You can now login.',
            user: { id: user.id, email: user.email }
        });
    }
    catch (error) {
        console.error('Accept invite error:', error);
        if (error.message.includes('Invalid') || error.message.includes('expired')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to accept invite' });
    }
};
/**
 * POST /auth/forgot-password
 * Initiates password reset flow
 * Always returns 200 to avoid email enumeration
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        // Pass tenantId if available from tenantResolver
        const result = await authService_1.default.forgotPassword(email, req.tenantId);
        // Send reset email if user exists (result.token will be set)
        if (result.token) {
            try {
                await emailService.sendResetPasswordEmail(result.userEmail, result.userEmail, // Use email as name fallback
                result.token, req.tenantId);
            }
            catch (emailError) {
                console.error('Failed to send reset email:', emailError);
                // Don't reveal email send failure to user
            }
        }
        // Always return success (don't reveal if email exists)
        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.',
            // TEMP: Include token in non-production for testing
            ...(process.env.NODE_ENV !== 'production' && result.token ? { resetToken: result.token } : {})
        });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        // Still return success to avoid revealing user existence
        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    }
};
/**
 * POST /auth/reset-password
 * Resets password using a valid reset token
 */
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }
        await authService_1.default.resetPassword(token, password);
        res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        if (error.message.includes('Invalid') || error.message.includes('expired')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
exports.default = { login, register, logout, refresh, acceptInvite, forgotPassword, resetPassword };
