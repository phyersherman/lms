"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteModule = exports.updateModule = exports.getModuleById = exports.createModule = void 0;
const client_1 = __importDefault(require("../db/client"));
/**
 * Module Service
 * Handles all module-related operations
 */
const createModule = async (data) => {
    return client_1.default.module.create({
        data: {
            chapter_id: data.chapter_id,
            title: data.title,
            slug: data.slug,
            summary: data.summary,
            order_index: data.order_index || 0,
            required: data.required !== undefined ? data.required : true,
            prerequisite_module_ids: data.prerequisite_module_ids || [],
            requires_quiz_pass_to_continue: data.requires_quiz_pass_to_continue || false,
            tenant_id: data.tenant_id || null,
        },
    });
};
exports.createModule = createModule;
const getModuleById = async (id) => {
    return client_1.default.module.findUnique({
        where: { id },
        include: { blocks: { orderBy: { order_index: 'asc' } } },
    });
};
exports.getModuleById = getModuleById;
const updateModule = async (id, data) => {
    return client_1.default.module.update({
        where: { id },
        data: {
            title: data.title,
            slug: data.slug,
            summary: data.summary,
            order_index: data.order_index,
            required: data.required,
            prerequisite_module_ids: data.prerequisite_module_ids,
            requires_quiz_pass_to_continue: data.requires_quiz_pass_to_continue,
        },
    });
};
exports.updateModule = updateModule;
const deleteModule = async (id) => {
    // Delete all blocks associated with this module first
    await client_1.default.block.deleteMany({ where: { module_id: id } });
    // Then delete the module
    return client_1.default.module.delete({ where: { id } });
};
exports.deleteModule = deleteModule;
