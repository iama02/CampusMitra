document.addEventListener('DOMContentLoaded', async () => {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        // Redirct to auth if not logged in
        window.location.href = 'auth.html';
        return;
    }

    const user = JSON.parse(userJson);

    // Populate basic info
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileAvatar').textContent = user.name.charAt(0).toUpperCase();

    // Fetch user items from backend to populate "Items Listed"
    try {
        const response = await fetch('http://localhost:3000/api/items');
        if (response.ok) {
            const allItems = await response.json();
            
            // Filter only items owned by this user
            const userItems = allItems.filter(item => item.owner === user.name);
            
            // Update Stat
            document.getElementById('statItems').textContent = userItems.length;

            // Render list
            const listContainer = document.getElementById('userItemsList');
            if (userItems.length === 0) {
                listContainer.innerHTML = `
                    <div class="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p class="text-gray-500 font-medium text-sm mb-3">You haven't listed any items yet.</p>
                        <a href="borrow.html" class="inline-block px-5 py-2 bg-primary text-white text-sm font-semibold rounded-full hover:bg-secondary transition-colors">Go to Borrow & Rent</a>
                    </div>
                `;
            } else {
                listContainer.innerHTML = '';
                userItems.forEach(item => {
                    const badgeColor = item.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700';
                    listContainer.innerHTML += `
                        <div class="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors group">
                            <div class="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                                <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="text-gray-900 font-bold truncate">${item.name}</h4>
                                <div class="flex items-center gap-3 mt-1">
                                    <span class="text-xs font-semibold px-2 py-0.5 rounded-md ${badgeColor}">${item.status}</span>
                                    <span class="text-sm font-extrabold text-primary">₹${item.price}<span class="text-xs text-gray-500 font-medium">/${item.timeUnit}</span></span>
                                </div>
                            </div>
                            <button onclick="window.location.href='borrow.html'" class="px-4 py-2 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:text-primary hover:border-primary transition-colors hidden sm:block">View In Store</button>
                        </div>
                    `;
                });
            }
        }
    } catch (err) {
        console.error("Failed to fetch user items", err);
        document.getElementById('userItemsList').innerHTML = `<p class="text-red-500 p-4">Error loading data.</p>`;
    }

    // Since we don't have backend APIs for Tutoring or Lost&Found yet, mock those stats based on user data hash or 0
    document.getElementById('statTutor').textContent = Math.floor(user.name.length % 3);
    document.getElementById('statLost').textContent = Math.floor(user.name.length % 2);

});

window.openSettings = function() {
    const modal = document.getElementById('settingsModal');
    const backdrop = document.getElementById('settingsBackdrop');
    const content = document.getElementById('settingsContent');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    setTimeout(() => {
        modal.classList.remove('pointer-events-none');
        backdrop.classList.remove('opacity-0');
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.closeSettings = function() {
    const modal = document.getElementById('settingsModal');
    const backdrop = document.getElementById('settingsBackdrop');
    const content = document.getElementById('settingsContent');
    
    backdrop.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    modal.classList.add('pointer-events-none');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

