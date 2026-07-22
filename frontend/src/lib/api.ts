// Same-origin by default: every site domain serves the frontend and proxies /api
// to the backend (Next rewrite in dev, Traefik in production). Set
// NEXT_PUBLIC_API_URL only for legacy cross-origin setups.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

let csrfToken: string | null = null

async function fetchJson(path: string, opts: any = {}, retryCount = 0) {
  const url = `${API_BASE}${path}`
  const init: any = {
    credentials: 'include',
    headers: { ...(opts.headers || {}) },
    ...opts,
  }

  // Attach CSRF token for non-GET requests when available
  if (init.method && init.method.toUpperCase() !== 'GET' && csrfToken) {
    init.headers['X-CSRF-Token'] = csrfToken
  }

  const res = await fetch(url, init)
  // Parse defensively: proxies and unhandled server errors can return HTML or
  // an empty body, and res.json() on those surfaces cryptic browser messages
  // (Safari: "The string did not match the expected pattern.")
  const raw = await res.text()
  let payload: any
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch {
    payload = { error: `Request failed (${res.status} ${res.statusText || 'server error'})` }
  }
  if (!res.ok) {
    // Handle 401: attempt refresh and retry once
    if (res.status === 401 && retryCount === 0) {
      try {
        await refresh()
        await refreshCsrf() // Refresh CSRF token after token rotation
        return fetchJson(path, opts, retryCount + 1)
      } catch (refreshError) {
        // If refresh fails, throw the original error
        const err = new Error(payload.error || 'Request failed')
        ;(err as any).statusCode = res.status
        ;(err as any).payload = payload
        throw err
      }
    }
    const err = new Error(payload.error || 'Request failed')
    ;(err as any).statusCode = res.status
    ;(err as any).payload = payload
    throw err
  }
  return payload
}

export async function refreshCsrf() {
  const res = await fetch(`${API_BASE}/csrf-token`, { method: 'GET', credentials: 'include' })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Failed to fetch CSRF token')
  csrfToken = payload.csrfToken
  return csrfToken
}

export async function refresh() {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken || '' },
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Refresh failed')
  return payload
}

export async function login(email: string, password: string) {
  return fetchJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export async function me() {
  return fetchJson('/me', { method: 'GET' })
}

export async function getGlobalCourses() {
  return fetchJson('/courses/global', { method: 'GET' })
}

export async function getTenantCourses(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/courses`, { method: 'GET' })
}

export async function createCourse(title: string, description?: string, tenantId?: string) {
  return fetchJson(tenantId ? `/tenants/${tenantId}/courses` : '/courses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, tenant_id: tenantId }),
  })
}

export async function getCourse(courseId: string) {
  return fetchJson(`/courses/${courseId}`, { method: 'GET' })
}

export async function updateCourse(courseId: string, title?: string, description?: string, chapters?: any[]) {
  return fetchJson(`/courses/${courseId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, chapters }),
  })
}

export async function deleteCourse(courseId: string) {
  return fetchJson(`/courses/${courseId}`, { method: 'DELETE' })
}

export async function assignCourseToTenant(globalCourseId: string, tenantId: string, title?: string) {
  await refreshCsrf()
  return fetchJson('/courses/assign-to-tenant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ globalCourseId, tenantId, title }),
  })
}

export async function copyCourse(courseId: string, tenantId: string, newTitle?: string) {
  return fetchJson(`/courses/${courseId}/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_id: tenantId, title: newTitle }),
  })
}

// Phase 1: CSV Import/Export
export async function exportCourseAsCSV(tenantId: string, courseId: string) {
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/courses/${courseId}/export`, {
    credentials: 'include'
  })
  if (!res.ok) throw new Error('Failed to export course')
  return res.text()
}

