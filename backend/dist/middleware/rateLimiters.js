"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteLimiter = exports.formSubmitLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
/**
 * Rate limiter for authentication endpoints (login, register, accept-invite)
 * Protects from brute force attacks
 */
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
/**
 * Rate limiter for invite and password reset endpoints
 * Protects from spam and abuse
 */
/**
 * Rate limiter for public form submissions (spam protection alongside the
 * honeypot field). Generous enough for legitimate visitors.
 */
exports.formSubmitLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: 'Too many submissions, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
exports.inviteLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 requests per windowMs
    message: 'Too many invite or reset requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
