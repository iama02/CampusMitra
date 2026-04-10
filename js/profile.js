const tabsState = {
    incomingTutor: 'active',
    outgoingTutor: 'active',
    incomingBorrow: 'active',
    outgoingBorrow: 'active'
};

window.setTab = function(type, tabName) {
    tabsState[type] = tabName;
    const activeBtn = document.getElementById(`tab-${type}-active`);
    const historyBtn = document.getElementById(`tab-${type}-history`);
    if(activeBtn && historyBtn) {
        if(tabName === 'active') {
            activeBtn.className = "px-3 py-1 text-xs font-bold rounded-md bg-white shadow-sm text-gray-900";
            historyBtn.className = "px-3 py-1 text-xs font-bold rounded-md text-gray-500 hover:text-gray-900";
        } else {
            historyBtn.className = "px-3 py-1 text-xs font-bold rounded-md bg-white shadow-sm text-gray-900";
            activeBtn.className = "px-3 py-1 text-xs font-bold rounded-md text-gray-500 hover:text-gray-900";
        }
    }
    if(type === 'incomingTutor') fetchIncomingRequests();
    if(type === 'outgoingTutor') fetchOutgoingRequests();
    if(type === 'incomingBorrow') fetchIncomingBorrowRequests();
    if(type === 'outgoingBorrow') fetchOutgoingBorrowRequests();
};

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
        const response = await fetch('/api/items');
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
                                    <span class="text-sm font-extrabold text-primary">&#8377;${item.price}<span class="text-xs text-gray-500 font-medium">/${item.timeUnit}</span></span>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="window.location.href='borrow.html'" class="px-4 py-2 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:text-primary hover:border-primary transition-colors hidden sm:block">View In Store</button>
                                ${item.status === 'Available' ? 
                                    `<button onclick="deleteListedItem('${item.id}')" title="Delete Item" class="px-3 py-2 text-sm font-bold text-red-500 bg-red-50 border border-red-100 rounded-lg hover:bg-red-500 hover:text-white transition-colors hidden sm:flex items-center justify-center">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>` 
                                : ''}
                            </div>
                        </div>
                    `;
                });
            }
        }
    } catch (err) {
        console.error('Failed to fetch user items', err);
        document.getElementById('userItemsList').innerHTML = `<p class="text-red-500 p-4">Error loading data.</p>`;
    }

    try {
        const tutoringResponse = await fetch('/api/tutors/me/summary', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (tutoringResponse.ok) {
            const tutoringSummary = await tutoringResponse.json();
            document.getElementById('statTutor').textContent = tutoringSummary.profileCount + tutoringSummary.outgoingRequests;
        } else {
            document.getElementById('statTutor').textContent = '0';
        }
    } catch (err) {
        console.error('Failed to fetch tutoring summary', err);
        document.getElementById('statTutor').textContent = '0';
    }

    // Lost & Found still uses frontend storage only for now.
    document.getElementById('statLost').textContent = Math.floor(user.name.length % 2);

    // Fetch Tutoring Requests
    await fetchIncomingRequests();
    await fetchOutgoingRequests();

    // Fetch Borrow Requests
    await fetchIncomingBorrowRequests();
    await fetchOutgoingBorrowRequests();

});

async function fetchIncomingRequests() {
    const listContainer = document.getElementById('incomingRequestsList');
    try {
        const response = await fetch('/api/tutors/requests/incoming', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch incoming requests');
        
        let requests = await response.json();
        
        if(tabsState.incomingTutor === 'active') {
            requests = requests.filter(r => r.status === 'Pending' || r.status === 'Accepted');
        } else {
            requests = requests.filter(r => r.status === 'Declined');
        }

        if (requests.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-8 text-gray-400 font-medium text-sm">No incoming requests.</div>`;
            return;
        }

        listContainer.innerHTML = requests.map(req => {
            const statusClass = req.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                                req.status === 'Declined' ? 'bg-red-100 text-red-700' :
                                'bg-orange-100 text-orange-700';

            let actions = req.status === 'Pending' ? `
                <div class="flex gap-2 mt-3">
                    <button onclick="updateRequestStatus('${req._id}', 'Accepted')" class="px-3 py-1.5 text-xs font-bold text-white bg-success hover:bg-emerald-600 rounded-lg transition-colors">Accept</button>
                    <button onclick="updateRequestStatus('${req._id}', 'Declined')" class="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Decline</button>
                </div>
            ` : (req.status === 'Declined' ? `
                <div class="flex gap-2 mt-3">
                    <button onclick="updateRequestStatus('${req._id}', 'Accepted')" class="px-3 py-1.5 text-xs font-bold text-white bg-gray-400 hover:bg-success rounded-lg transition-colors">Accept Instead</button>
                </div>
            ` : '');

            let whatsappBtn = req.requesterWhatsapp ? `
                <a href="https://wa.me/91${req.requesterWhatsapp}?text=Hi!%20I%20am%20reaching%20out%20from%20CampusMitra%20regarding%20your%20tutoring%20request." target="_blank" class="mt-2 inline-flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-bold rounded-lg transition-colors">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.277.584 4.498 1.696 6.442L.092 24l5.688-1.492a11.967 11.967 0 0 0 6.251 1.761h.005c6.645 0 12.029-5.385 12.029-12.031S18.675 0 12.031 0zm0 22.268a9.924 9.924 0 0 1-5.068-1.385l-.364-.216-3.766.988.995-3.674-.236-.376C2.262 15.65 1.551 13.882 1.551 12.031 1.551 6.241 6.245 1.543 12.035 1.543c2.798 0 5.426 1.092 7.404 3.076 1.977 1.983 3.067 4.619 3.067 7.412 0 5.79-4.694 10.437-10.475 10.437zm5.748-7.85c-.314-.158-1.859-.918-2.146-1.023-.287-.105-.496-.158-.705.158-.209.317-.811 1.023-.995 1.233-.183.21-.367.237-.682.079-.315-.158-1.325-.489-2.525-1.558-.934-.83-1.565-1.855-1.748-2.171-.183-.316-.02-.487.137-.645.142-.143.315-.368.472-.551.157-.184.209-.316.315-.526.105-.211.052-.395-.026-.552-.079-.158-.705-1.701-.966-2.329-.255-.615-.514-.532-.705-.541-.183-.008-.393-.008-.602-.008s-.551.079-.838.394c-.288.316-1.101 1.077-1.101 2.628s1.127 3.048 1.284 3.258c.157.21 2.215 3.385 5.367 4.743.75.324 1.336.517 1.794.662.753.238 1.439.204 1.979.123.606-.09 1.859-.761 2.121-1.496.262-.735.262-1.365.183-1.496-.079-.131-.288-.21-.602-.368z"/></svg>
                    Chat on WhatsApp
                </a>
            ` : '';

            let ratingBadge = req.requesterRatingCount > 0 ? `<span class="inline-flex items-center gap-0.5 ml-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600 font-bold border border-yellow-100 shadow-sm"><span class="text-yellow-500">★</span> ${req.requesterRating.toFixed(1)} <span class="text-yellow-500/80 font-medium">(${req.requesterRatingCount})</span></span>` : '';

            return `
                <div class="p-4 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors flex flex-col">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="text-gray-900 font-bold text-sm">${req.studentName}${ratingBadge} <span class="text-xs text-gray-500 font-normal ml-1">(${req.requesterRollNo || 'N/A'})</span></h4>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${statusClass}">${req.status}</span>
                    </div>
                    <p class="text-xs text-gray-500 font-medium">Email: <a href="mailto:${req.studentEmail}" class="text-primary hover:underline">${req.studentEmail}</a></p>
                    ${req.requesterWhatsapp ? `<p class="text-xs text-gray-500 font-medium">Phone: ${req.requesterWhatsapp}</p>` : ''}
                    <p class="text-xs text-gray-400 mt-1">Requested on: ${new Date(req.createdAt).toLocaleDateString()}</p>
                    ${actions}
                    ${whatsappBtn}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div class="text-center py-8 text-red-400 font-medium text-sm">Could not load incoming requests.</div>`;
    }
}

