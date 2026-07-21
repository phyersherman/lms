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
const client_1 = __importDefault(require("../db/client"));
const chapterService = __importStar(require("./chapterService"));
const moduleService = __importStar(require("./moduleService"));
const blockService = __importStar(require("./blockService"));
const courseDataService_1 = require("./courseDataService");
/**
 * Course Service (Facade)
 * Aggregates core course CRUD operations and delegates to specialized services
 * Maintains backward compatibility through re-exported functions
 */
/**
 * Creates a new course
 */
const createCourse = async (data) => {
    const course = await client_1.default.course.create({
        data: {
            title: data.title,
            description: data.description || null,
            tenant_id: data.tenant_id || null
        }
    });
    // Create chapters if provided
    if (data.chapters && data.chapters.length > 0) {
        for (const chapter of data.chapters) {
            const createdChapter = await chapterService.createChapter({
                course_id: course.id,
                title: chapter.title,
                order_index: chapter.order_index
            });
            // Create modules if provided
            if (chapter.modules && chapter.modules.length > 0) {
                for (const module of chapter.modules) {
                    const createdModule = await moduleService.createModule({
                        chapter_id: createdChapter.id,
                        title: module.title,
                        slug: module.slug,
                        summary: module.summary,
                        order_index: module.order_index
                    });
                    // Create blocks if provided
                    if (module.blocks && module.blocks.length > 0) {
                        for (const block of module.blocks) {
                            // Config must be stringified if it's an object (DB stores JSON as string)
                            const configStr = block.config && typeof block.config === 'object'
                                ? JSON.stringify(block.config)
                                : block.config;
                            await blockService.createBlock({
                                module_id: createdModule.id,
                                type: block.type,
                                content: block.content,
                                config: configStr,
                                order_index: block.order_index
                            });
                        }
                    }
                }
            }
        }
    }
    return getById(course.id);
};
/**
 * Lists all global courses (tenant_id is null)
 */
const listGlobalCourses = async () => {
    return client_1.default.course.findMany({
        where: { tenant_id: null },
        include: { chapters: { orderBy: { order_index: 'asc' }, include: { modules: { orderBy: { order_index: 'asc' }, include: { blocks: { orderBy: { order_index: 'asc' } } } } } } }
    });
};
/**
 * Lists all courses for a specific tenant
 */
const listByTenant = async (tenant_id) => {
    return client_1.default.course.findMany({
        where: { tenant_id },
        include: { chapters: { orderBy: { order_index: 'asc' }, include: { modules: { orderBy: { order_index: 'asc' }, include: { blocks: { orderBy: { order_index: 'asc' } } } } } } }
    });
};
/**
 * Gets a single course by ID with all its structure
 */
const getById = async (id) => {
    return client_1.default.course.findUnique({
        where: { id },
        include: { chapters: { orderBy: { order_index: 'asc' }, include: { modules: { orderBy: { order_index: 'asc' }, include: { blocks: { orderBy: { order_index: 'asc' } } } } } } }
    });
};
/**
 * Updates course basic info and/or structure
 */
