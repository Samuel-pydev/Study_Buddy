// =========================================
// STUDY BUDDY — SHARED JAVASCRIPT
// =========================================

const API = 'http://127.0.0.1:8000';
const token = localStorage.getItem('token');

// Redirect to login if not logged in
if (!token && !window.location.pathname.includes('index.html')) {
    window.location.href = '/static/HTML/index.html';
}

// Ensure elements exist before adding listeners
document.addEventListener('DOMContentLoaded', () => {

    // --- THEMING ---
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        // Load saved theme
        const savedTheme = localStorage.getItem('studybuddy_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);

        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('studybuddy_theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        const icon = document.getElementById('themeIcon');
        const text = document.getElementById('themeText');
        if (!icon || !text) return;

        if (theme === 'light') {
            icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 18C8.686 18 6 15.314 6 12s2.686-6 6-6s6 2.686 6 6s-2.686 6-6 6m0-2a4 4 0 1 0 0-8a4 4 0 0 0 0 8M11 1h2v3h-2zm0 19h2v3h-2zM3.515 4.929l1.414-1.414L7.05 5.636L5.636 7.05zM16.95 18.364l1.414-1.414l2.121 2.121l-1.414 1.414zm2.121-14.85l1.414 1.415l-2.121 2.121l-1.414-1.414zM5.636 16.95l1.414 1.414l-2.121 2.121l-1.414-1.414zM23 11v2h-3v-2zM4 11v2H1v-2z"/></svg>`;
            text.textContent = 'Light Mode';
        } else {
            icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M10 7a7 7 0 0 0 12 4.9v.1c0 5.523-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2h.1A6.979 6.979 0 0 0 10 7m-6 5a8 8 0 0 0 15.062 3.762A9 9 0 0 1 8.238 4.938A7.999 7.999 0 0 0 4 12"/></svg>`;
            text.textContent = 'Dark Mode';
        }
    }


    // --- SIDEBAR MOBILE TOGGLE ---
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (hamburger && sidebar && overlay) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden'; // prevent background scrolling
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        });
    }

});

// --- LOGOUT ---
async function handleLogout() {
    try {
        await fetch(`${API}/auth/logout`, {
            method: 'POST',
            headers: { 'authorization': `Bearer ${token}` }
        });
    } catch (err) {}
    localStorage.clear();
    window.location.href = '/static/HTML/index.html';
}

function showMessage(text, type, containerId = 'message') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.textContent = text;
    el.className = `msg-box ${type}`;
}

function hideMessage(containerId = 'message') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.className = 'msg-box';
}