async function fetchOutgoingRequests() {
    const listContainer = document.getElementById('outgoingRequestsList');
    try {
        const response = await fetch('/api/tutors/requests/outgoing', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch outgoing requests');
        
        let requests = await response.json();
        
        if(tabsState.outgoingTutor === 'active') {
            requests = requests.filter(r => r.status === 'Pending' || r.status === 'Accepted');
        } else {
            requests = requests.filter(r => r.status === 'Declined');
        }

        if (requests.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-8 text-gray-400 font-medium text-sm">You haven't requested any sessions yet.</div>`;
            return;
        }

        listContainer.innerHTML = requests.map(req => {
            const statusClass = req.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                                req.status === 'Declined' ? 'bg-red-100 text-red-700' :
                                'bg-orange-100 text-orange-700';

            let whatsappBtn = req.tutorWhatsapp ? `
                <a href="https://wa.me/91${req.tutorWhatsapp}?text=Hi!%20I%20am%20reaching%20out%20from%20CampusMitra%20regarding%20my%20tutoring%20session." target="_blank" class="mt-2 inline-flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-bold rounded-lg transition-colors">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.277.584 4.498 1.696 6.442L.092 24l5.688-1.492a11.967 11.967 0 0 0 6.251 1.761h.005c6.645 0 12.029-5.385 12.029-12.031S18.675 0 12.031 0zm0 22.268a9.924 9.924 0 0 1-5.068-1.385l-.364-.216-3.766.988.995-3.674-.236-.376C2.262 15.65 1.551 13.882 1.551 12.031 1.551 6.241 6.245 1.543 12.035 1.543c2.798 0 5.426 1.092 7.404 3.076 1.977 1.983 3.067 4.619 3.067 7.412 0 5.79-4.694 10.437-10.475 10.437zm5.748-7.85c-.314-.158-1.859-.918-2.146-1.023-.287-.105-.496-.158-.705.158-.209.317-.811 1.023-.995 1.233-.183.21-.367.237-.682.079-.315-.158-1.325-.489-2.525-1.558-.934-.83-1.565-1.855-1.748-2.171-.183-.316-.02-.487.137-.645.142-.143.315-.368.472-.551.157-.184.209-.316.315-.526.105-.211.052-.395-.026-.552-.079-.158-.705-1.701-.966-2.329-.255-.615-.514-.532-.705-.541-.183-.008-.393-.008-.602-.008s-.551.079-.838.394c-.288.316-1.101 1.077-1.101 2.628s1.127 3.048 1.284 3.258c.157.21 2.215 3.385 5.367 4.743.75.324 1.336.517 1.794.662.753.238 1.439.204 1.979.123.606-.09 1.859-.761 2.121-1.496.262-.735.262-1.365.183-1.496-.079-.131-.288-.21-.602-.368z"/></svg>
                    Chat on WhatsApp
                </a>
            ` : '';

            let ratingBadge = req.tutorRatingCount > 0 ? `<span class="inline-flex items-center gap-0.5 ml-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600 font-bold border border-yellow-100 shadow-sm"><span class="text-yellow-500">★</span> ${req.tutorRating.toFixed(1)} <span class="text-yellow-500/80 font-medium">(${req.tutorRatingCount})</span></span>` : '';

            return `
                <div class="p-4 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors flex flex-col">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="text-gray-900 font-bold text-sm">To: ${req.tutorName}${ratingBadge} <span class="text-xs text-gray-500 font-normal ml-1">(${req.tutorRollNo || 'N/A'})</span></h4>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${statusClass}">${req.status}</span>
                    </div>
                    ${req.tutorWhatsapp ? `<p class="text-xs text-gray-500 font-medium">Phone: ${req.tutorWhatsapp}</p>` : ''}
                    <p class="text-xs text-gray-400 mt-1">Requested on: ${new Date(req.createdAt).toLocaleDateString()}</p>
                    ${whatsappBtn}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div class="text-center py-8 text-red-400 font-medium text-sm">Could not load outgoing requests.</div>`;
    }
}

async function fetchIncomingBorrowRequests() {
    const listContainer = document.getElementById('incomingBorrowList');
    if(!listContainer) return;

    try {
        const response = await fetch('/api/items/requests/incoming', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch incoming borrow requests');
        
        let requests = await response.json();
        
        if(tabsState.incomingBorrow === 'active') {
            requests = requests.filter(r => r.status === 'Pending' || r.status === 'Accepted' || r.status === 'In Use');
        } else {
            requests = requests.filter(r => r.status === 'Declined' || r.status === 'Returned');
        }

        if (requests.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-8 text-gray-400 font-medium text-sm">No incoming item requests.</div>`;
            return;
        }

        listContainer.innerHTML = requests.map(req => {
            const statusClass = req.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                                req.status === 'Declined' ? 'bg-red-100 text-red-700' :
                                req.status === 'Returned' ? 'bg-blue-100 text-blue-700' :
                                'bg-orange-100 text-orange-700';

            let actions = req.status === 'Pending' ? `
                <div class="flex gap-2 mt-3">
                    <button onclick="updateBorrowRequestStatus('${req._id}', 'Accepted')" class="px-3 py-1.5 text-xs font-bold text-white bg-success hover:bg-emerald-600 rounded-lg transition-colors">Accept</button>
                    <button onclick="updateBorrowRequestStatus('${req._id}', 'Declined')" class="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Decline</button>
                </div>
            ` : (req.status === 'Accepted' ? `
                <div class="flex gap-2 mt-3">
                    <button onclick="openOtpModal('${req._id}', 'handover')" class="w-full px-3 py-2 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5"><span>🔑</span> Verify Handover</button>
                </div>
            ` : (req.status === 'In Use' ? `
                <div class="mt-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-2 text-center">
                    <p class="text-[10px] uppercase font-bold text-gray-500 mb-1">Return PIN</p>
                    <p class="text-xl font-black text-gray-900 tracking-widest">${req.returnOTP || '----'}</p>
                    <p class="text-xs text-gray-500 font-medium mt-1">Show this code when Borrower returns the item</p>
                </div>
            ` : (req.status === 'Declined' ? `
                <div class="flex gap-2 mt-3">
                    <button onclick="updateBorrowRequestStatus('${req._id}', 'Accepted')" class="px-3 py-1.5 text-xs font-bold text-white bg-gray-400 hover:bg-success rounded-lg transition-colors">Accept Instead</button>
                </div>
            ` : '')));

            let whatsappBtn = req.requesterWhatsapp ? `
                <a href="https://wa.me/91${req.requesterWhatsapp}?text=Hi!%20I%20am%20reaching%20out%20from%20CampusMitra%20regarding%20your%20request%20to%20borrow%20${encodeURIComponent(req.itemName)}." target="_blank" class="mt-2 inline-flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-bold rounded-lg transition-colors">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.277.584 4.498 1.696 6.442L.092 24l5.688-1.492a11.967 11.967 0 0 0 6.251 1.761h.005c6.645 0 12.029-5.385 12.029-12.031S18.675 0 12.031 0zm0 22.268a9.924 9.924 0 0 1-5.068-1.385l-.364-.216-3.766.988.995-3.674-.236-.376C2.262 15.65 1.551 13.882 1.551 12.031 1.551 6.241 6.245 1.543 12.035 1.543c2.798 0 5.426 1.092 7.404 3.076 1.977 1.983 3.067 4.619 3.067 7.412 0 5.79-4.694 10.437-10.475 10.437zm5.748-7.85c-.314-.158-1.859-.918-2.146-1.023-.287-.105-.496-.158-.705.158-.209.317-.811 1.023-.995 1.233-.183.21-.367.237-.682.079-.315-.158-1.325-.489-2.525-1.558-.934-.83-1.565-1.855-1.748-2.171-.183-.316-.02-.487.137-.645.142-.143.315-.368.472-.551.157-.184.209-.316.315-.526.105-.211.052-.395-.026-.552-.079-.158-.705-1.701-.966-2.329-.255-.615-.514-.532-.705-.541-.183-.008-.393-.008-.602-.008s-.551.079-.838.394c-.288.316-1.101 1.077-1.101 2.628s1.127 3.048 1.284 3.258c.157.21 2.215 3.385 5.367 4.743.75.324 1.336.517 1.794.662.753.238 1.439.204 1.979.123.606-.09 1.859-.761 2.121-1.496.262-.735.262-1.365.183-1.496-.079-.131-.288-.21-.602-.368z"/></svg>
                    Chat on WhatsApp
                </a>
            ` : '';

            let ratingBadge = req.requesterRatingCount > 0 ? `<span class="inline-flex items-center gap-0.5 ml-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600 font-bold border border-yellow-100 shadow-sm"><span class="text-yellow-500">★</span> ${req.requesterRating.toFixed(1)} <span class="text-yellow-500/80 font-medium">(${req.requesterRatingCount})</span></span>` : '';

            return `
                <div class="p-4 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors flex flex-col">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="text-gray-900 font-bold text-sm">${req.requesterName}${ratingBadge} <span class="text-xs text-gray-500 font-normal ml-1">(${req.requesterRollNo || 'N/A'})</span></h4>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${statusClass}">${req.status}</span>
                    </div>
                    <p class="text-xs font-bold text-primary mb-1">Item: ${req.itemName}</p>
                    <p class="text-xs text-gray-500 font-medium">Email: <a href="mailto:${req.requesterEmail}" class="text-primary hover:underline">${req.requesterEmail}</a></p>
                    ${req.requesterWhatsapp ? `<p class="text-xs text-gray-500 font-medium">Phone: ${req.requesterWhatsapp}</p>` : ''}
                    <p class="text-xs text-gray-400 mt-1">Requested on: ${new Date(req.createdAt).toLocaleDateString()}</p>
                    ${actions}
                    ${whatsappBtn}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div class="text-center py-8 text-red-400 font-medium text-sm">Could not load requests.</div>`;
    }
}

async function fetchOutgoingBorrowRequests() {
    const listContainer = document.getElementById('outgoingBorrowList');
    if(!listContainer) return;

    try {
        const response = await fetch('/api/items/requests/outgoing', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch outgoing borrow requests');
        
        let requests = await response.json();
        
        if(tabsState.outgoingBorrow === 'active') {
            requests = requests.filter(r => r.status === 'Pending' || r.status === 'Accepted' || r.status === 'In Use');
        } else {
            requests = requests.filter(r => r.status === 'Declined' || r.status === 'Returned');
        }

        if (requests.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-8 text-gray-400 font-medium text-sm">You haven't requested any items.</div>`;
            return;
        }

        listContainer.innerHTML = requests.map(req => {
            const statusClass = req.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                                req.status === 'Declined' ? 'bg-red-100 text-red-700' :
                                req.status === 'Returned' ? 'bg-blue-100 text-blue-700' :
                                'bg-orange-100 text-orange-700';

            let whatsappBtn = req.ownerWhatsapp ? `
                <a href="https://wa.me/91${req.ownerWhatsapp}?text=Hi!%20I%20am%20reaching%20out%20from%20CampusMitra%20regarding%20my%20request%20to%20borrow%20${encodeURIComponent(req.itemName)}." target="_blank" class="mt-2 inline-flex items-center justify-center gap-1.5 w-full px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-bold rounded-lg transition-colors">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.277.584 4.498 1.696 6.442L.092 24l5.688-1.492a11.967 11.967 0 0 0 6.251 1.761h.005c6.645 0 12.029-5.385 12.029-12.031S18.675 0 12.031 0zm0 22.268a9.924 9.924 0 0 1-5.068-1.385l-.364-.216-3.766.988.995-3.674-.236-.376C2.262 15.65 1.551 13.882 1.551 12.031 1.551 6.241 6.245 1.543 12.035 1.543c2.798 0 5.426 1.092 7.404 3.076 1.977 1.983 3.067 4.619 3.067 7.412 0 5.79-4.694 10.437-10.475 10.437zm5.748-7.85c-.314-.158-1.859-.918-2.146-1.023-.287-.105-.496-.158-.705.158-.209.317-.811 1.023-.995 1.233-.183.21-.367.237-.682.079-.315-.158-1.325-.489-2.525-1.558-.934-.83-1.565-1.855-1.748-2.171-.183-.316-.02-.487.137-.645.142-.143.315-.368.472-.551.157-.184.209-.316.315-.526.105-.211.052-.395-.026-.552-.079-.158-.705-1.701-.966-2.329-.255-.615-.514-.532-.705-.541-.183-.008-.393-.008-.602-.008s-.551.079-.838.394c-.288.316-1.101 1.077-1.101 2.628s1.127 3.048 1.284 3.258c.157.21 2.215 3.385 5.367 4.743.75.324 1.336.517 1.794.662.753.238 1.439.204 1.979.123.606-.09 1.859-.761 2.121-1.496.262-.735.262-1.365.183-1.496-.079-.131-.288-.21-.602-.368z"/></svg>
                    Chat on WhatsApp
                </a>
            ` : '';

            let infoOrActions = req.status === 'Accepted' ? `
                <div class="mt-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-3 text-center">
                    <p class="text-[10px] uppercase font-bold text-gray-500 mb-1">Pick up PIN</p>
                    <p class="text-2xl font-black text-gray-900 tracking-widest">${req.handoverOTP || '----'}</p>
                    <p class="text-xs text-gray-500 font-medium mt-1">Give this code to the Owner to pick up the item</p>
                </div>
            ` : (req.status === 'In Use' ? `
                <div class="flex gap-2 mt-3">
                    <button onclick="openOtpModal('${req._id}', 'return')" class="w-full px-3 py-2 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5"><span>🔑</span> Verify Return</button>
                </div>
            ` : '');

            let ratingBadge = req.ownerRatingCount > 0 ? `<span class="inline-flex items-center gap-0.5 ml-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600 font-bold border border-yellow-100 shadow-sm"><span class="text-yellow-500">★</span> ${req.ownerRating.toFixed(1)} <span class="text-yellow-500/80 font-medium">(${req.ownerRatingCount})</span></span>` : '';

            return `
                <div class="p-4 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors flex flex-col">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="text-gray-900 font-bold text-sm">To: ${req.ownerName}${ratingBadge} <span class="text-xs text-gray-500 font-normal ml-1">(${req.ownerRollNo || 'N/A'})</span></h4>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${statusClass}">${req.status}</span>
                    </div>
                    <p class="text-xs font-bold text-primary mb-1">Item: ${req.itemName}</p>
                    ${req.ownerWhatsapp ? `<p class="text-xs text-gray-500 font-medium">Phone: ${req.ownerWhatsapp}</p>` : ''}
                    <p class="text-xs text-gray-400 mt-1">Requested on: ${new Date(req.createdAt).toLocaleDateString()}</p>
                    ${infoOrActions}
                    ${whatsappBtn}
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div class="text-center py-8 text-red-400 font-medium text-sm">Could not load requests.</div>`;
    }
}

window.deleteListedItem = async function(itemId) {
    if(!confirm("Are you sure you want to permanently delete this item? Anyone who has requested it will also lose access.")) return;
    try {
        const response = await fetch(`/api/items/${itemId}`, {
            method: 'DELETE',
            headers: { 
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete item');
        
        showSuccessModal(data.message);
        
        // Refresh the page or trigger a re-fetch of user items
        setTimeout(() => window.location.reload(), 1500);
        
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

window.updateBorrowRequestStatus = async function(requestId, status) {
    try {
        const response = await fetch(`/api/items/requests/${requestId}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('Failed to update status');
        
        // Refresh the lists
        await fetchIncomingBorrowRequests();
    } catch (err) {
        console.error(err);
        alert('Could not update request status. Please try again.');
    }
};
window.updateRequestStatus = async function(requestId, status) {
    try {
        const response = await fetch(`/api/tutors/requests/${requestId}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) throw new Error('Failed to update status');
        
        // Refresh the list
        await fetchIncomingRequests();
        
        // Also refresh tutoring summary stats
        const tutoringResponse = await fetch('/api/tutors/me/summary', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (tutoringResponse.ok) {
            const tutoringSummary = await tutoringResponse.json();
            document.getElementById('statTutor').textContent = tutoringSummary.profileCount + tutoringSummary.outgoingRequests;
        }

    } catch (err) {
        console.error(err);
        alert('Could not update request status. Please try again.');
    }
};

window.openSettings = function() {
    const userJson = localStorage.getItem('user');
    if (userJson) {
        const user = JSON.parse(userJson);
        const waInput = document.getElementById('editWhatsapp');
        if(waInput) waInput.value = user.whatsappNumber || '';
    }

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

window.saveProfile = async function() {
    const waInput = document.getElementById('editWhatsapp');
    if(!waInput) return;

    try {
        const response = await fetch('/api/users/me', {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ whatsappNumber: waInput.value.trim() })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to edit profile');
        
        // Dynamically update localStorage so no logout is needed!
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        closeSettings();
        showSuccessModal(data.message);
    } catch(err) {
        console.error(err);
        alert(err.message);
    }
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

// OTP verification UI elements
let currentOtpRequestId = null;
let currentOtpPhase = null;

window.openOtpModal = function(requestId, phase) {
    currentOtpRequestId = requestId;
    currentOtpPhase = phase;
    
    document.getElementById('otpInput').value = '';
    document.getElementById('otpErrorMsg').classList.add('hidden');
    
    if (phase === 'handover') {
        document.getElementById('otpModalTitle').textContent = 'Verify Handover';
        document.getElementById('otpModalDesc').textContent = 'Ask the borrower for their 4-digit Pickup PIN to verify identity.';
    } else {
        document.getElementById('otpModalTitle').textContent = 'Verify Return';
        document.getElementById('otpModalDesc').textContent = 'Ask the owner for their 4-digit Return PIN to confirm handover.';
    }

    const modal = document.getElementById('otpModal');
    const backdrop = document.getElementById('otpBackdrop');
    const content = document.getElementById('otpContent');

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => {
        modal.classList.remove('pointer-events-none');
        backdrop.classList.remove('opacity-0');
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
        document.getElementById('otpInput').focus();
    }, 10);
};

window.closeOtpModal = function() {
    const modal = document.getElementById('otpModal');
    const backdrop = document.getElementById('otpBackdrop');
    const content = document.getElementById('otpContent');

    backdrop.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    modal.classList.add('pointer-events-none');

    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.submitOtp = async function() {
    const otp = document.getElementById('otpInput').value.trim();
    if(otp.length !== 4) {
        document.getElementById('otpErrorMsg').textContent = 'PIN must be exactly 4 digits.';
        document.getElementById('otpErrorMsg').classList.remove('hidden');
        return;
    }

    const btn = document.getElementById('otpSubmitBtn');
    const ogText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.disabled = true;
    document.getElementById('otpErrorMsg').classList.add('hidden');

    try {
        const response = await fetch(`/api/items/requests/${currentOtpRequestId}/verify-otp`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ phase: currentOtpPhase, otp })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Verification failed');
        }

        // Success
        closeOtpModal();
        
        // Wait briefly for OTP modal to fade, then pop new modal
        setTimeout(() => {
            if (currentOtpPhase === 'return') {
                // Return verified by requester. Target = owner
                openRatingModal(data.request.ownerName, data.request._id);
            } else {
                showSuccessModal(data.message);
            }
        }, 150);
        
        await fetchIncomingBorrowRequests();
        await fetchOutgoingBorrowRequests();
        
    } catch(err) {
        document.getElementById('otpErrorMsg').textContent = err.message;
        document.getElementById('otpErrorMsg').classList.remove('hidden');
    } finally {
        btn.textContent = ogText;
        btn.disabled = false;
    }
};

// Generic Success Modal Logic
window.showSuccessModal = function(message) {
    document.getElementById('successModalMsg').textContent = message;
    const modal = document.getElementById('successModal');
    const backdrop = document.getElementById('successBackdrop');
    const content = document.getElementById('successContent');

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => {
        modal.classList.remove('pointer-events-none');
        backdrop.classList.remove('opacity-0');
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.closeSuccessModal = function() {
    const modal = document.getElementById('successModal');
    const backdrop = document.getElementById('successBackdrop');
    const content = document.getElementById('successContent');

    backdrop.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    modal.classList.add('pointer-events-none');

    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

// Rating Modal Logic
let currentRating = 0;
let currentTargetName = '';
let currentRateRequestId = '';

window.setRating = function(rating) {
    currentRating = rating;
    document.getElementById('ratingErrorMsg').classList.add('hidden');
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('text-gray-200');
            star.classList.add('text-yellow-400', 'scale-110');
        } else {
            star.classList.add('text-gray-200');
            star.classList.remove('text-yellow-400', 'scale-110');
        }
    });
};

window.openRatingModal = function(targetName, requestId) {
    currentTargetName = targetName;
    currentRateRequestId = requestId;
    currentRating = 0;
    
    document.getElementById('ratingTargetName').textContent = targetName;
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach(s => {
        s.classList.add('text-gray-200');
        s.classList.remove('text-yellow-400', 'scale-110');
    });
    
    document.getElementById('ratingErrorMsg').classList.add('hidden');

    const modal = document.getElementById('ratingModal');
    const backdrop = document.getElementById('ratingBackdrop');
    const content = document.getElementById('ratingContent');

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => {
        modal.classList.remove('pointer-events-none');
        backdrop.classList.remove('opacity-0');
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.closeRatingModal = function() {
    const modal = document.getElementById('ratingModal');
    const backdrop = document.getElementById('ratingBackdrop');
    const content = document.getElementById('ratingContent');

    backdrop.classList.add('opacity-0');
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    modal.classList.add('pointer-events-none');

    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.submitRating = async function() {
    if (currentRating === 0) {
        document.getElementById('ratingErrorMsg').classList.remove('hidden');
        return;
    }
    const btn = document.getElementById('submitRatingBtn');
    const ogText = btn.textContent;
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/users/rate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ targetName: currentTargetName, rating: currentRating, requestId: currentRateRequestId })
        });
        
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.message);

        closeRatingModal();
        setTimeout(() => {
            showSuccessModal('Thank you for rating your peer!');
        }, 150);

        // Refresh stats to ensure badges pop up immediately!
        await fetchIncomingRequests();
        await fetchOutgoingRequests();
        await fetchIncomingBorrowRequests();
        await fetchOutgoingBorrowRequests();

    } catch (err) {
        document.getElementById('ratingErrorMsg').textContent = err.message;
        document.getElementById('ratingErrorMsg').classList.remove('hidden');
    } finally {
        btn.textContent = ogText;
        btn.disabled = false;
    }
};