export async function importCoursesFromCSV(tenantId: string, csvContent: string) {
  return fetchJson(`/tenants/${tenantId}/courses/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvContent }),
  })
}

export async function previewCSVImport(tenantId: string, csvContent: string) {
  return fetchJson(`/tenants/${tenantId}/courses/import-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csvContent }),
  })
}

export async function downloadCSVTemplate() {
  const url = `${API_BASE}/courses/csv-template`
  console.log('Fetching JSON template from:', url)
  
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrfToken || '' }
  })
  
  console.log('JSON template response status:', res.status)
  
  if (!res.ok) {
    try {
      const error = await res.json()
      throw new Error(error.error || `HTTP ${res.status}`)
    } catch {
      throw new Error(`HTTP ${res.status} - Failed to download template`)
    }
  }
  
  const json = await res.text()
  if (!json) throw new Error('Empty response from template endpoint')
  return json
}

export async function logout() {
  return fetchJson('/auth/logout', { method: 'POST' })
}

export async function acceptInvite(token: string, password: string) {
  return fetchJson('/auth/accept-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
}

export async function forgotPassword(email: string) {
  return fetchJson('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, password: string) {
  return fetchJson('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
}

// Tenant management
export async function getTenants() {
  return fetchJson('/tenants', { method: 'GET' })
}

export async function getTenant(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}`, { method: 'GET' })
}

export async function createTenant(data: { name: string; theme?: { primaryColor?: string; secondaryColor?: string; logoUrl?: string }; domains?: { host: string; isPrimary?: boolean }[] }) {
  return fetchJson('/tenants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateTenant(tenantId: string, data: { name?: string; theme?: { primaryColor?: string; secondaryColor?: string; logoUrl?: string }; certificateSignature?: string | null }) {
  return fetchJson(`/tenants/${tenantId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteTenant(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}`, { method: 'DELETE' })
}

// Website builder: site settings + pages
export async function getSiteSettings(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/site`, { method: 'GET' })
}

export async function updateSiteSettings(tenantId: string, data: { theme?: any; header?: any; footer?: any; features?: any; homepage_mode?: string }) {
  return fetchJson(`/tenants/${tenantId}/site`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function getSitePages(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/pages`, { method: 'GET' })
}

export async function createSitePage(tenantId: string, data: { title: string; slug: string; seo_title?: string; seo_description?: string }) {
  return fetchJson(`/tenants/${tenantId}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function getSitePage(pageId: string) {
  return fetchJson(`/pages/${pageId}`, { method: 'GET' })
}

export async function updateSitePage(pageId: string, data: { title?: string; slug?: string; seo_title?: string | null; seo_description?: string | null; og_image_url?: string | null; draft_content?: any }) {
  return fetchJson(`/pages/${pageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function publishSitePage(pageId: string) {
  return fetchJson(`/pages/${pageId}/publish`, { method: 'POST' })
}

export async function unpublishSitePage(pageId: string) {
  return fetchJson(`/pages/${pageId}/unpublish`, { method: 'POST' })
}

export async function deleteSitePage(pageId: string) {
  return fetchJson(`/pages/${pageId}`, { method: 'DELETE' })
}

// Website builder: assets
export async function getAssets(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/assets`, { method: 'GET' })
}

export async function uploadAsset(tenantId: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  // fetchJson would set JSON headers; FormData needs its own boundary header
  const res = await fetch(`${API_BASE}/tenants/${tenantId}/assets`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    body: fd,
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Upload failed')
  return payload
}

export async function deleteAsset(tenantId: string, assetId: string) {
  return fetchJson(`/tenants/${tenantId}/assets/${assetId}`, { method: 'DELETE' })
}

// Website builder: forms + contacts
export async function getForms(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/forms`, { method: 'GET' })
}

export async function getForm(formId: string) {
  return fetchJson(`/forms/${formId}`, { method: 'GET' })
}

export async function createForm(tenantId: string, data: any) {
  return fetchJson(`/tenants/${tenantId}/forms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateForm(formId: string, data: any) {
  return fetchJson(`/forms/${formId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteForm(formId: string) {
  return fetchJson(`/forms/${formId}`, { method: 'DELETE' })
}

export async function getFormSubmissions(formId: string) {
  return fetchJson(`/forms/${formId}/submissions`, { method: 'GET' })
}

export async function getContacts(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/contacts`, { method: 'GET' })
}

export async function deleteContact(tenantId: string, contactId: string) {
  return fetchJson(`/tenants/${tenantId}/contacts/${contactId}`, { method: 'DELETE' })
}

// Blog
export async function getPosts(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/posts`, { method: 'GET' })
}

export async function getPost(postId: string) {
  return fetchJson(`/posts/${postId}`, { method: 'GET' })
}

export async function createPost(tenantId: string, data: { title: string; slug?: string; excerpt?: string; categoryIds?: string[] }) {
  return fetchJson(`/tenants/${tenantId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updatePost(postId: string, data: any) {
  return fetchJson(`/posts/${postId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function publishPost(postId: string) {
  return fetchJson(`/posts/${postId}/publish`, { method: 'POST' })
}

export async function unpublishPost(postId: string) {
  return fetchJson(`/posts/${postId}/unpublish`, { method: 'POST' })
}

export async function deletePost(postId: string) {
  return fetchJson(`/posts/${postId}`, { method: 'DELETE' })
}

export async function getCategories(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/categories`, { method: 'GET' })
}

export async function createCategory(tenantId: string, name: string) {
  return fetchJson(`/tenants/${tenantId}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function deleteCategory(tenantId: string, categoryId: string) {
  return fetchJson(`/tenants/${tenantId}/categories/${categoryId}`, { method: 'DELETE' })
}

// Commerce
export async function getCommerceConfig(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/commerce-config`, { method: 'GET' })
}

export async function updateCommerceConfig(tenantId: string, data: { stripe_secret_key?: string; stripe_publishable_key?: string; stripe_webhook_secret?: string; currency?: string }) {
  return fetchJson(`/tenants/${tenantId}/commerce-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function getProducts(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/products`, { method: 'GET' })
}

export async function createProduct(tenantId: string, data: any) {
  return fetchJson(`/tenants/${tenantId}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateProduct(productId: string, data: any) {
  return fetchJson(`/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteProduct(productId: string) {
  return fetchJson(`/products/${productId}`, { method: 'DELETE' })
}

export async function getOrders(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/orders`, { method: 'GET' })
}

export async function updateOrderStatus(tenantId: string, orderId: string, status: string) {
  return fetchJson(`/tenants/${tenantId}/orders/${orderId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

// Site packages (whole-site import/export)
export async function importSitePackage(tenantId: string, pkg: any) {
  return fetchJson(`/tenants/${tenantId}/site-package/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package: pkg }),
  })
}

export async function exportSitePackage(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/site-package/export`, { method: 'GET' })
}

// Tenant domain management
export async function getTenantDomains(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/domains`, { method: 'GET' })
}

export async function addTenantDomain(tenantId: string, host: string, isPrimary = false) {
  return fetchJson(`/tenants/${tenantId}/domains`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, isPrimary }),
  })
}

export async function removeTenantDomain(tenantId: string, domainId: string) {
  return fetchJson(`/tenants/${tenantId}/domains/${domainId}`, { method: 'DELETE' })
}

// User management
export async function getUsers(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/users`, { method: 'GET' })
}

export async function getUser(tenantId: string, userId: string) {
  return fetchJson(`/tenants/${tenantId}/users/${userId}`, { method: 'GET' })
}

export async function createUser(tenantId: string, data: { 
  email: string
  fullName?: string
  role: string
  password?: string
}) {
  return fetchJson(`/tenants/${tenantId}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateUser(tenantId: string, userId: string, data: {
  fullName?: string
  role?: string
  email?: string
}) {
  return fetchJson(`/tenants/${tenantId}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteUser(tenantId: string, userId: string) {
  return fetchJson(`/tenants/${tenantId}/users/${userId}`, { method: 'DELETE' })
}

export async function disableUser(tenantId: string, userId: string) {
  return fetchJson(`/tenants/${tenantId}/users/${userId}/disable`, { method: 'POST' })
}

export async function enableUser(tenantId: string, userId: string) {
  return fetchJson(`/tenants/${tenantId}/users/${userId}/enable`, { method: 'POST' })
}

export async function inviteUser(tenantId: string, userId: string) {
  return fetchJson(`/tenants/${tenantId}/users/${userId}/invite`, { method: 'POST' })
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  return fetchJson(`/users/${userId}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

// Global user management (platform-wide users)
export async function getGlobalUsers() {
  return fetchJson('/users', { method: 'GET' })
}

export async function getGlobalUser(userId: string) {
  return fetchJson(`/users/${userId}`, { method: 'GET' })
}

export async function createGlobalUser(data: { 
  email: string
  fullName?: string
  role: string
  password?: string
}) {
  return fetchJson('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateGlobalUser(userId: string, data: {
  fullName?: string
  role?: string
  email?: string
}) {
  return fetchJson(`/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteGlobalUser(userId: string) {
  return fetchJson(`/users/${userId}`, { method: 'DELETE' })
}

export async function disableGlobalUser(userId: string) {
  return fetchJson(`/users/${userId}/disable`, { method: 'POST' })
}

export async function enableGlobalUser(userId: string) {
  return fetchJson(`/users/${userId}/enable`, { method: 'POST' })
}

export async function inviteGlobalUser(userId: string) {
  return fetchJson(`/users/${userId}/invite`, { method: 'POST' })
}

// Email configuration
export async function getEmailConfig(tenantId?: string) {
  const url = tenantId ? `/email-config?tenantId=${tenantId}` : '/email-config'
  return fetchJson(url, { method: 'GET' })
}

export async function getEmailConfigById(configId: string) {
  return fetchJson(`/email-config/${configId}`, { method: 'GET' })
}

export async function listEmailConfigs(tenantId?: string | null) {
  const url = tenantId !== undefined ? `/email-configs?tenantId=${tenantId}` : '/email-configs'
  return fetchJson(url, { method: 'GET' })
}

export async function createEmailConfig(data: {
  provider: string
  apiKey: string
  domain: string
  fromEmail: string
  fromName: string
  replyToEmail?: string
  isActive: boolean
}, tenantId?: string) {
  const url = tenantId ? `/email-config?tenantId=${tenantId}` : '/email-config'
  return fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateEmailConfig(configId: string, data: {
  provider?: string
  apiKey?: string
  domain?: string
  fromEmail?: string
  fromName?: string
  replyToEmail?: string
  isActive?: boolean
}) {
  return fetchJson(`/email-config/${configId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteEmailConfig(configId: string) {
  return fetchJson(`/email-config/${configId}`, { method: 'DELETE' })
}

export async function testEmailConfig(configId: string, recipientEmail: string) {
  return fetchJson(`/email-config/${configId}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientEmail }),
  })
}

export async function getEmailLogs(tenantId?: string, limit?: number) {
  const params = new URLSearchParams()
  if (tenantId) params.append('tenantId', tenantId)
  if (limit) params.append('limit', limit.toString())
  const url = `/email-logs${params.toString() ? `?${params.toString()}` : ''}`
  return fetchJson(url, { method: 'GET' })
}

// Learner APIs
export async function getModuleAccess(moduleId: string, courseId: string) {
  return fetchJson(`/modules/${moduleId}/courses/${courseId}/access`, { method: 'GET' })
}

export async function getModule(moduleId: string) {
  return fetchJson(`/modules/${moduleId}`, { method: 'GET' })
}

export async function completeModule(moduleId: string, courseId: string) {
  return fetchJson(`/modules/${moduleId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId }),
  })
}

export async function completeChapter(chapterId: string, courseId: string) {
  return fetchJson(`/chapters/${chapterId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId }),
  })
}

export async function completeCourse(courseId: string) {
  return fetchJson(`/courses/${courseId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}

export async function getCourseProgress(courseId: string) {
  return fetchJson(`/courses/${courseId}/progress`, { method: 'GET' })
}

export async function getCourseStructureWithProgress(courseId: string) {
  return fetchJson(`/courses/${courseId}/structure-with-progress`, { method: 'GET' })
}

export async function submitQuiz(blockId: string, courseId: string, answers: Record<string, any>) {
  return fetchJson('/quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockId, courseId, answers }),
  })
}

export async function getQuizAttempts(blockId: string) {
  return fetchJson(`/quiz/attempts/${blockId}`, { method: 'GET' })
}

export async function getLatestQuizAttempt(blockId: string) {
  return fetchJson(`/quiz/latest/${blockId}`, { method: 'GET' })
}

// Analytics APIs
export async function getAnalyticsAdmin() {
  return fetchJson('/analytics/admin', { method: 'GET' })
}

export async function getAnalyticsTenantCourses(tenantId?: string) {
  const url = tenantId ? `/analytics/tenant/courses?tenantId=${tenantId}` : '/analytics/tenant/courses'
  return fetchJson(url, { method: 'GET' })
}

// ========================================
// Enrollments (Phase 9 - Feature 1)
// ========================================
export async function enrollUser(userId: string, courseId: string, tenantId: string) {
  return fetchJson('/enrollments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, courseId, tenantId }),
  })
}

export async function getMyEnrollments() {
  return fetchJson('/enrollments/me', { method: 'GET' })
}

export async function getEnrollmentProgress(enrollmentId: string) {
  return fetchJson(`/enrollments/${enrollmentId}/progress`, { method: 'GET' })
}

export async function unenrollUser(enrollmentId: string) {
  return fetchJson(`/enrollments/${enrollmentId}`, { method: 'DELETE' })
}

// ========================================
// Certificates (Phase 9 - Feature 2)
// ========================================
export async function generateCertificate(
  enrollmentId: string,
  userId: string,
  courseId: string,
  tenantId: string
) {
  return fetchJson('/certificates/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enrollmentId, userId, courseId, tenantId }),
  })
}

export async function generateCertificateByCourse(
  userId: string,
  courseId: string,
  tenantId: string
) {
  return fetchJson('/certificates/generate-by-course', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, courseId, tenantId }),
  })
}

export async function getMyCertificates() {
  return fetchJson('/certificates/me', { method: 'GET' })
}

export async function getCertificate(certificateId: string) {
  return fetchJson(`/certificates/${certificateId}`, { method: 'GET' })
}

export async function downloadCertificate(certificateId: string) {
  // Open download URL directly - browser will include httpOnly cookies automatically
  window.location.href = `${API_BASE}/certificates/${certificateId}/download`
}

export async function deleteCertificate(certificateId: string) {
  return fetchJson(`/certificates/${certificateId}`, { method: 'DELETE' })
}

export async function getTenantCertificates(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/certificates`, { method: 'GET' })
}

// ========================================
// Registration Links (Phase 9 - Feature 3)
// ========================================
export async function createRegistrationLink(
  tenantId: string,
  data: {
    courseIds: string[]
    name: string
    maxUses?: number
    expiresAt?: string
  }
) {
  return fetchJson(`/tenants/${tenantId}/registration-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function getRegistrationLinks(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/registration-links`, { method: 'GET' })
}

export async function getRegistrationLink(id: string) {
  return fetchJson(`/registration-links/${id}`, { method: 'GET' })
}

export async function updateRegistrationLink(
  id: string,
  data: {
    name?: string
    courseIds?: string[]
    maxUses?: number | null
    expiresAt?: string | null
    isActive?: boolean
  }
) {
  return fetchJson(`/registration-links/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteRegistrationLink(id: string) {
  return fetchJson(`/registration-links/${id}`, { method: 'DELETE' })
}

export async function toggleRegistrationLink(id: string) {
  return fetchJson(`/registration-links/${id}/toggle`, { method: 'POST' })
}

// Public registration link endpoints (no auth required)
export async function validateRegistrationToken(token: string) {
  return fetchJson(`/public/registration-links/validate?token=${encodeURIComponent(token)}`, {
    method: 'GET'
  })
}

export async function registerViaLink(data: {
  token: string
  email: string
  fullName: string
  password: string
}) {
  return fetchJson('/public/registration-links/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// ========================================
// Bulk User Operations (Phase 9 - Feature 4)
// ========================================
export async function importUsersFromCSV(
  tenantId: string,
  data: {
    csvContent: string
    sendInvites?: boolean
    fileName?: string
  }
) {
  return fetchJson(`/tenants/${tenantId}/users/import-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function bulkCreateUsers(
  tenantId: string,
  data: {
    users: Array<{
      email: string
      fullName?: string
      role?: string
      organization?: string
    }>
    sendInvites?: boolean
  }
) {
  return fetchJson(`/tenants/${tenantId}/users/bulk-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function getBulkImportJobs(tenantId: string) {
  return fetchJson(`/tenants/${tenantId}/bulk-imports`, { method: 'GET' })
}

export async function getBulkImportJob(jobId: string) {
  return fetchJson(`/bulk-imports/${jobId}`, { method: 'GET' })
}

// Bulk Enrollment Operations
export async function bulkAssignCourses(data: {
  userIds: string[]
  courseIds: string[]
  tenantId: string
}) {
  return fetchJson('/enrollments/bulk-assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function bulkUnassignCourses(data: {
  userIds: string[]
  courseIds: string[]
  tenantId: string
}) {
  return fetchJson('/enrollments/bulk-unassign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function getUserCourses(tenantId: string, userId: string) {
  return fetchJson(`/tenants/${tenantId}/users/${userId}/courses`, { method: 'GET' })
}

export async function getCourseEnrollments(tenantId: string, courseId: string) {
  return fetchJson(`/tenants/${tenantId}/courses/${courseId}/enrollments`, { method: 'GET' })
}

// Passwordless Access Links (Phase 9 - Feature 5) - Admin management
export async function createPasswordlessLink(
  tenantId: string,
  data: {
    name: string
    courseIds: string[]
    organization?: string
    maxUses?: number
    expiresAt?: string
  }
) {
  return fetchJson(`/tenants/${tenantId}/passwordless-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function getPasswordlessLinks(tenantId: string, courseId?: string) {
  const url = courseId 
    ? `/tenants/${tenantId}/passwordless-links?courseId=${courseId}`
    : `/tenants/${tenantId}/passwordless-links`
  return fetchJson(url, { method: 'GET' })
}

export async function getPasswordlessLink(linkId: string) {
  return fetchJson(`/passwordless-links/${linkId}`, { method: 'GET' })
}

export async function updatePasswordlessLink(
  linkId: string,
  data: {
    name?: string
    organization?: string
    maxUses?: number
    expiresAt?: string
    isActive?: boolean
  }
) {
  return fetchJson(`/passwordless-links/${linkId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deletePasswordlessLink(linkId: string) {
  return fetchJson(`/passwordless-links/${linkId}`, { method: 'DELETE' })
}

export async function togglePasswordlessLink(linkId: string) {
  return fetchJson(`/passwordless-links/${linkId}/toggle`, { method: 'POST' })
}

// Passwordless Authentication (Phase 9 - Feature 5) - Public endpoints
export async function validatePasswordlessToken(token: string) {
  return fetchJson(`/public/passwordless-links/validate?token=${token}`, { method: 'GET' })
}

export async function registerViaPasswordlessLink(data: {
  token: string
  fullName: string
  email: string
  organization?: string
}) {
  return fetchJson('/public/passwordless-links/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function sendMagicCode(email: string) {
  return fetchJson('/public/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export async function verifyMagicCode(email: string, code: string) {
  return fetchJson('/public/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
}

export async function resendMagicCode(email: string) {
  return fetchJson('/public/auth/resend-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export default { 
  login, 
  logout,
  acceptInvite,
  forgotPassword,
  resetPassword,
  me, 
  refreshCsrf, 
  refresh,
  // Course management
  getGlobalCourses,
  getTenantCourses,
  createCourse,
  getCourse,
  updateCourse,
  deleteCourse,
  assignCourseToTenant,
  copyCourse,
  // CSV Import/Export (Phase 1)
  exportCourseAsCSV,
  importCoursesFromCSV,
  previewCSVImport,
  downloadCSVTemplate,
  // Tenant management
  getTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantDomains,
  addTenantDomain,
  removeTenantDomain,
  getAssets,
  uploadAsset,
  deleteAsset,
  getForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  getFormSubmissions,
  getContacts,
  deleteContact,
  importSitePackage,
  exportSitePackage,
  getCommerceConfig,
  updateCommerceConfig,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus,
  getPosts,
  getPost,
  createPost,
  updatePost,
  publishPost,
  unpublishPost,
  deletePost,
  getCategories,
  createCategory,
  deleteCategory,
  getSiteSettings,
  updateSiteSettings,
  getSitePages,
  createSitePage,
  getSitePage,
  updateSitePage,
  publishSitePage,
  unpublishSitePage,
  deleteSitePage,
  // User management
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  disableUser,
  enableUser,
  inviteUser,
  changePassword,
  // Global user management
  getGlobalUsers,
  getGlobalUser,
  createGlobalUser,
  updateGlobalUser,
  deleteGlobalUser,
  disableGlobalUser,
  enableGlobalUser,
  inviteGlobalUser,
  // Email configuration
  getEmailConfig,
  getEmailConfigById,
  listEmailConfigs,
  createEmailConfig,
  updateEmailConfig,
  deleteEmailConfig,
  testEmailConfig,
  getEmailLogs,
  // Learner APIs
  getModuleAccess,
  getModule,
  completeModule,
  completeChapter,
  completeCourse,
  getCourseProgress,
  getCourseStructureWithProgress,
  submitQuiz,
  getQuizAttempts,
  getLatestQuizAttempt,
  // Analytics
  getAnalyticsAdmin,
  getAnalyticsTenantCourses,
  // Enrollments (Phase 9)
  enrollUser,
  getMyEnrollments,
  getEnrollmentProgress,
  unenrollUser,
  // Certificates (Phase 9)
  generateCertificate,
  generateCertificateByCourse,
  getMyCertificates,
  getCertificate,
  downloadCertificate,
  deleteCertificate,
  getTenantCertificates,
  // Registration Links (Phase 9)
  createRegistrationLink,
  getRegistrationLinks,
  getRegistrationLink,
  updateRegistrationLink,
  deleteRegistrationLink,
  toggleRegistrationLink,
  validateRegistrationToken,
  registerViaLink,
  // Bulk Operations (Phase 9)
  importUsersFromCSV,
  bulkCreateUsers,
  getBulkImportJobs,
  getBulkImportJob,
  bulkAssignCourses,
  bulkUnassignCourses,
  getUserCourses,
  getCourseEnrollments,
  // Passwordless Authentication (Phase 9 - Feature 5)
  createPasswordlessLink,
  getPasswordlessLinks,
  getPasswordlessLink,
  updatePasswordlessLink,
  deletePasswordlessLink,
  togglePasswordlessLink,
  validatePasswordlessToken,
  registerViaPasswordlessLink,
  sendMagicCode,
  verifyMagicCode,
  resendMagicCode,
}
