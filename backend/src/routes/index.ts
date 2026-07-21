import { Router } from 'express'
import tenantController from '../controllers/tenantController'
import authController from '../controllers/authController'
import * as userController from '../controllers/userController'
import emailController from '../controllers/emailController'
import enrollmentController from '../controllers/enrollmentController'
import certificateController from '../controllers/certificate-controller'
import registrationLinkController from '../controllers/registration-link-controller'
import bulkUserController from '../controllers/bulk-user-controller'
import bulkEnrollmentController from '../controllers/bulk-enrollment-controller'
import * as passwordlessAuthController from '../controllers/passwordless-auth-controller'
import * as passwordlessLinkController from '../controllers/passwordless-link-controller'
import requireAuth from '../middleware/authGuard'
import { requireAuth as requireRoleAuth } from '../middleware/authGuard'
import { authLimiter, inviteLimiter } from '../middleware/rateLimiters'
import courseController from '../controllers/courseController'
import courseTemplateController from '../controllers/courseTemplateController'
import quizController from '../controllers/quiz-controller'
import progressController from '../controllers/progressController'
import { Request, Response } from 'express'

const router = Router()

router.get('/health', (_req, res) => res.json({ ok: true }))

// tenant management (admin)
router.get('/tenants', requireRoleAuth(['admin']), tenantController.listTenants)
router.get('/tenants/:id', requireRoleAuth(['admin']), tenantController.getTenant)
router.post('/tenants', requireRoleAuth(['admin']), tenantController.createTenant)
router.put('/tenants/:id', requireRoleAuth(['admin']), tenantController.updateTenant)
router.delete('/tenants/:id', requireRoleAuth(['admin']), tenantController.deleteTenant)

// tenant domain management (admin)
router.get('/tenants/:id/domains', requireRoleAuth(['admin']), tenantController.listDomains)
router.post('/tenants/:id/domains', requireRoleAuth(['admin']), tenantController.addDomain)
router.delete('/tenants/:id/domains/:domainId', requireRoleAuth(['admin']), tenantController.removeDomain)

// user management (admin) - tenant-scoped
router.get('/tenants/:tenantId/users', requireRoleAuth(['admin']), userController.listUsers)
router.get('/tenants/:tenantId/users/:userId', requireRoleAuth(['admin']), userController.getUser)
router.post('/tenants/:tenantId/users', requireRoleAuth(['admin']), userController.createUser)
router.put('/tenants/:tenantId/users/:userId', requireRoleAuth(['admin']), userController.updateUser)
router.delete('/tenants/:tenantId/users/:userId', requireRoleAuth(['admin']), userController.deleteUser)
router.post('/tenants/:tenantId/users/:userId/disable', requireRoleAuth(['admin']), userController.disableUser)
router.post('/tenants/:tenantId/users/:userId/enable', requireRoleAuth(['admin']), userController.enableUser)
router.post('/tenants/:tenantId/users/:userId/invite', requireRoleAuth(['admin']), inviteLimiter, userController.inviteUser)

// global user management (admin) - platform-wide users
router.get('/users', requireRoleAuth(['admin']), userController.listGlobalUsers)
router.get('/users/:userId', requireRoleAuth(['admin']), userController.getGlobalUser)
router.post('/users', requireRoleAuth(['admin']), userController.createGlobalUser)
router.put('/users/:userId', requireRoleAuth(['admin']), userController.updateGlobalUser)
router.delete('/users/:userId', requireRoleAuth(['admin']), userController.deleteGlobalUser)
router.post('/users/:userId/disable', requireRoleAuth(['admin']), userController.disableGlobalUser)
router.post('/users/:userId/enable', requireRoleAuth(['admin']), userController.enableGlobalUser)
router.post('/users/:userId/invite', requireRoleAuth(['admin']), inviteLimiter, userController.inviteGlobalUser)

// user self-service (any authenticated user)
router.post('/users/:userId/password', requireAuth, userController.changePassword)

