"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("../db/client"));
const submitQuizAttempt = async (submission) => {
    // Get the block with quiz config
    const block = await client_1.default.block.findUnique({
        where: { id: submission.blockId },
        include: {
            module: {
                include: {
                    chapter: {
                        include: {
                            course: true,
                        },
                    },
                },
            },
        },
    });
    if (!block || block.type !== 'quiz') {
        throw new Error('Quiz block not found');
    }
    // Parse quiz config
    let quizConfig = {};
    try {
        quizConfig = JSON.parse(block.config || '{}');
    }
    catch {
        throw new Error('Invalid quiz configuration');
    }
    // Calculate score
    const questions = quizConfig.questions || [];
    let correctCount = 0;
    let totalPoints = 0;
    questions.forEach((question, idx) => {
        const points = question.points || 1;
        totalPoints += points;
        // Normalize question ID to match frontend normalization
        const questionId = question.id || `q${idx + 1}`;
        const userAnswer = submission.answers[questionId];
        // Normalize correct answer — handle alternate field names
        let correctAnswer = question.correctAnswer;
        if (correctAnswer === undefined && question.correct !== undefined && question.options) {
            if (typeof question.correct === 'number' && question.options[question.correct] !== undefined) {
                correctAnswer = question.options[question.correct];
            }
            else {
                correctAnswer = String(question.correct);
            }
        }
        if (correctAnswer === undefined && question.answer !== undefined) {
            correctAnswer = question.answer;
        }
        // Normalize type
        const rawType = (question.type || 'multiple-choice').toLowerCase().replace(/_/g, '-');
        let isCorrect = false;
        if (rawType === 'multiple-choice' || rawType === 'true-false' || rawType === 'truefalse') {
            isCorrect = userAnswer === correctAnswer ||
                (Array.isArray(correctAnswer) && correctAnswer.includes(userAnswer));
        }
        else if (rawType === 'short-answer' || rawType === 'shortanswer') {
            isCorrect =
                userAnswer?.toLowerCase().trim() ===
                    correctAnswer?.toLowerCase().trim();
        }
        if (isCorrect) {
            correctCount += points;
        }
    });
    const score = totalPoints > 0 ? Math.round((correctCount / totalPoints) * 100) : 0;
    const passingScore = quizConfig.passingScore || 70;
    const passed = score >= passingScore;
    // Save attempt to database
    await client_1.default.quizAttempt.create({
        data: {
            blockId: submission.blockId,
            userId: submission.userId,
            tenantId: submission.tenantId,
            courseId: submission.courseId,
            score,
            passed,
            answers: JSON.stringify(submission.answers),
        },
    });
    return {
        score,
        passed,
        feedback: `You scored ${score}%. ${passed ? '✓ You passed!' : `You need ${passingScore}% to pass.`}`,
    };
};
const markModuleComplete = async (moduleId, userId, courseId, tenantId) => {
    // Check if already completed
    const existing = await client_1.default.moduleCompletion.findFirst({
        where: {
            moduleId,
            userId,
            courseId,
        },
    });
    if (existing) {
        return existing;
    }
    // Create completion record
    return client_1.default.moduleCompletion.create({
        data: {
            moduleId,
            userId,
            courseId,
            tenantId,
        },
    });
};
const isModuleAccessible = async (moduleId, userId, courseId) => {
    // Get module with chapter info
    const module = await client_1.default.module.findUnique({
        where: { id: moduleId },
        include: {
            chapter: {
                include: {
                    course: {
                        include: {
                            chapters: {
                                include: {
                                    modules: {
                                        include: { blocks: true },
                                        orderBy: { order_index: 'asc' },
                                    },
                                },
                                orderBy: { order_index: 'asc' },
                            },
                        },
                    },
                },
            },
            blocks: true,
        },
    });
    if (!module) {
        return { accessible: false, reason: 'Module not found' };
    }
    // Check prerequisite modules (explicit prerequisites)
    if (module.prerequisite_module_ids && module.prerequisite_module_ids.length > 0) {
        for (const prereqModuleId of module.prerequisite_module_ids) {
            const completion = await client_1.default.moduleCompletion.findFirst({
                where: {
                    moduleId: prereqModuleId,
                    userId,
                    courseId,
                },
            });
            if (!completion) {
                return {
                    accessible: false,
                    reason: `This module requires completing a prerequisite module first.`,
                };
            }
        }
    }
    // Find the previous module and check if IT requires quiz pass to continue
    const course = module.chapter.course;
    // Build flat list of all modules in order
    const allModules = [];
    for (const ch of course.chapters) {
        for (const mod of ch.modules) {
            allModules.push(mod);
        }
    }
    // Find current module index and get previous
    const currentIndex = allModules.findIndex((m) => m.id === moduleId);
    const previousModule = currentIndex > 0 ? allModules[currentIndex - 1] : null;
    // First module is always accessible
    if (previousModule) {
        // Enforce sequential order: previous module must be completed
        const prevCompletion = await client_1.default.moduleCompletion.findFirst({
            where: {
                moduleId: previousModule.id,
                userId,
                courseId,
            },
        });
        if (!prevCompletion) {
            return {
                accessible: false,
                reason: `Complete "${previousModule.title}" first.`,
            };
        }
        // Check if previous module has any quiz blocks that must be passed
        const prevQuizBlocks = previousModule.blocks.filter((b) => b.type === 'quiz');
        for (const quizBlock of prevQuizBlocks) {
            const passedAttempt = await client_1.default.quizAttempt.findFirst({
                where: {
                    blockId: quizBlock.id,
                    userId,
                    passed: true,
                },
            });
            if (!passedAttempt) {
                return {
                    accessible: false,
                    reason: `You must pass the quiz in "${previousModule.title}" before accessing this module.`,
                };
            }
        }
    }
    return { accessible: true };
};
const getQuizAttempts = async (blockId, userId) => {
    return client_1.default.quizAttempt.findMany({
        where: {
            blockId,
            userId,
        },
        orderBy: {
            submittedAt: 'desc',
        },
    });
};
const getLatestQuizAttempt = async (blockId, userId) => {
    return client_1.default.quizAttempt.findFirst({
        where: {
            blockId,
            userId,
        },
        orderBy: {
            submittedAt: 'desc',
        },
    });
};
exports.default = {
    submitQuizAttempt,
    markModuleComplete,
    isModuleAccessible,
    getQuizAttempts,
    getLatestQuizAttempt,
};
