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
const express_1 = require("express");
const tenantController_1 = __importDefault(require("../controllers/tenantController"));
const authController_1 = __importDefault(require("../controllers/authController"));
const userController = __importStar(require("../controllers/userController"));
const emailController_1 = __importDefault(require("../controllers/emailController"));
const enrollmentController_1 = __importDefault(require("../controllers/enrollmentController"));
const certificate_controller_1 = __importDefault(require("../controllers/certificate-controller"));
const registration_link_controller_1 = __importDefault(require("../controllers/registration-link-controller"));
const bulk_user_controller_1 = __importDefault(require("../controllers/bulk-user-controller"));
const bulk_enrollment_controller_1 = __importDefault(require("../controllers/bulk-enrollment-controller"));
const passwordlessAuthController = __importStar(require("../controllers/passwordless-auth-controller"));
const passwordlessLinkController = __importStar(require("../controllers/passwordless-link-controller"));
const authGuard_1 = __importDefault(require("../middleware/authGuard"));
const authGuard_2 = require("../middleware/authGuard");
const requireFeature_1 = __importDefault(require("../middleware/requireFeature"));
const siteController_1 = __importDefault(require("../controllers/siteController"));
const postController_1 = __importDefault(require("../controllers/postController"));
const commerceController_1 = __importDefault(require("../controllers/commerceController"));
const rateLimiters_1 = require("../middleware/rateLimiters");
const multer_1 = __importDefault(require("multer"));
const assetController_1 = __importDefault(require("../controllers/assetController"));
const formController_1 = __importDefault(require("../controllers/formController"));
const storageService_1 = require("../services/storageService");
const uploadMiddleware = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: storageService_1.MAX_UPLOAD_BYTES } });
const courseController_1 = __importDefault(require("../controllers/courseController"));
const courseTemplateController_1 = __importDefault(require("../controllers/courseTemplateController"));
const quiz_controller_1 = __importDefault(require("../controllers/quiz-controller"));
const progressController_1 = __importDefault(require("../controllers/progressController"));
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => res.json({ ok: true }));
// LMS learner-facing surfaces are feature-gated per site. The gate only applies
// on tenant domains (platform/admin requests resolve no tenant and pass through).
const lmsEnabled = (0, requireFeature_1.default)('lms');
router.use(['/quiz', '/enrollments', '/certificates', '/progress', '/my', '/public/registration-links', '/public/passwordless-links', '/public/auth'], lmsEnabled);
// website builder: site settings (admin)
router.get('/tenants/:tenantId/site', (0, authGuard_2.requireAuth)(['admin']), siteController_1.default.getSettings);
router.put('/tenants/:tenantId/site', (0, authGuard_2.requireAuth)(['admin']), siteController_1.default.updateSettings);
// website builder: pages (admin)
router.get('/tenants/:tenantId/pages', (0, authGuard_2.requireAuth)(['admin']), siteController_1.default.listPages);
router.post('/tenants/:tenantId/pages', (0, authGuard_2.requireAuth)(['admin']), siteController_1.default.createPage);
router.get('/pages/:pageId', (0, authGuard_2.requireAuth)(['admin']), siteController_1.default.getPage);
router.put('/pages/:pageId', (0, authGuard_2.requireAuth)(['admin']), siteController_1.default.updatePage);
router.post('/pages/:pageId/publish', (0, authGuard_2.requireAuth)(['admin']), siteController_1.default.publishPage);
router.post('/pages/:pageId/unpublish', (0, authGuard_2.requireAuth)(['admin']), siteController_1.default.unpublishPage);
router.delete('/pages/:pageId', (0, authGuard_2.requireAuth)(['admin']), siteController_1.default.deletePage);
// website builder: public site + page resolution (no auth)
router.get('/public/site-page', siteController_1.default.getPublicSitePage);
// website builder: assets (admin)
router.post('/tenants/:tenantId/assets', (0, authGuard_2.requireAuth)(['admin']), uploadMiddleware.single('file'), assetController_1.default.upload);
router.get('/tenants/:tenantId/assets', (0, authGuard_2.requireAuth)(['admin']), assetController_1.default.list);
router.delete('/tenants/:tenantId/assets/:assetId', (0, authGuard_2.requireAuth)(['admin']), assetController_1.default.remove);
// website builder: forms + contacts (admin)
router.get('/tenants/:tenantId/forms', (0, authGuard_2.requireAuth)(['admin']), formController_1.default.listForms);
router.post('/tenants/:tenantId/forms', (0, authGuard_2.requireAuth)(['admin']), formController_1.default.createForm);
router.get('/forms/:formId', (0, authGuard_2.requireAuth)(['admin']), formController_1.default.getForm);
router.put('/forms/:formId', (0, authGuard_2.requireAuth)(['admin']), formController_1.default.updateForm);
router.delete('/forms/:formId', (0, authGuard_2.requireAuth)(['admin']), formController_1.default.deleteForm);
router.get('/forms/:formId/submissions', (0, authGuard_2.requireAuth)(['admin']), formController_1.default.listSubmissions);
router.get('/tenants/:tenantId/contacts', (0, authGuard_2.requireAuth)(['admin']), formController_1.default.listContacts);
router.delete('/tenants/:tenantId/contacts/:contactId', (0, authGuard_2.requireAuth)(['admin']), formController_1.default.deleteContact);
// blog (admin)
router.get('/tenants/:tenantId/posts', (0, authGuard_2.requireAuth)(['admin']), postController_1.default.listPosts);
router.post('/tenants/:tenantId/posts', (0, authGuard_2.requireAuth)(['admin']), postController_1.default.createPost);
router.get('/posts/:postId', (0, authGuard_2.requireAuth)(['admin']), postController_1.default.getPost);
router.put('/posts/:postId', (0, authGuard_2.requireAuth)(['admin']), postController_1.default.updatePost);
router.post('/posts/:postId/publish', (0, authGuard_2.requireAuth)(['admin']), postController_1.default.publishPost);
router.post('/posts/:postId/unpublish', (0, authGuard_2.requireAuth)(['admin']), postController_1.default.unpublishPost);
router.delete('/posts/:postId', (0, authGuard_2.requireAuth)(['admin']), postController_1.default.deletePost);
router.get('/tenants/:tenantId/categories', (0, authGuard_2.requireAuth)(['admin']), postController_1.default.listCategories);
router.post('/tenants/:tenantId/categories', (0, authGuard_2.requireAuth)(['admin']), postController_1.default.createCategory);
router.delete('/tenants/:tenantId/categories/:categoryId', (0, authGuard_2.requireAuth)(['admin']), postController_1.default.deleteCategory);
// blog (public; feature-gated inside the controller)
router.get('/public/posts', postController_1.default.listPublicPosts);
router.get('/public/posts/:slug', postController_1.default.getPublicPost);
// commerce (admin)
router.get('/tenants/:tenantId/commerce-config', (0, authGuard_2.requireAuth)(['admin']), commerceController_1.default.getConfig);
router.put('/tenants/:tenantId/commerce-config', (0, authGuard_2.requireAuth)(['admin']), commerceController_1.default.updateConfig);
router.get('/tenants/:tenantId/products', (0, authGuard_2.requireAuth)(['admin']), commerceController_1.default.listProducts);
router.post('/tenants/:tenantId/products', (0, authGuard_2.requireAuth)(['admin']), commerceController_1.default.createProduct);
router.put('/products/:productId', (0, authGuard_2.requireAuth)(['admin']), commerceController_1.default.updateProduct);
router.delete('/products/:productId', (0, authGuard_2.requireAuth)(['admin']), commerceController_1.default.deleteProduct);
router.get('/tenants/:tenantId/orders', (0, authGuard_2.requireAuth)(['admin']), commerceController_1.default.listOrders);
router.post('/tenants/:tenantId/orders/:orderId/status', (0, authGuard_2.requireAuth)(['admin']), commerceController_1.default.updateOrderStatus);
// commerce (public; feature-gated in controller, CSRF exempt under /public/)
router.get('/public/products/:productId', commerceController_1.default.getPublicProduct);
router.post('/public/checkout', rateLimiters_1.formSubmitLimiter, commerceController_1.default.checkout);
// website builder: public form endpoints (no auth; CSRF exempt under /public/)
router.get('/public/forms/:formId', formController_1.default.getPublicForm);
router.post('/public/forms/:formId/submissions', rateLimiters_1.formSubmitLimiter, formController_1.default.submitForm);
router.get('/public/downloads/:token', formController_1.default.download);
// tenant management (admin)
router.get('/tenants', (0, authGuard_2.requireAuth)(['admin']), tenantController_1.default.listTenants);
router.get('/tenants/:id', (0, authGuard_2.requireAuth)(['admin']), tenantController_1.default.getTenant);
router.post('/tenants', (0, authGuard_2.requireAuth)(['admin']), tenantController_1.default.createTenant);
router.put('/tenants/:id', (0, authGuard_2.requireAuth)(['admin']), tenantController_1.default.updateTenant);
router.delete('/tenants/:id', (0, authGuard_2.requireAuth)(['admin']), tenantController_1.default.deleteTenant);
// tenant domain management (admin)
router.get('/tenants/:id/domains', (0, authGuard_2.requireAuth)(['admin']), tenantController_1.default.listDomains);
router.post('/tenants/:id/domains', (0, authGuard_2.requireAuth)(['admin']), tenantController_1.default.addDomain);
router.delete('/tenants/:id/domains/:domainId', (0, authGuard_2.requireAuth)(['admin']), tenantController_1.default.removeDomain);
// user management (admin) - tenant-scoped
router.get('/tenants/:tenantId/users', (0, authGuard_2.requireAuth)(['admin']), userController.listUsers);
router.get('/tenants/:tenantId/users/:userId', (0, authGuard_2.requireAuth)(['admin']), userController.getUser);
router.post('/tenants/:tenantId/users', (0, authGuard_2.requireAuth)(['admin']), userController.createUser);
router.put('/tenants/:tenantId/users/:userId', (0, authGuard_2.requireAuth)(['admin']), userController.updateUser);
router.delete('/tenants/:tenantId/users/:userId', (0, authGuard_2.requireAuth)(['admin']), userController.deleteUser);
router.post('/tenants/:tenantId/users/:userId/disable', (0, authGuard_2.requireAuth)(['admin']), userController.disableUser);
router.post('/tenants/:tenantId/users/:userId/enable', (0, authGuard_2.requireAuth)(['admin']), userController.enableUser);
router.post('/tenants/:tenantId/users/:userId/invite', (0, authGuard_2.requireAuth)(['admin']), rateLimiters_1.inviteLimiter, userController.inviteUser);
// global user management (admin) - platform-wide users
router.get('/users', (0, authGuard_2.requireAuth)(['admin']), userController.listGlobalUsers);
router.get('/users/:userId', (0, authGuard_2.requireAuth)(['admin']), userController.getGlobalUser);
router.post('/users', (0, authGuard_2.requireAuth)(['admin']), userController.createGlobalUser);
router.put('/users/:userId', (0, authGuard_2.requireAuth)(['admin']), userController.updateGlobalUser);
router.delete('/users/:userId', (0, authGuard_2.requireAuth)(['admin']), userController.deleteGlobalUser);
router.post('/users/:userId/disable', (0, authGuard_2.requireAuth)(['admin']), userController.disableGlobalUser);
router.post('/users/:userId/enable', (0, authGuard_2.requireAuth)(['admin']), userController.enableGlobalUser);
router.post('/users/:userId/invite', (0, authGuard_2.requireAuth)(['admin']), rateLimiters_1.inviteLimiter, userController.inviteGlobalUser);
// user self-service (any authenticated user)
router.post('/users/:userId/password', authGuard_1.default, userController.changePassword);
// email configuration (admin)
router.get('/email-config', (0, authGuard_2.requireAuth)(['admin']), emailController_1.default.getEmailConfig);
router.get('/email-config/:id', (0, authGuard_2.requireAuth)(['admin']), emailController_1.default.getEmailConfigById);
router.get('/email-configs', (0, authGuard_2.requireAuth)(['admin']), emailController_1.default.listEmailConfigs);
router.post('/email-config', (0, authGuard_2.requireAuth)(['admin']), emailController_1.default.createEmailConfig);
router.put('/email-config/:id', (0, authGuard_2.requireAuth)(['admin']), emailController_1.default.updateEmailConfig);
router.delete('/email-config/:id', (0, authGuard_2.requireAuth)(['admin']), emailController_1.default.deleteEmailConfig);
router.post('/email-config/:id/test', (0, authGuard_2.requireAuth)(['admin']), emailController_1.default.testEmailConfig);
router.get('/email-logs', (0, authGuard_2.requireAuth)(['admin']), emailController_1.default.getEmailLogs);
// global courses (admin - available across all tenants)
router.get('/courses/global', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.listGlobalCourses);
router.post('/courses', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.createCourse);
router.post('/courses/assign-to-tenant', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.assignCourseToTenant);
router.post('/courses/:courseId/copy', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.copyCourse);
router.get('/courses/csv-template', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.downloadCSVTemplate);
// tenant-specific courses (admin)
router.post('/tenants/:tenantId/courses', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.createCourse);
router.get('/tenants/:tenantId/courses', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.listCourses);
router.get('/courses/:id', (0, authGuard_2.requireAuth)(['admin', 'learner']), courseController_1.default.getCourse);
router.put('/courses/:id', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.updateCourse);
router.delete('/courses/:id', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.deleteCourse);
// course templates (admin)
router.post('/course-templates', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.createTemplate);
router.get('/course-templates', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.listTemplates);
router.get('/course-templates/:id', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.getTemplate);
router.put('/course-templates/:id', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.updateTemplate);
router.delete('/course-templates/:id', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.deleteTemplate);
// template modules (direct, no chapter layer)
router.post('/course-templates/:templateId/modules', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.addTemplateModule);
router.get('/template-modules/:moduleId', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.getTemplateModule);
router.put('/template-modules/:moduleId', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.updateTemplateModule);
router.delete('/template-modules/:moduleId', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.deleteTemplateModule);
// template module blocks
router.post('/template-modules/:moduleId/blocks', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.addTemplateModuleBlock);
router.get('/template-modules/:moduleId/blocks', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.getTemplateModuleBlocks);
router.delete('/template-module-blocks/:blockId', (0, authGuard_2.requireAuth)(['admin']), courseTemplateController_1.default.deleteTemplateModuleBlock);
// course chapters
router.post('/courses/:courseId/chapters', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.addChapter);
router.get('/chapters/:chapterId', (0, authGuard_2.requireAuth)(['admin', 'learner']), courseController_1.default.getChapter);
router.put('/chapters/:chapterId', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.updateChapter);
router.delete('/chapters/:chapterId', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.deleteChapter);
// course modules (now under chapters) - backward compatibility
router.post('/courses/:courseId/modules', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.addModuleToCourse);
router.get('/modules/:moduleId', (0, authGuard_2.requireAuth)(['admin', 'learner']), courseController_1.default.getModule);
router.put('/modules/:moduleId', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.updateModule);
router.delete('/modules/:moduleId', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.deleteModule);
// module blocks
router.post('/modules/:moduleId/blocks', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.addBlock);
router.get('/modules/:moduleId/blocks', (0, authGuard_2.requireAuth)(['admin', 'learner']), courseController_1.default.listBlocksByModule);
router.post('/modules/:moduleId/blocks/reorder', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.reorderBlocks);
router.put('/blocks/:blockId', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.updateBlock);
router.delete('/blocks/:blockId', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.deleteBlock);
// course CSV import/export (Phase 1)
router.get('/tenants/:tenantId/courses/:courseId/export', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.exportCourseAsCSV);
router.post('/tenants/:tenantId/courses/import', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.importCoursesFromCSV);
router.post('/tenants/:tenantId/courses/import-preview', (0, authGuard_2.requireAuth)(['admin']), courseController_1.default.previewImportFromCSV);
// quiz endpoints (learner-facing)
router.post('/quiz/submit', authGuard_1.default, quiz_controller_1.default.submitQuizAttempt);
router.get('/quiz/attempts/:blockId', authGuard_1.default, quiz_controller_1.default.getQuizAttempts);
router.get('/quiz/latest/:blockId', authGuard_1.default, quiz_controller_1.default.getLatestQuizAttempt);
router.get('/modules/:moduleId/courses/:courseId/access', authGuard_1.default, quiz_controller_1.default.checkModuleAccess);
router.post('/modules/complete', authGuard_1.default, quiz_controller_1.default.markModuleComplete);
// quiz analytics endpoints (admin)
router.get('/analytics/quiz/:blockId', (0, authGuard_2.requireAuth)(['admin']), quiz_controller_1.default.getQuizAnalytics);
router.get('/analytics/course/:courseId/quizzes', (0, authGuard_2.requireAuth)(['admin']), quiz_controller_1.default.getCourseQuizAnalytics);
router.get('/analytics/quiz/:blockId/top-performers', (0, authGuard_2.requireAuth)(['admin']), quiz_controller_1.default.getTopPerformers);
router.get('/analytics/tenant', (0, authGuard_2.requireAuth)(['admin']), quiz_controller_1.default.getTenantAnalytics);
router.get('/analytics/tenant/courses', (0, authGuard_2.requireAuth)(['admin']), quiz_controller_1.default.getTenantCourseAnalytics);
router.get('/analytics/admin', (0, authGuard_2.requireAuth)(['admin']), quiz_controller_1.default.getAdminDashboardAnalytics);
// progress tracking endpoints (learner-facing)
router.post('/modules/:moduleId/complete', authGuard_1.default, progressController_1.default.completeModule);
router.post('/chapters/:chapterId/complete', authGuard_1.default, progressController_1.default.completeChapter);
router.post('/courses/:courseId/complete', authGuard_1.default, progressController_1.default.completeCourse);
router.get('/courses/:courseId/progress', authGuard_1.default, progressController_1.default.getCourseProgress);
router.get('/courses/:courseId/structure-with-progress', authGuard_1.default, progressController_1.default.getCourseStructureWithProgress);
// enrollments (Phase 9 - Feature 1)
router.post('/enrollments', (0, authGuard_2.requireAuth)(['admin']), enrollmentController_1.default.enrollUserInCourse);
router.get('/enrollments/me', authGuard_1.default, enrollmentController_1.default.getMyEnrollments);
router.get('/enrollments/:enrollmentId/progress', authGuard_1.default, enrollmentController_1.default.getEnrollmentProgress);
router.delete('/enrollments/:enrollmentId', (0, authGuard_2.requireAuth)(['admin']), enrollmentController_1.default.unenrollUser);
// certificates (Phase 9 - Feature 2)
router.post('/certificates/generate', (0, authGuard_2.requireAuth)(['admin']), certificate_controller_1.default.generateCertificate);
router.post('/certificates/generate-by-course', (0, authGuard_2.requireAuth)(['admin']), certificate_controller_1.default.generateCertificateByCourse);
router.get('/certificates/me', authGuard_1.default, certificate_controller_1.default.getMyCertificates);
router.get('/certificates/:certificateId', authGuard_1.default, certificate_controller_1.default.getCertificate);
router.get('/certificates/:certificateId/download', authGuard_1.default, certificate_controller_1.default.downloadCertificate);
router.delete('/certificates/:certificateId', (0, authGuard_2.requireAuth)(['admin']), certificate_controller_1.default.deleteCertificate);
router.get('/tenants/:tenantId/certificates', (0, authGuard_2.requireAuth)(['admin']), certificate_controller_1.default.getTenantCertificates);
// registration links (Phase 9 - Feature 3)
router.post('/tenants/:tenantId/registration-links', (0, authGuard_2.requireAuth)(['admin']), registration_link_controller_1.default.createRegistrationLink);
router.get('/tenants/:tenantId/registration-links', (0, authGuard_2.requireAuth)(['admin']), registration_link_controller_1.default.getRegistrationLinks);
router.get('/registration-links/:id', (0, authGuard_2.requireAuth)(['admin']), registration_link_controller_1.default.getRegistrationLink);
router.put('/registration-links/:id', (0, authGuard_2.requireAuth)(['admin']), registration_link_controller_1.default.updateRegistrationLink);
router.delete('/registration-links/:id', (0, authGuard_2.requireAuth)(['admin']), registration_link_controller_1.default.deleteRegistrationLink);
router.post('/registration-links/:id/toggle', (0, authGuard_2.requireAuth)(['admin']), registration_link_controller_1.default.toggleRegistrationLink);
// public registration link endpoints (no auth required)
router.get('/public/registration-links/validate', registration_link_controller_1.default.validateRegistrationToken);
router.post('/public/registration-links/register', rateLimiters_1.authLimiter, registration_link_controller_1.default.registerViaLink);
// bulk user operations (Phase 9 - Feature 4)
router.post('/tenants/:tenantId/users/import-csv', (0, authGuard_2.requireAuth)(['admin']), bulk_user_controller_1.default.importUsersFromCSV);
router.post('/tenants/:tenantId/users/bulk-create', (0, authGuard_2.requireAuth)(['admin']), bulk_user_controller_1.default.bulkCreateUsers);
router.get('/tenants/:tenantId/bulk-imports', (0, authGuard_2.requireAuth)(['admin']), bulk_user_controller_1.default.getBulkImportJobs);
router.get('/bulk-imports/:jobId', (0, authGuard_2.requireAuth)(['admin']), bulk_user_controller_1.default.getBulkImportJob);
// bulk enrollment operations (Phase 9 - Feature 4)
router.post('/enrollments/bulk-assign', (0, authGuard_2.requireAuth)(['admin']), bulk_enrollment_controller_1.default.bulkAssignCourses);
router.post('/enrollments/bulk-unassign', (0, authGuard_2.requireAuth)(['admin']), bulk_enrollment_controller_1.default.bulkUnassignCourses);
router.get('/tenants/:tenantId/users/:userId/courses', (0, authGuard_2.requireAuth)(['admin']), bulk_enrollment_controller_1.default.getUserCourses);
router.get('/tenants/:tenantId/courses/:courseId/enrollments', (0, authGuard_2.requireAuth)(['admin']), bulk_enrollment_controller_1.default.getCourseEnrollments);
// passwordless access links (Phase 9 - Feature 5) - Admin management
router.post('/tenants/:tenantId/passwordless-links', (0, authGuard_2.requireAuth)(['admin']), passwordlessLinkController.createPasswordlessLink);
router.get('/tenants/:tenantId/passwordless-links', (0, authGuard_2.requireAuth)(['admin']), passwordlessLinkController.getPasswordlessLinks);
router.get('/passwordless-links/:id', (0, authGuard_2.requireAuth)(['admin']), passwordlessLinkController.getPasswordlessLinkById);
router.put('/passwordless-links/:id', (0, authGuard_2.requireAuth)(['admin']), passwordlessLinkController.updatePasswordlessLink);
router.delete('/passwordless-links/:id', (0, authGuard_2.requireAuth)(['admin']), passwordlessLinkController.deletePasswordlessLink);
router.post('/passwordless-links/:id/toggle', (0, authGuard_2.requireAuth)(['admin']), passwordlessLinkController.togglePasswordlessLink);
// passwordless authentication (Phase 9 - Feature 5) - Public endpoints
router.get('/public/passwordless-links/validate', passwordlessAuthController.validatePasswordlessToken);
router.post('/public/passwordless-links/register', rateLimiters_1.authLimiter, passwordlessAuthController.registerViaPasswordlessLink);
router.post('/public/auth/send-code', rateLimiters_1.authLimiter, passwordlessAuthController.sendMagicCode);
router.post('/public/auth/verify-code', rateLimiters_1.authLimiter, passwordlessAuthController.verifyMagicCode);
router.post('/public/auth/resend-code', rateLimiters_1.authLimiter, passwordlessAuthController.resendMagicCode);
// magic code cleanup (admin - for cron jobs)
router.post('/admin/magic-codes/cleanup', (0, authGuard_2.requireAuth)(['admin']), passwordlessAuthController.cleanupExpiredCodes);
// health check endpoint (no auth required)
router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// auth
router.post('/auth/login', authController_1.default.login);
router.post('/auth/register', rateLimiters_1.authLimiter, authController_1.default.register);
router.post('/auth/logout', authController_1.default.logout);
router.post('/auth/refresh', authController_1.default.refresh);
router.post('/auth/accept-invite', rateLimiters_1.authLimiter, authController_1.default.acceptInvite);
router.post('/auth/forgot-password', rateLimiters_1.inviteLimiter, authController_1.default.forgotPassword);
router.post('/auth/reset-password', rateLimiters_1.authLimiter, authController_1.default.resetPassword);
// protected example — any authenticated user
router.get('/me', authGuard_1.default, (req, res) => {
    res.json({ user: req.user, tenant: req.tenant || null });
});
exports.default = router;