const updateCourse = async (id, data) => {
    // Update course basic info
    const course = await client_1.default.course.update({
        where: { id },
        data: {
            ...(data.title && { title: data.title }),
            ...(data.description !== undefined && { description: data.description })
        }
    });
    // If chapters provided, sync them with existing chapters
    if (data.chapters !== undefined) {
        const existingChapters = await client_1.default.chapter.findMany({ where: { course_id: id } });
        const existingChapterIds = new Set(existingChapters.map(c => c.id));
        const incomingChapterIds = new Set(data.chapters.filter(c => c.id).map(c => c.id));
        // Delete chapters not in incoming data
        const chaptersToDelete = existingChapters.filter(c => !incomingChapterIds.has(c.id));
        for (const ch of chaptersToDelete) {
            await chapterService.deleteChapter(ch.id);
        }
        // Upsert chapters
        for (const chapter of data.chapters) {
            let chapterId;
            if (chapter.id && existingChapterIds.has(chapter.id)) {
                // Update existing chapter
                await chapterService.updateChapter(chapter.id, {
                    title: chapter.title,
                    order_index: chapter.order_index
                });
                chapterId = chapter.id;
            }
            else {
                // Create new chapter
                const created = await chapterService.createChapter({
                    course_id: id,
                    title: chapter.title,
                    order_index: chapter.order_index
                });
                chapterId = created.id;
            }
            // Handle modules
            if (chapter.modules && chapter.modules.length > 0) {
                const existingModules = await client_1.default.module.findMany({ where: { chapter_id: chapterId } });
                const existingModuleIds = new Set(existingModules.map((m) => m.id));
                const incomingModuleIds = new Set(chapter.modules.filter((m) => m.id).map((m) => m.id));
                // Delete modules not in incoming data
                const modulesToDelete = existingModules.filter(m => !incomingModuleIds.has(m.id));
                for (const mod of modulesToDelete) {
                    await moduleService.deleteModule(mod.id);
                }
                // Upsert modules
                for (const module of chapter.modules) {
                    let moduleId;
                    if (module.id && existingModuleIds.has(module.id)) {
                        // Update existing module
                        await moduleService.updateModule(module.id, {
                            title: module.title,
                            slug: module.slug,
                            summary: module.summary,
                            order_index: module.order_index
                        });
                        moduleId = module.id;
                    }
                    else {
                        // Create new module
                        const created = await moduleService.createModule({
                            chapter_id: chapterId,
                            title: module.title,
                            slug: module.slug,
                            summary: module.summary,
                            order_index: module.order_index
                        });
                        moduleId = created.id;
                    }
                    // Handle blocks
                    if (module.blocks && module.blocks.length > 0) {
                        const existingBlocks = await client_1.default.block.findMany({ where: { module_id: moduleId } });
                        const existingBlockIds = new Set(existingBlocks.map((b) => b.id));
                        const incomingBlockIds = new Set(module.blocks.filter((b) => b.id).map((b) => b.id));
                        // Delete blocks not in incoming data
                        const blocksToDelete = existingBlocks.filter(b => !incomingBlockIds.has(b.id));
                        for (const blk of blocksToDelete) {
                            await blockService.deleteBlock(blk.id);
                        }
                        // Upsert blocks
                        for (const block of module.blocks) {
                            if (block.id && existingBlockIds.has(block.id)) {
                                // Update existing block
                                await blockService.updateBlock(block.id, {
                                    type: block.type,
                                    content: block.content,
                                    config: block.config,
                                    order_index: block.order_index
                                });
                            }
                            else {
                                // Create new block
                                await blockService.createBlock({
                                    module_id: moduleId,
                                    type: block.type,
                                    content: block.content,
                                    config: block.config,
                                    order_index: block.order_index
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    return getById(id);
};
/**
 * Deletes a course and all its related data (chapters, modules, blocks)
 */
const deleteCourse = async (id) => {
    // Get all chapters for this course
    const chapters = await client_1.default.chapter.findMany({
        where: { course_id: id },
        include: { modules: { include: { blocks: true } } }
    });
    // Delete all blocks in all modules in all chapters
    for (const chapter of chapters) {
        for (const module of chapter.modules) {
            await client_1.default.block.deleteMany({ where: { module_id: module.id } });
        }
    }
    // Delete all modules in all chapters
    for (const chapter of chapters) {
        await client_1.default.module.deleteMany({ where: { chapter_id: chapter.id } });
    }
    // Delete all chapters
    await client_1.default.chapter.deleteMany({ where: { course_id: id } });
    // Finally delete the course
    return client_1.default.course.delete({ where: { id } });
};
/**
 * JSON Export: Export course structure to nested JSON format
 */
const exportCourseAsJSON = async (courseId) => {
    const course = await getById(courseId);
    if (!course)
        throw new Error('Course not found');
    const exported = {
        title: course.title,
        description: course.description,
        chapters: (course.chapters || []).map(chapter => ({
            title: chapter.title,
            order: chapter.order_index,
            modules: (chapter.modules || []).map(module => ({
                title: module.title,
                order: module.order_index,
                blocks: (module.blocks || []).map(block => ({
                    type: block.type,
                    order: block.order_index,
                    content: block.content,
                    config: block.config
                }))
            }))
        }))
    };
    return JSON.stringify([exported], null, 2);
};
/**
 * JSON Import: Parse JSON content into structured course data
 */
const parseImportJSON = (jsonContent) => {
    const errors = [];
    let parsed;
    try {
        const data = JSON.parse(jsonContent);
        // Handle new template format with _instructions and courses property
        if (data.courses && Array.isArray(data.courses)) {
            parsed = data.courses;
        }
        // Handle old array format or single course object
        else if (Array.isArray(data)) {
            parsed = data;
        }
        // Handle single course object
        else if (data.title) {
            parsed = [data];
        }
        else {
            errors.push({
                line: 0,
                field: 'json',
                message: 'JSON must contain courses array or course object with title'
            });
            return { courses: [], errors };
        }
    }
    catch (e) {
        errors.push({
            line: 0,
            field: 'json',
            message: `Invalid JSON: ${e instanceof Error ? e.message : 'syntax error'}`
        });
        return { courses: [], errors };
    }
    if (!parsed || parsed.length === 0) {
        errors.push({ line: 0, field: 'json', message: 'JSON must contain at least one course' });
        return { courses: [], errors };
    }
    // Basic validation of structure
    for (let i = 0; i < parsed.length; i++) {
        const course = parsed[i];
        if (!course.title || !course.title.trim()) {
            errors.push({ line: i + 1, field: 'title', message: 'Course title is required' });
            continue;
        }
        if (!course.chapters || !Array.isArray(course.chapters) || course.chapters.length === 0) {
            errors.push({ line: i + 1, field: 'chapters', message: 'Course must have at least one chapter' });
            continue;
        }
        // Validate chapters
        for (let j = 0; j < course.chapters.length; j++) {
            const chapter = course.chapters[j];
            if (!chapter.title) {
                errors.push({ line: i + 1, field: 'chapters[' + j + '].title', message: 'Chapter title is required' });
                continue;
            }
            if (!chapter.modules || !Array.isArray(chapter.modules) || chapter.modules.length === 0) {
                errors.push({ line: i + 1, field: 'chapters[' + j + '].modules', message: 'Chapter must have at least one module' });
                continue;
            }
            // Validate modules
            for (let k = 0; k < chapter.modules.length; k++) {
                const module = chapter.modules[k];
                if (!module.title) {
                    errors.push({ line: i + 1, field: 'chapters[' + j + '].modules[' + k + '].title', message: 'Module title is required' });
                }
            }
        }
    }
    return { courses: parsed, errors };
};
/**
 * Validate parsed course data before import
 */
const validateParsedCourses = (courses) => {
    const errors = [];
    if (courses.length === 0) {
        errors.push({ line: 0, field: 'courses', message: 'No courses found to import' });
    }
    for (const course of courses) {
        if (!course.chapters || course.chapters.length === 0) {
            errors.push({ line: 0, field: 'chapters', message: `Course "${course.title}" must have at least one chapter` });
            continue;
        }
        for (const chapter of course.chapters) {
            if (!chapter.modules || chapter.modules.length === 0) {
                errors.push({ line: 0, field: 'modules', message: `Chapter "${chapter.name}" in course "${course.title}" must have at least one module` });
            }
        }
    }
    return { valid: errors.length === 0, errors };
};
/**
 * Import courses from parsed CSV data
 */
const importCoursesFromParsed = async (parsedCourses, tenantId) => {
    const importedIds = [];
    const errors = [];
    console.log('[IMPORT] Starting import of', parsedCourses.length, 'courses');
    // Check for duplicate titles in database
    const existingCourses = await client_1.default.course.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, title: true }
    });
    const existingTitles = new Set(existingCourses.map(c => c.title));
    for (const parsedCourse of parsedCourses) {
        console.log('[IMPORT] Processing course:', parsedCourse.title);
        if (existingTitles.has(parsedCourse.title)) {
            console.log('[IMPORT] Course already exists:', parsedCourse.title);
            errors.push({
                line: 0,
                field: 'courseTitle',
                message: `Course with title "${parsedCourse.title}" already exists in this tenant`
            });
            continue;
        }
        try {
            console.log('[IMPORT] Found', parsedCourse.chapters?.length || 0, 'chapters');
            // Convert parsed structure to createCourse format
            const chapters = parsedCourse.chapters.map((ch, chIdx) => {
                console.log(`[IMPORT] Chapter ${chIdx + 1}: "${ch.title}" with ${ch.modules?.length || 0} modules`);
                return {
                    title: ch.title,
                    order_index: ch.order,
                    modules: (ch.modules || []).map((mod, modIdx) => {
                        console.log(`[IMPORT]   Module ${modIdx + 1}: "${mod.title}" with ${mod.blocks?.length || 0} blocks`);
                        return {
                            title: mod.title,
                            order_index: mod.order,
                            slug: mod.title.toLowerCase().replace(/\s+/g, '-'),
                            summary: undefined,
                            blocks: (mod.blocks || []).map((bl, blIdx) => {
                                console.log(`[IMPORT]     Block ${blIdx + 1}: type "${bl.type}" at order ${bl.order}`);
                                return {
                                    type: bl.type,
                                    content: bl.content,
                                    config: bl.config,
                                    order_index: bl.order
                                };
                            })
                        };
                    })
                };
            });
            console.log('[IMPORT] Creating course with', chapters.length, 'chapters');
            const created = await createCourse({
                title: parsedCourse.title,
                description: parsedCourse.description,
                tenant_id: tenantId,
                chapters
            });
            if (created && created.id) {
                console.log('[IMPORT] Course created successfully:', created.id);
                importedIds.push(created.id);
            }
            else {
                throw new Error('Course created but ID not returned');
            }
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'unknown error';
            console.log('[IMPORT] Error importing course:', msg);
            errors.push({
                line: 0,
                field: 'courseImport',
                message: `Failed to import course "${parsedCourse.title}": ${msg}`
            });
        }
    }
    console.log('[IMPORT] Import complete. Imported:', importedIds.length, 'Errors:', errors.length);
    return {
        success: errors.length === 0,
        importedIds,
        errors
    };
};
/**
 * Generate a template JSON with example course structure including all block types
 */
const generateJSONTemplate = () => {
    const template = {
        "_instructions": {
            "description": "Course import template - edit the 'courses' array below with your course data",
            "fieldMapping": {
                "course": { "title": "string", "description": "string (optional)" },
                "chapter": { "title": "string", "order": "number (1, 2, 3...)" },
                "module": { "title": "string", "order": "number (1, 2, 3...)" },
                "block": { "type": "string", "order": "number (1, 2, 3...)", "content": "string or object", "config": "object (optional)" }
            },
            "blockTypes": {
                "text": "Plain text content (content: string)",
                "image": "Image with config {width, height, alt}",
                "video": "Video player with config {width, height, autoplay}",
                "quote": "Quote block with config {author, citation}",
                "button": "Button with config {url, color, openInNewTab}",
                "quiz": "Quiz block with config {questions, passingScore, attemptsAllowed}"
            },
            "rules": [
                "order values must be 1, 2, 3... in sequence per chapter/module",
                "All courses, chapters, modules must have at least one child element",
                "Block order must be sequential within each module"
            ]
        },
        "courses": [
            {
                "title": "Sample Course: Professional Writing",
                "description": "Learn professional writing with real-world examples",
                "chapters": [
                    {
                        "title": "Chapter 1: Email & Messages",
                        "order": 1,
                        "modules": [
                            {
                                "title": "Module 1: Professional Email",
                                "order": 1,
                                "blocks": [
                                    {
                                        "type": "text",
                                        "order": 1,
                                        "content": "Email is one of the most important business communication tools. Learn to write clear, concise, professional emails."
                                    },
                                    {
                                        "type": "image",
                                        "order": 2,
                                        "content": "https://example.com/email-template.jpg",
                                        "config": {
                                            "width": 800,
                                            "height": 600,
                                            "alt": "Email template"
                                        }
                                    },
                                    {
                                        "type": "quiz",
                                        "order": 3,
                                        "config": {
                                            "questions": [
                                                {
                                                    "question": "What should a professional email include?",
                                                    "type": "multiple_choice",
                                                    "options": [
                                                        "Subject line and greeting",
                                                        "Only body text",
                                                        "Automatic signature only"
                                                    ],
                                                    "correct": 0
                                                }
                                            ],
                                            "passingScore": 70,
                                            "attemptsAllowed": 3
                                        }
                                    }
                                ]
                            },
                            {
                                "title": "Module 2: Business Memos",
                                "order": 2,
                                "blocks": [
                                    {
                                        "type": "text",
                                        "order": 1,
                                        "content": "Memos are internal communications. They should be brief, informative, and action-oriented."
                                    },
                                    {
                                        "type": "quote",
                                        "order": 2,
                                        "content": "A memo should deliver one key message clearly and concisely.",
                                        "config": {
                                            "author": "Business Communication Expert",
                                            "citation": "Writing Guide"
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "title": "Chapter 2: Reports & Documentation",
                        "order": 2,
                        "modules": [
                            {
                                "title": "Module 1: Report Structure",
                                "order": 1,
                                "blocks": [
                                    {
                                        "type": "text",
                                        "order": 1,
                                        "content": "Reports are formal documents that require structure. They typically include: executive summary, introduction, findings, conclusion, and recommendations."
                                    },
                                    {
                                        "type": "video",
                                        "order": 2,
                                        "content": "https://example.com/report-writing.mp4",
                                        "config": {
                                            "width": 800,
                                            "height": 450,
                                            "autoplay": false
                                        }
                                    },
                                    {
                                        "type": "button",
                                        "order": 3,
                                        "content": "Download Report Template",
                                        "config": {
                                            "url": "https://example.com/report-template.docx",
                                            "color": "primary",
                                            "openInNewTab": true
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    };
    return JSON.stringify(template, null, 2);
};
exports.default = {
    // Core course CRUD
    createCourse,
    listGlobalCourses,
    listByTenant,
    getById,
    updateCourse,
    deleteCourse,
    // JSON Import/Export
    exportCourseAsJSON,
    parseImportJSON,
    validateParsedCourses,
    importCoursesFromParsed,
    generateJSONTemplate,
    // Data operations (complex)
    assignCourseToTenant: courseDataService_1.assignCourseToTenant,
    copyFromTemplate: courseDataService_1.copyFromTemplate,
    // Chapter operations (delegated)
    createChapter: chapterService.createChapter,
    getChapterById: chapterService.getChapterById,
    updateChapter: chapterService.updateChapter,
    deleteChapter: chapterService.deleteChapter,
    // Module operations (delegated)
    createModule: moduleService.createModule,
    getModuleById: moduleService.getModuleById,
    updateModule: moduleService.updateModule,
    deleteModule: moduleService.deleteModule,
    // Block operations (delegated)
    createBlock: blockService.createBlock,
    updateBlock: blockService.updateBlock,
    deleteBlock: blockService.deleteBlock,
    listBlocksByModule: blockService.listBlocksByModule,
    reorderBlocks: blockService.reorderBlocks
};