// email configuration (admin)
router.get('/email-config', requireRoleAuth(['admin']), emailController.getEmailConfig)
router.get('/email-config/:id', requireRoleAuth(['admin']), emailController.getEmailConfigById)
router.get('/email-configs', requireRoleAuth(['admin']), emailController.listEmailConfigs)
router.post('/email-config', requireRoleAuth(['admin']), emailController.createEmailConfig)
router.put('/email-config/:id', requireRoleAuth(['admin']), emailController.updateEmailConfig)
router.delete('/email-config/:id', requireRoleAuth(['admin']), emailController.deleteEmailConfig)
router.post('/email-config/:id/test', requireRoleAuth(['admin']), emailController.testEmailConfig)
router.get('/email-logs', requireRoleAuth(['admin']), emailController.getEmailLogs)

// global courses (admin - available across all tenants)
router.get('/courses/global', requireRoleAuth(['admin']), courseController.listGlobalCourses)
router.post('/courses', requireRoleAuth(['admin']), courseController.createCourse)
router.post('/courses/assign-to-tenant', requireRoleAuth(['admin']), courseController.assignCourseToTenant)
router.post('/courses/:courseId/copy', requireRoleAuth(['admin']), courseController.copyCourse)
router.get('/courses/csv-template', requireRoleAuth(['admin']), courseController.downloadCSVTemplate)

// tenant-specific courses (admin)
router.post('/tenants/:tenantId/courses', requireRoleAuth(['admin']), courseController.createCourse)
router.get('/tenants/:tenantId/courses', requireRoleAuth(['admin']), courseController.listCourses)
router.get('/courses/:id', requireRoleAuth(['admin', 'learner']), courseController.getCourse)
router.put('/courses/:id', requireRoleAuth(['admin']), courseController.updateCourse)
router.delete('/courses/:id', requireRoleAuth(['admin']), courseController.deleteCourse)

// course templates (admin)
router.post('/course-templates', requireRoleAuth(['admin']), courseTemplateController.createTemplate)
router.get('/course-templates', requireRoleAuth(['admin']), courseTemplateController.listTemplates)
router.get('/course-templates/:id', requireRoleAuth(['admin']), courseTemplateController.getTemplate)
router.put('/course-templates/:id', requireRoleAuth(['admin']), courseTemplateController.updateTemplate)
router.delete('/course-templates/:id', requireRoleAuth(['admin']), courseTemplateController.deleteTemplate)

// template modules (direct, no chapter layer)
router.post('/course-templates/:templateId/modules', requireRoleAuth(['admin']), courseTemplateController.addTemplateModule)
router.get('/template-modules/:moduleId', requireRoleAuth(['admin']), courseTemplateController.getTemplateModule)
router.put('/template-modules/:moduleId', requireRoleAuth(['admin']), courseTemplateController.updateTemplateModule)
router.delete('/template-modules/:moduleId', requireRoleAuth(['admin']), courseTemplateController.deleteTemplateModule)

// template module blocks
router.post('/template-modules/:moduleId/blocks', requireRoleAuth(['admin']), courseTemplateController.addTemplateModuleBlock)
router.get('/template-modules/:moduleId/blocks', requireRoleAuth(['admin']), courseTemplateController.getTemplateModuleBlocks)
router.delete('/template-module-blocks/:blockId', requireRoleAuth(['admin']), courseTemplateController.deleteTemplateModuleBlock)

// course chapters
router.post('/courses/:courseId/chapters', requireRoleAuth(['admin']), courseController.addChapter)
router.get('/chapters/:chapterId', requireRoleAuth(['admin', 'learner']), courseController.getChapter)
router.put('/chapters/:chapterId', requireRoleAuth(['admin']), courseController.updateChapter)
router.delete('/chapters/:chapterId', requireRoleAuth(['admin']), courseController.deleteChapter)

// course modules (now under chapters) - backward compatibility
router.post('/courses/:courseId/modules', requireRoleAuth(['admin']), courseController.addModuleToCourse)
router.get('/modules/:moduleId', requireRoleAuth(['admin', 'learner']), courseController.getModule)
router.put('/modules/:moduleId', requireRoleAuth(['admin']), courseController.updateModule)
router.delete('/modules/:moduleId', requireRoleAuth(['admin']), courseController.deleteModule)

