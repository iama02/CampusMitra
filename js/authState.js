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
            <div class="relative group/notif inline-block mr-4">
                <button id="notifBtn" onclick="toggleNotifDropdown()" class="relative p-2 text-gray-500 hover:text-primary transition-colors focus:outline-none rounded-full hover:bg-gray-100">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                    <span id="notifBadge" class="hidden absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">0</span>
                </button>
                <div id="notifDropdown" class="hidden absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 z-50 overflow-hidden transform opacity-0 scale-95 transition-all duration-200 origin-top-right">
                    <div class="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 class="text-sm font-bold text-gray-900">Notifications</h3>
                        <div class="flex gap-3">
                            <button onclick="markAllRead()" class="text-xs text-primary font-medium hover:underline focus:outline-none">Mark read</button>
                            <button onclick="clearAllNotifications()" class="text-xs text-red-500 font-medium hover:underline focus:outline-none">Clear all</button>
                        </div>
                    </div>
                    <div id="notifList" class="max-h-80 overflow-y-auto custom-scrollbar">
                        <!-- Notifications injected here -->
                    </div>
                </div>
            </div>
            <a href="${pagesPath}profile.html" class="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors font-bold text-base md:text-lg pl-2 group">
                <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary text-white flex items-center justify-center font-extrabold text-xl shadow-md transform group-hover:scale-110 transition-transform">
                    ${user.name.charAt(0).toUpperCase()}
                </div>
                <span class="hidden lg:block ml-1">${user.name.split(' ')[0]}</span>
            </a>
            <button onclick="handleLogout()" class="text-base font-bold text-red-600 hover:bg-red-50 px-6 py-2.5 rounded-full transition-colors border-2 border-red-100 hover:border-red-200 ml-4">
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

        const getStartedBtn = document.getElementById('getStartedBtn');
        if (getStartedBtn) {
            getStartedBtn.innerText = "Go to Dashboard";
            getStartedBtn.href = pagesPath + "profile.html";
        }
    }
});

window.handleLogout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    const isPagesDir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
    window.location.href = isPagesDir ? '../index.html' : 'index.html';
};

window.toggleNotifDropdown = function() {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        setTimeout(() => dropdown.classList.remove('opacity-0', 'scale-95'), 10);
    } else {
        dropdown.classList.add('opacity-0', 'scale-95');
        setTimeout(() => dropdown.classList.add('hidden'), 200);
    }
}

document.addEventListener('click', (e) => {
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    if (notifBtn && notifDropdown) {
        if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target) && !notifDropdown.classList.contains('hidden')) {
            window.toggleNotifDropdown();
        }
    }
});

window.fetchNotifications = async function() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch('/api/notifications', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            const data = await res.json();
            renderNotifications(data);
        }
    } catch(e) { console.error('Failed to fetch notifications', e); }
};

function renderNotifications(notifs) {
    const isPagesDir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
    const notifList = document.getElementById('notifList');
    const notifBadge = document.getElementById('notifBadge');
    if (!notifList || !notifBadge) return;
    
    let unreadCount = 0;
    notifList.innerHTML = '';
    
    if (notifs.length === 0) {
        notifList.innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">No notifications yet.</div>';
    } else {
        notifs.forEach(n => {
            if (!n.isRead) unreadCount++;
            
            let link = n.link || '#';
            if (isPagesDir && link.startsWith('/pages/')) {
                link = link.replace('/pages/', './');
            } else if (!isPagesDir && link.startsWith('/pages/')) {
                link = '.' + link;
            }

            const isUnread = !n.isRead;
            const itemHtml = `<div class="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${isUnread ? 'bg-blue-50/30' : 'opacity-60'}" onclick="handleNotifClick('${n._id}', '${link}')">
                <div class="flex gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-primary'}">
                        ${n.type === 'success' ? '✓' : n.type === 'warning' ? '!' : 'i'}
                    </div>
                    <div>
                        <h4 class="text-sm font-bold ${isUnread ? 'text-gray-900' : 'text-gray-700'}">${n.title}</h4>
                        <p class="text-xs text-gray-600 mt-0.5">${n.message}</p>
                        <span class="text-[10px] text-gray-400 mt-1 block">${new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                </div>
            </div>`;
            notifList.insertAdjacentHTML('beforeend', itemHtml);
        });
    }
    
    if (unreadCount > 0) {
        notifBadge.textContent = unreadCount;
        notifBadge.classList.remove('hidden');
    } else {
        notifBadge.classList.add('hidden');
    }
}

window.handleNotifClick = async function(id) {
    const token = localStorage.getItem('token');
    await fetch('/api/notifications/' + id + '/read', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    
    // Unconditionally redirect to Dashboard
    const isPagesDir = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
    window.location.href = isPagesDir ? 'profile.html' : 'pages/profile.html';
};

window.markAllRead = async function() {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    window.fetchNotifications();
};

window.clearAllNotifications = async function() {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!confirm("Are you sure you want to permanently delete all notifications?")) return;
    await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    window.fetchNotifications();
};

// Initial fetch and polling
if (localStorage.getItem('token')) {
    window.fetchNotifications();
    setInterval(window.fetchNotifications, 30000);
}

