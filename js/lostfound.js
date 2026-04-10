document.addEventListener('DOMContentLoaded', () => {
    initLfItems();
    
    const filterEl = document.getElementById('lfFilter');
    if(filterEl){
        filterEl.addEventListener('change', (e) => {
            renderLfItems(e.target.value);
        });
    }
});

let cachedItems = [];

async function initLfItems() {
    try {
        const res = await fetch('/api/lostfound');
        if (!res.ok) throw new Error('Failed to fetch items');
        cachedItems = await res.json();
    } catch (e) {
        console.error("Fetch error:", e);
    }
    renderLfItems('All');
}

function renderLfItems(filter = 'All') {
    const grid = document.getElementById('lfGrid');
    if(!grid) return;
    
    grid.innerHTML = '';
    
    const filtered = cachedItems.filter(item => filter === 'All' || item.type === filter);
    
    if(filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-8 font-medium">No items reported yet.</div>`;
        return;
    }
    
    const userJson = localStorage.getItem('user');
    const currentUser = userJson ? JSON.parse(userJson) : null;
    
    filtered.forEach(item => {
        const typeClass = item.type === 'Lost' ? 'bg-red-100 text-danger border-red-200' : 'bg-emerald-100 text-success border-emerald-200';
        const displayDate = item.date || new Date(item.createdAt).toLocaleDateString();
        
        const isOwner = currentUser && currentUser.email === item.reporterEmail;
        const deleteBtn = isOwner ? `<button onclick="deleteLfItem('${item._id}')" class="ml-2 text-xs text-emerald-600 hover:text-emerald-700 font-bold px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors flex items-center gap-1"><span>✨</span> Resolved</button>` : '';
        
        const cardHTML = `
            <div class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 p-5 flex flex-col hover:-translate-y-1 transition-transform duration-300 relative group">
                <div class="absolute top-4 right-4 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${typeClass}">
                    ${item.type} Item
                </div>
                <h3 class="text-lg font-bold text-gray-900 pr-24 mb-2 truncate group-hover:text-primary transition-colors">${item.name}</h3>
                <p class="text-sm text-gray-600 mb-5 line-clamp-2 flex-1 leading-relaxed">${item.description}</p>
                
                <div class="mt-auto space-y-2 text-xs text-gray-500 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2"><span>📍</span> ${item.location}</div>
                        ${deleteBtn}
                    </div>
                    <div class="flex items-center gap-2"><span>👤</span> ${item.reporterName}</div>
                    <div class="flex items-center justify-between">
                        <span class="flex items-center gap-2"><span>📅</span> ${displayDate}</span>
                        ${item.reporterWhatsapp ? `<a href="https://wa.me/91${item.reporterWhatsapp}?text=Hi!%20I%20am%20contacting%20you%20regarding%20your%20${item.type}%20post:%20${encodeURIComponent(item.name)}" target="_blank" class="text-xs text-success font-bold hover:underline">WhatsApp</a>` : `<a href="mailto:${item.reporterEmail}" class="text-xs text-primary font-bold hover:underline">Email</a>`}
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

window.handleLfSubmit = async function(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) {
        showToast("You must be logged in to report an item.", "error");
        setTimeout(() => window.location.href = 'auth.html', 1500);
        return;
    }
    
    const type = document.querySelector('input[name="itemType"]:checked').value;
    const name = document.getElementById('lfName').value.trim();
    const description = document.getElementById('lfDesc').value.trim();
    const location = document.getElementById('lfLocation').value.trim();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Analyzing matches...";
    submitBtn.disabled = true;
    
    const payload = { type, name, description, location };

    try {
        const response = await fetch('/api/lostfound', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to post reported item.');
        const data = await response.json();

        // Newly saved item added to top
        cachedItems.unshift(data.item);
        
        // Update UI
        document.getElementById('lfForm').reset();
        renderLfItems(document.getElementById('lfFilter').value);
        
        if (data.matches && data.matches.length > 0) {
            showMatchModal(data.matches, data.item);
        } else {
            showToast("Item reported successfully! Listed on the dashboard.", "success");
        }
    } catch (err) {
        showToast("Error: " + err.message, "error");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}

function showMatchModal(matches, newItem) {
    const modal = document.getElementById('matchModal');
    const backdrop = document.getElementById('matchBackdrop');
    const content = document.getElementById('matchContent');
    const container = document.getElementById('matchResultsContainer');
    
    container.innerHTML = ''; 
    
    matches.forEach(m => {
        const item = m.item;
        let isHighConfidence = m.score >= 80;
        let badgeColor = isHighConfidence ? 'bg-success text-white' : 'bg-orange-500 text-white';
        let badgeText = isHighConfidence ? 'High Confidence (' + m.score + '%)' : 'Possible Match (' + m.score + '%)';
        let borderBgClass = isHighConfidence ? 'border-emerald-200 bg-emerald-50/40 shadow-emerald-900/5' : 'border-orange-200 bg-orange-50/40 shadow-orange-900/5';
        
        const displayDate = item.date || new Date(item.createdAt).toLocaleDateString();
        
        let contactBtn = item.reporterWhatsapp 
          ? `<a href="https://wa.me/91${item.reporterWhatsapp}" target="_blank" class="shrink-0 px-5 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#128C7E] transition-all shadow-sm active:scale-95 text-center">Chat WhatsApp</a>`
          : `<a href="mailto:${item.reporterEmail}" class="shrink-0 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-secondary transition-all shadow-sm active:scale-95 text-center">Email Reporter</a>`;
        
        container.innerHTML += `
            <div class="border-2 rounded-2xl p-5 overflow-hidden shadow-sm relative ${borderBgClass} flex flex-col md:flex-row gap-5 items-start md:items-center justify-between transition-transform hover:-translate-y-0.5">
                <div class="flex-1">
                    <div class="inline-flex items-center gap-1.5 px-3 py-1 ${badgeColor} text-[10px] font-bold uppercase tracking-wider rounded-md mb-2.5">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
                        ${badgeText}
                    </div>
                    <h4 class="text-lg font-bold text-gray-900 mb-1">${item.name}</h4>
                    <p class="text-sm text-gray-700 leading-relaxed">${item.description}</p>
                    <div class="text-xs text-gray-500 font-medium mt-3.5 flex items-center gap-3">
                        <span class="flex items-center gap-1">📍 ${item.location}</span>
                        <span class="flex items-center gap-1">📅 ${displayDate}</span>
                        <span class="uppercase font-bold text-gray-700">• ${item.type}</span>
                    </div>
                </div>
                ${contactBtn}
            </div>
        `;
    });
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    setTimeout(() => {
        modal.classList.remove('pointer-events-none');
        backdrop.classList.remove('opacity-0');
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

window.closeMatchModal = function() {
    const modal = document.getElementById('matchModal');
    const content = document.getElementById('matchContent');
    const backdrop = document.getElementById('matchBackdrop');
    
    backdrop.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    modal.classList.add('pointer-events-none');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

window.deleteLfItem = function(id) {
    showConfirm('Are you sure you want to mark this item as resolved? It will be permanently removed from the dashboard.', async () => {
        try {
            const response = await fetch(`/api/lostfound/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to update item');
            
            cachedItems = cachedItems.filter(item => item._id !== id);
            renderLfItems(document.getElementById('lfFilter') ? document.getElementById('lfFilter').value : 'All');
            showToast("Item marked as resolved! 🎉", "success");
        } catch (err) {
            showToast(err.message, "error");
        }
    });
}