// module blocks
router.post('/modules/:moduleId/blocks', requireRoleAuth(['admin']), courseController.addBlock)
router.get('/modules/:moduleId/blocks', requireRoleAuth(['admin', 'learner']), courseController.listBlocksByModule)
router.post('/modules/:moduleId/blocks/reorder', requireRoleAuth(['admin']), courseController.reorderBlocks)
router.put('/blocks/:blockId', requireRoleAuth(['admin']), courseController.updateBlock)
router.delete('/blocks/:blockId', requireRoleAuth(['admin']), courseController.deleteBlock)

// course CSV import/export (Phase 1)
router.get('/tenants/:tenantId/courses/:courseId/export', requireRoleAuth(['admin']), courseController.exportCourseAsCSV)
router.post('/tenants/:tenantId/courses/import', requireRoleAuth(['admin']), courseController.importCoursesFromCSV)
router.post('/tenants/:tenantId/courses/import-preview', requireRoleAuth(['admin']), courseController.previewImportFromCSV)

// quiz endpoints (learner-facing)
router.post('/quiz/submit', requireAuth, quizController.submitQuizAttempt)
router.get('/quiz/attempts/:blockId', requireAuth, quizController.getQuizAttempts)
router.get('/quiz/latest/:blockId', requireAuth, quizController.getLatestQuizAttempt)
router.get('/modules/:moduleId/courses/:courseId/access', requireAuth, quizController.checkModuleAccess)
router.post('/modules/complete', requireAuth, quizController.markModuleComplete)

// quiz analytics endpoints (admin)
router.get('/analytics/quiz/:blockId', requireRoleAuth(['admin']), quizController.getQuizAnalytics)
router.get('/analytics/course/:courseId/quizzes', requireRoleAuth(['admin']), quizController.getCourseQuizAnalytics)
router.get('/analytics/quiz/:blockId/top-performers', requireRoleAuth(['admin']), quizController.getTopPerformers)
router.get('/analytics/tenant', requireRoleAuth(['admin']), quizController.getTenantAnalytics)
router.get('/analytics/tenant/courses', requireRoleAuth(['admin']), quizController.getTenantCourseAnalytics)
router.get('/analytics/admin', requireRoleAuth(['admin']), quizController.getAdminDashboardAnalytics)

// progress tracking endpoints (learner-facing)
router.post('/modules/:moduleId/complete', requireAuth, progressController.completeModule)
router.post('/chapters/:chapterId/complete', requireAuth, progressController.completeChapter)
router.post('/courses/:courseId/complete', requireAuth, progressController.completeCourse)
router.get('/courses/:courseId/progress', requireAuth, progressController.getCourseProgress)
router.get('/courses/:courseId/structure-with-progress', requireAuth, progressController.getCourseStructureWithProgress)

// enrollments (Phase 9 - Feature 1)
router.post('/enrollments', requireRoleAuth(['admin']), enrollmentController.enrollUserInCourse)
router.get('/enrollments/me', requireAuth, enrollmentController.getMyEnrollments)
router.get('/enrollments/:enrollmentId/progress', requireAuth, enrollmentController.getEnrollmentProgress)
router.delete('/enrollments/:enrollmentId', requireRoleAuth(['admin']), enrollmentController.unenrollUser)

// certificates (Phase 9 - Feature 2)
router.post('/certificates/generate', requireRoleAuth(['admin']), certificateController.generateCertificate)
router.post('/certificates/generate-by-course', requireRoleAuth(['admin']), certificateController.generateCertificateByCourse)
router.get('/certificates/me', requireAuth, certificateController.getMyCertificates)
router.get('/certificates/:certificateId', requireAuth, certificateController.getCertificate)
router.get('/certificates/:certificateId/download', requireAuth, certificateController.downloadCertificate)
router.delete('/certificates/:certificateId', requireRoleAuth(['admin']), certificateController.deleteCertificate)
router.get('/tenants/:tenantId/certificates', requireRoleAuth(['admin']), certificateController.getTenantCertificates)

// registration links (Phase 9 - Feature 3)
router.post('/tenants/:tenantId/registration-links', requireRoleAuth(['admin']), registrationLinkController.createRegistrationLink)
router.get('/tenants/:tenantId/registration-links', requireRoleAuth(['admin']), registrationLinkController.getRegistrationLinks)
router.get('/registration-links/:id', requireRoleAuth(['admin']), registrationLinkController.getRegistrationLink)
router.put('/registration-links/:id', requireRoleAuth(['admin']), registrationLinkController.updateRegistrationLink)
router.delete('/registration-links/:id', requireRoleAuth(['admin']), registrationLinkController.deleteRegistrationLink)
router.post('/registration-links/:id/toggle', requireRoleAuth(['admin']), registrationLinkController.toggleRegistrationLink)

