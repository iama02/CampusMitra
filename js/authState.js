document.addEventListener('DOMContentLoaded', () => {
    const userJson = localStorage.getItem('user');
    const authContainerDesktop = document.getElementById('auth-buttons');
    const mobileMenu = document.getElementById('mobile-menu');
    
    const isPagesDir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
    const rootPath = isPagesDir ? '../' : './';
    const pagesPath = isPagesDir ? './' : 'pages/';

    if (userJson && authContainerDesktop) {
        const user = JSON.parse(userJson);
        
        // Desktop Navbar update
        const profileHtml = `
            <a href="${pagesPath}profile.html" class="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors font-semibold text-sm group">
                <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-bold shadow-md transform group-hover:scale-110 transition-transform">
                    ${user.name.charAt(0).toUpperCase()}
                </div>
                <span class="hidden lg:block">${user.name.split(' ')[0]}</span>
            </a>
            <button onclick="handleLogout()" class="text-sm font-semibold text-red-600 hover:bg-red-50 px-4 py-2 rounded-full transition-colors border border-red-100 hover:border-red-200">
                Logout
            </button>
        `;
        authContainerDesktop.innerHTML = profileHtml;

        // Mobile Menu update
        if (mobileMenu) {
            const mobileAuthDiv = mobileMenu.querySelector('.flex.flex-col.gap-3');
            if (mobileAuthDiv) {
                mobileAuthDiv.innerHTML = `
                    <div class="flex items-center justify-center gap-3 mb-2 bg-blue-50 py-3 rounded-xl border border-blue-100">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-bold shadow-sm">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="flex flex-col text-left">
                            <span class="text-sm font-bold text-gray-900">${user.name}</span>
                            <span class="text-xs text-gray-500">${user.email}</span>
                        </div>
                    </div>
                    <a href="${pagesPath}profile.html" class="text-base font-semibold text-center text-primary border border-blue-100 px-4 py-3 rounded-xl hover:bg-blue-50 transition-all">My Profile</a>
                    <button onclick="handleLogout()" class="text-base font-semibold text-center bg-red-50 text-red-600 px-4 py-3 rounded-xl hover:bg-red-100 transition-colors shadow-sm">Logout</button>
                `;
            }
        }
    }
});

window.handleLogout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    const isPagesDir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
    window.location.href = isPagesDir ? '../index.html' : 'index.html';
};
