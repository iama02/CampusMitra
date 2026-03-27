const LF_STORAGE_KEY = 'lostFoundItems';

const DEFAULT_LF_ITEMS = [
    {
        id: "lf1",
        type: "Lost",
        name: "Black Dell Laptop Charger",
        description: "It has a tiny white scratch on the plug. Lost around the 2nd floor library.",
        location: "Library 2nd Floor",
        date: new Date().toLocaleDateString(),
        status: "Open"
    },
    {
        id: "lf2",
        type: "Found",
        name: "Casio Scientific Calculator",
        description: "Found a grey Casio fx-991EX near the cafeteria entrance.",
        location: "Cafeteria",
        date: new Date().toLocaleDateString(),
        status: "Open"
    }
];

document.addEventListener('DOMContentLoaded', () => {
    initLfItems();
    
    const filterEl = document.getElementById('lfFilter');
    if(filterEl){
        filterEl.addEventListener('change', (e) => {
            renderLfItems(e.target.value);
        });
    }
});

function initLfItems() {
    if (!localStorage.getItem(LF_STORAGE_KEY)) {
        localStorage.setItem(LF_STORAGE_KEY, JSON.stringify(DEFAULT_LF_ITEMS));
    }
    renderLfItems('All');
}

function getLfItems() {
    return JSON.parse(localStorage.getItem(LF_STORAGE_KEY)) || [];
}

function renderLfItems(filter = 'All') {
    const grid = document.getElementById('lfGrid');
    if(!grid) return;
    const items = getLfItems();
    
    grid.innerHTML = '';
    
    const filtered = items.filter(item => filter === 'All' || item.type === filter);
    
    filtered.forEach(item => {
        const typeClass = item.type === 'Lost' ? 'bg-red-100 text-danger border-red-200' : 'bg-emerald-100 text-success border-emerald-200';
        
        const cardHTML = `
            <div class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 p-5 flex flex-col hover:-translate-y-1 transition-transform duration-300 relative group">
                <div class="absolute top-4 right-4 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${typeClass}">
                    ${item.type} Item
                </div>
                <h3 class="text-lg font-bold text-gray-900 pr-24 mb-2 truncate group-hover:text-primary transition-colors">${item.name}</h3>
                <p class="text-sm text-gray-600 mb-5 line-clamp-2 flex-1 leading-relaxed">${item.description}</p>
                
                <div class="mt-auto space-y-2 text-xs text-gray-500 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div class="flex items-center gap-2"><span>📍</span> ${item.location}</div>
                    <div class="flex items-center gap-2"><span>📅</span> ${item.date}</div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

const STOP_WORDS = new Set(['a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'to', 'of', 'from', 'my', 'i', 'for', 'lost', 'found', 'missing', 'looking', 'has', 'have', 'had', 'with', 'around', 'near', 'and', 'or', 'but']);

function tokenize(text) {
    if (!text) return [];
    // Lowercase and remove non-alphanumeric except spaces
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    // Filter short words and stop words
    return words.filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function checkMatch(newItem, existingItems) {
    const matches = [];
    
    // Tokenize new item text
    const newTokens = new Set([...tokenize(newItem.name), ...tokenize(newItem.description)]);
    const newLocTokens = new Set(tokenize(newItem.location));

    const totalWords = newTokens.size;
    if (totalWords === 0) return matches;

    existingItems.forEach(item => {
        // Only match opposite types (Lost vs Found)
        if (item.type !== newItem.type && item.status === 'Open') {
            const itemTokens = new Set([...tokenize(item.name), ...tokenize(item.description)]);
            const itemLocTokens = new Set(tokenize(item.location));
            
            // Calculate common tokens
            let commonCount = 0;
            itemTokens.forEach(token => {
                if (newTokens.has(token)) commonCount++;
            });
            
            // similarity = (number of matching words / total words) * 100
            let MathSimilarity = (commonCount / totalWords) * 100;
            
            // Location boost
            let locCommon = 0;
            itemLocTokens.forEach(token => {
                if (newLocTokens.has(token)) locCommon++;
            });
            if (locCommon > 0) {
                MathSimilarity += 15; // small boost for identical location match
            }
            
            // Cap at 99% (unless completely identical natively, limit to 100)
            const similarity = Math.min(Math.round(MathSimilarity), 100);
            
            if (similarity >= 60) {
                matches.push({
                    item,
                    score: similarity
                });
            }
        }
    });
    
    // Sort highest score first
    return matches.sort((a, b) => b.score - a.score);
}

window.handleLfSubmit = function(event) {
    event.preventDefault();
    
    const type = document.querySelector('input[name="itemType"]:checked').value;
    const name = document.getElementById('lfName').value.trim();
    const description = document.getElementById('lfDesc').value.trim();
    const location = document.getElementById('lfLocation').value.trim();
    
    const newItem = {
        id: 'lf' + Date.now(),
        type,
        name,
        description,
        location,
        date: new Date().toLocaleDateString(),
        status: "Open"
    };
    
    const existingItems = getLfItems();
    
    // Check matches BEFORE adding the new item to avoid matching with itself or similar new duplicates immediately
    const matches = checkMatch(newItem, existingItems);
    
    // Save to storage
    existingItems.unshift(newItem);
    localStorage.setItem(LF_STORAGE_KEY, JSON.stringify(existingItems));
    
    // Update UI
    document.getElementById('lfForm').reset();
    renderLfItems(document.getElementById('lfFilter').value);
    
    if (matches.length > 0) {
        showMatchModal(matches, newItem);
    } else {
        alert("Item reported successfully! No current matches found based on AI keyword analysis. We'll automatically notify you if a match appears.");
    }
}

function showMatchModal(matches, newItem) {
    const modal = document.getElementById('matchModal');
    const backdrop = document.getElementById('matchBackdrop');
    const content = document.getElementById('matchContent');
    const container = document.getElementById('matchResultsContainer');
    
    container.innerHTML = ''; // clear previous
    
    matches.forEach(m => {
        const item = m.item;
        let isHighConfidence = m.score >= 80;
        let badgeColor = isHighConfidence ? 'bg-success text-white' : 'bg-orange-500 text-white';
        let badgeText = isHighConfidence ? 'High Confidence (' + m.score + '%)' : 'Possible Match (' + m.score + '%)';
        let borderBgClass = isHighConfidence ? 'border-emerald-200 bg-emerald-50/40 shadow-emerald-900/5' : 'border-orange-200 bg-orange-50/40 shadow-orange-900/5';
        
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
                        <span class="flex items-center gap-1">📅 ${item.date}</span>
                        <span class="uppercase font-bold text-gray-700">• ${item.type}</span>
                    </div>
                </div>
                <button class="shrink-0 px-5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold hover:border-primary hover:text-primary transition-all shadow-sm active:scale-95" onclick="alert('Contact details modal would open here to coordinate item return.')">
                    Contact Finder
                </button>
            </div>
        `;
    });
    
    // Modify html structure classes to show modal
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
