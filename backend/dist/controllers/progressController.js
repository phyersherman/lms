"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourseStructureWithProgress = exports.getCourseProgress = exports.completeCourse = exports.completeChapter = exports.completeModule = void 0;
const progressService_1 = __importDefault(require("../services/progressService"));
/**
 * POST /modules/:moduleId/complete
 * Mark a module as completed
 * Also handles auto-completing chapters and courses, and returns next chapter for navigation
 */
const completeModule = async (req, res) => {
    try {
        const moduleId = Array.isArray(req.params.moduleId) ? req.params.moduleId[0] : req.params.moduleId;
        const { courseId } = req.body;
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!moduleId || !courseId) {
            return res.status(400).json({ error: 'Missing moduleId or courseId' });
        }
        const completion = await progressService_1.default.completeModule(moduleId, userId, courseId, tenantId);
        // Return completion data along with chapter/course completion info
        res.json({
            success: true,
            moduleCompletion: completion,
            // Client can use these to handle UI navigation and celebrations
            chapterCompleted: completion.isLastModuleInChapter,
            nextChapter: completion.nextChapter,
            courseCompleted: completion.courseCompleted,
        });
    }
    catch (error) {
        console.error('Error completing module:', error);
        const status = error.message?.includes('must pass') ? 400 : 500;
        res.status(status).json({ error: error.message || 'Failed to complete module' });
    }
};
exports.completeModule = completeModule;
/**
 * POST /chapters/:chapterId/complete
 * Mark a chapter as completed
 */
const completeChapter = async (req, res) => {
    try {
        const chapterId = Array.isArray(req.params.chapterId) ? req.params.chapterId[0] : req.params.chapterId;
        const { courseId } = req.body;
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!chapterId || !courseId) {
            return res.status(400).json({ error: 'Missing chapterId or courseId' });
        }
        const completion = await progressService_1.default.completeChapter(chapterId, userId, courseId, tenantId);
        res.json(completion);
    }
    catch (error) {
        console.error('Error completing chapter:', error);
        res.status(500).json({ error: error.message || 'Failed to complete chapter' });
    }
};
exports.completeChapter = completeChapter;
/**
 * POST /courses/:courseId/complete
 * Mark a course as completed
 */
const completeCourse = async (req, res) => {
    try {
        const courseId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!courseId) {
            return res.status(400).json({ error: 'Missing courseId' });
        }
        const enrollment = await progressService_1.default.completeCourse(courseId, userId, tenantId);
        res.json(enrollment);
    }
    catch (error) {
        console.error('Error completing course:', error);
        res.status(500).json({ error: error.message || 'Failed to complete course' });
    }
};
exports.completeCourse = completeCourse;
/**
 * GET /courses/:courseId/progress
 * Get course progress for the current user
 */
const getCourseProgress = async (req, res) => {
    try {
        const courseId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
        const userId = req.user?.id;
        const tenantId = req.user?.tenantId;
        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!courseId) {
            return res.status(400).json({ error: 'Missing courseId' });
        }
        const progress = await progressService_1.default.getCourseProgress(courseId, userId, tenantId);
        res.json(progress);
    }
    catch (error) {
        console.error('Error getting course progress:', error);
        res.status(500).json({ error: error.message || 'Failed to get course progress' });
    }
};
exports.getCourseProgress = getCourseProgress;
/**
 * GET /courses/:courseId/structure-with-progress
 * Get course structure with completion status
 */
const getCourseStructureWithProgress = async (req, res) => {
    try {
        const courseId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!courseId) {
            return res.status(400).json({ error: 'Missing courseId' });
        }
        const structure = await progressService_1.default.getCourseStructureWithProgress(courseId, userId);
        res.json(structure);
    }
    catch (error) {
        console.error('Error getting course structure:', error);
        res.status(500).json({ error: error.message || 'Failed to get course structure' });
    }
};
exports.getCourseStructureWithProgress = getCourseStructureWithProgress;
exports.default = {
    completeModule: exports.completeModule,
    completeChapter: exports.completeChapter,
    completeCourse: exports.completeCourse,
    getCourseProgress: exports.getCourseProgress,
    getCourseStructureWithProgress: exports.getCourseStructureWithProgress,
};