// public registration link endpoints (no auth required)
router.get('/public/registration-links/validate', registrationLinkController.validateRegistrationToken)
router.post('/public/registration-links/register', authLimiter, registrationLinkController.registerViaLink)

// bulk user operations (Phase 9 - Feature 4)
router.post('/tenants/:tenantId/users/import-csv', requireRoleAuth(['admin']), bulkUserController.importUsersFromCSV)
router.post('/tenants/:tenantId/users/bulk-create', requireRoleAuth(['admin']), bulkUserController.bulkCreateUsers)
router.get('/tenants/:tenantId/bulk-imports', requireRoleAuth(['admin']), bulkUserController.getBulkImportJobs)
router.get('/bulk-imports/:jobId', requireRoleAuth(['admin']), bulkUserController.getBulkImportJob)

// bulk enrollment operations (Phase 9 - Feature 4)
router.post('/enrollments/bulk-assign', requireRoleAuth(['admin']), bulkEnrollmentController.bulkAssignCourses)
router.post('/enrollments/bulk-unassign', requireRoleAuth(['admin']), bulkEnrollmentController.bulkUnassignCourses)
router.get('/tenants/:tenantId/users/:userId/courses', requireRoleAuth(['admin']), bulkEnrollmentController.getUserCourses)
router.get('/tenants/:tenantId/courses/:courseId/enrollments', requireRoleAuth(['admin']), bulkEnrollmentController.getCourseEnrollments)

// passwordless access links (Phase 9 - Feature 5) - Admin management
router.post('/tenants/:tenantId/passwordless-links', requireRoleAuth(['admin']), passwordlessLinkController.createPasswordlessLink)
router.get('/tenants/:tenantId/passwordless-links', requireRoleAuth(['admin']), passwordlessLinkController.getPasswordlessLinks)
router.get('/passwordless-links/:id', requireRoleAuth(['admin']), passwordlessLinkController.getPasswordlessLinkById)
router.put('/passwordless-links/:id', requireRoleAuth(['admin']), passwordlessLinkController.updatePasswordlessLink)
router.delete('/passwordless-links/:id', requireRoleAuth(['admin']), passwordlessLinkController.deletePasswordlessLink)
router.post('/passwordless-links/:id/toggle', requireRoleAuth(['admin']), passwordlessLinkController.togglePasswordlessLink)

// passwordless authentication (Phase 9 - Feature 5) - Public endpoints
router.get('/public/passwordless-links/validate', passwordlessAuthController.validatePasswordlessToken)
router.post('/public/passwordless-links/register', authLimiter, passwordlessAuthController.registerViaPasswordlessLink)
router.post('/public/auth/send-code', authLimiter, passwordlessAuthController.sendMagicCode)
router.post('/public/auth/verify-code', authLimiter, passwordlessAuthController.verifyMagicCode)
router.post('/public/auth/resend-code', authLimiter, passwordlessAuthController.resendMagicCode)

// magic code cleanup (admin - for cron jobs)
router.post('/admin/magic-codes/cleanup', requireRoleAuth(['admin']), passwordlessAuthController.cleanupExpiredCodes)

// health check endpoint (no auth required)
router.get('/health', (_req: Request, res: Response) => {
	res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// auth
router.post('/auth/login', authController.login)
router.post('/auth/register', authLimiter, authController.register)
router.post('/auth/logout', authController.logout)
router.post('/auth/refresh', authController.refresh)
router.post('/auth/accept-invite', authLimiter, authController.acceptInvite)
router.post('/auth/forgot-password', inviteLimiter, authController.forgotPassword)
router.post('/auth/reset-password', authLimiter, authController.resetPassword)

// protected example — any authenticated user
router.get('/me', requireAuth, (req: Request, res: Response) => {
	res.json({ user: req.user, tenant: req.tenant || null })
})

export default router