// UI Utilities
window.showToast = function(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed bottom-5 right-5 z-[200] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `transform transition-all duration-300 translate-y-10 opacity-0 px-6 py-4 rounded-xl shadow-xl border flex items-center gap-3 font-semibold text-sm pointer-events-auto ${type === 'success' ? 'bg-white border-emerald-200 text-emerald-800 shadow-emerald-900/10' : 'bg-red-50 border-red-200 text-red-800 shadow-red-900/10'}`;
    toast.innerHTML = `<span class="text-lg">${type === 'success' ? '✨' : '⚠️'}</span><span>${message}</span>`;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-y-10', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

window.showConfirm = function(message, onConfirm) {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[200] bg-gray-900/40 backdrop-blur-sm flex items-center justify-center opacity-0 transition-opacity duration-200';
    
    const dialog = document.createElement('div');
    dialog.className = 'bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 transform scale-95 opacity-0 transition-all duration-200 flex flex-col items-center text-center';
    
    dialog.innerHTML = `
        <div class="w-14 h-14 rounded-full bg-emerald-50 text-success flex items-center justify-center mb-4 text-2xl shadow-inner border border-emerald-100">✨</div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Mark as Resolved?</h3>
        <p class="text-sm text-gray-500 mb-6 font-medium">${message}</p>
        <div class="flex gap-3 w-full">
            <button class="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors shadow-sm" onclick="this.closest('.fixed').remove()">Cancel</button>
            <button id="confirm-btn-action" class="flex-1 px-4 py-2.5 bg-success hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors shadow-sm">Confirm</button>
        </div>
    `;
    
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    
    dialog.querySelector('#confirm-btn-action').addEventListener('click', () => {
        backdrop.remove();
        onConfirm();
    });
    
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        dialog.classList.remove('scale-95', 'opacity-0');
    }, 10);
}
