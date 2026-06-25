// Shared Utilities - Reusable helpers used across multiple pages

/**
 * Escape HTML special characters to prevent XSS.
 * Previously duplicated in dashboard.html and course.html.
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

/**
 * Show an alert message inside #alert-container.
 * Unifies the two variants that existed:
 *   - dashboard/course used class "alert-message {type}" with a close button and auto-dismiss
 *   - login/register used class "alert alert-{type}" without close or auto-dismiss
 *
 * @param {string} type       - "success" | "danger" | "warning" | "info"
 * @param {string} message    - Text to display
 * @param {object} [options]
 * @param {string}  [options.variant="dashboard"] - "dashboard" for solid banners, "auth" for translucent inline
 * @param {boolean} [options.dismissible]         - Show close button (default: true for dashboard, false for auth)
 * @param {number|null} [options.autoCloseMs]     - Auto-remove after ms (default: 5000 for dashboard, null for auth)
 */
function showAlert(type, message, options = {}) {
    const variant = options.variant || "dashboard";
    const dismissible = options.dismissible ?? (variant === "dashboard");
    const autoCloseMs = options.autoCloseMs ?? (variant === "dashboard" ? 5000 : null);
    const container = document.getElementById("alert-container");
    if (!container) return;

    if (variant === "auth") {
        container.innerHTML = `
            <div class="alert alert-${type}">
                <span>${message}</span>
            </div>
        `;
    } else {
        const closeBtn = dismissible
            ? `<button class="alert-close-btn" onclick="this.parentElement.remove()">&times;</button>`
            : '';
        container.innerHTML = `
            <div class="alert-message ${type}">
                <span>${message}</span>
                ${closeBtn}
            </div>
        `;
    }

    if (autoCloseMs) {
        setTimeout(() => { container.innerHTML = ""; }, autoCloseMs);
    }
}

/**
 * Populate the standard navigation header with the current user's info.
 * Expects elements #header-username and #header-role in the DOM.
 * Previously duplicated in dashboard.html and course.html.
 *
 * @param {object} user - The current user object (must have .username and .is_staff)
 */
function initHeader(user) {
    if (!user) return;

    const usernameEl = document.getElementById("header-username");
    const roleEl = document.getElementById("header-role");

    if (usernameEl) usernameEl.innerText = user.username;
    if (roleEl) {
        if (user.is_staff) {
            roleEl.innerText = "Administrador";
            roleEl.className = "user-role admin";
        } else {
            roleEl.innerText = "Estudiante";
            roleEl.className = "user-role student";
        }
    }
}

/**
 * Open/close a modal by ID.
 * Previously defined inline in dashboard.html.
 */
function closeModal(id) {
    document.getElementById(id).style.display = "none";
}

/**
 * Filter modules belonging to a course and sort by order.
 * Previously duplicated across dashboard.html (admin + student) and course.html.
 *
 * @param {Array} allModules - Full list of module objects
 * @param {number} courseId  - Course ID to filter by
 * @returns {Array} Sorted modules for the given course
 */
function getModulesForCourse(allModules, courseId) {
    return allModules
        .filter(m => m.course_id === courseId)
        .sort((a, b) => a.order - b.order);
}

/**
 * Filter videos belonging to a module and sort by order.
 * Previously duplicated across dashboard.html and course.html.
 *
 * @param {Array} allVideos - Full list of video objects
 * @param {number} moduleId - Module ID to filter by
 * @returns {Array} Sorted videos for the given module
 */
function getVideosForModule(allVideos, moduleId) {
    return allVideos
        .filter(v => v.module_id === moduleId)
        .sort((a, b) => a.order - b.order);
}
