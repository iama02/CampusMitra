const TUTORS_API_URL = 'http://localhost:3000/api/tutors';

const DEFAULT_TUTORS = [
    {
        _id: 'mock-t1',
        name: 'Rohan Kapoor',
        subjects: 'Data Structures, Algorithms',
        description: 'Final year CS student with an internship at Google. I love breaking down complex graph and tree problems into simple visual concepts.',
        availability: 'Mon, Wed & Fri (6 PM - 8 PM)',
        rating: '&#11088;&#11088;&#11088;&#11088;&#11088;',
        reviewText: '"Helped me clear my DSA mid-term easily!" - Amit',
        ownerName: 'Rohan Kapoor'
    },
    {
        _id: 'mock-t2',
        name: 'Priya Desai',
        subjects: 'Engineering Physics, Calculus',
        description: 'Secured top grades in applied sciences. Patient and willing to go over fundamentals as many times as you need.',
        availability: 'Weekends (10 AM - 1 PM)',
        rating: '&#11088;&#11088;&#11088;&#11088;&#9734;',
        reviewText: '"Explains Calculus theorems really well." - Rahul',
        ownerName: 'Priya Desai'
    }
];

let tutorsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchTutors();
});

function getCurrentUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchTutors() {
    try {
        const response = await fetch(TUTORS_API_URL);
        if (!response.ok) {
            throw new Error('Failed to load tutors');
        }

        tutorsCache = await response.json();
        renderTutors(tutorsCache);
    } catch (error) {
        console.warn('Tutoring backend not reachable. Falling back to mock tutor data.', error);
        tutorsCache = [...DEFAULT_TUTORS];
        renderTutors(tutorsCache);
    }
}

function renderTutors(tutors) {
    const grid = document.getElementById('tutorsGrid');
    const user = getCurrentUser();

    if (!grid) return;

    grid.innerHTML = '';

    tutors.forEach((tutor) => {
        const initials = tutor.name.split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase();
        const isOwner = user && (
            tutor.ownerEmail === user.email ||
            tutor.ownerName === user.name
        );

        const actionButton = isOwner
            ? `
                <button disabled class="w-full text-sm font-semibold bg-gray-100 text-gray-400 border border-gray-200 px-4 py-2.5 rounded-xl cursor-not-allowed">
                    Your Profile
                </button>
            `
            : `
                <button onclick="requestSession('${tutor._id}', '${escapeForSingleQuotedJs(tutor.name)}')" class="w-full text-sm font-semibold bg-white text-primary border border-primary px-4 py-2.5 rounded-xl hover:bg-primary hover:text-white transition-colors duration-200">
                    Request Session
                </button>
            `;

        const cardHTML = `
            <div class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden hover:shadow-[0_8px_20px_-6px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col p-6">
                <div class="flex items-start gap-4 mb-4">
                    <div class="w-12 h-12 rounded-full bg-indigo-50 text-secondary flexitems-center justify-center font-bold text-lg border border-indigo-100 shrink-0 flex items-center justify-center">
                        ${initials}
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 leading-tight">${tutor.name}</h3>
                        <p class="text-sm font-medium text-primary mt-0.5">${tutor.subjects}</p>
                    </div>
                </div>

                <p class="text-sm text-gray-600 mb-4 flex-1">${tutor.description}</p>

                <div class="bg-gray-50 rounded-xl p-3 mb-5 border border-gray-100 space-y-2">
                    <div class="flex items-start gap-2 text-xs">
                        <span class="text-gray-400">&#128338;</span>
                        <span class="text-gray-700 font-medium">${tutor.availability}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-t border-gray-200/60 pt-2 mt-2 gap-3">
                        <span class="text-gray-500">${tutor.rating || '*****'}</span>
                        <span class="text-gray-400 italic text-right">${tutor.reviewText || '"No reviews yet"'}</span>
                    </div>
                </div>

                ${actionButton}
            </div>
        `;

        grid.innerHTML += cardHTML;
    });

    if (tutors.length === 0) {
        grid.innerHTML = `
            <div class="md:col-span-2 bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500 font-medium">
                No tutor profiles yet. Be the first one to create a profile.
            </div>
        `;
    }
}

window.handleTutorSubmit = async function (event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Login Required', 'Please log in before creating a tutor profile.');
        return;
    }

    const name = document.getElementById('tutorName').value.trim();
    const subjects = document.getElementById('tutorSubjects').value.trim();
    const description = document.getElementById('tutorDesc').value.trim();
    const availability = document.getElementById('tutorAvailability').value.trim();

    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Creating...';
    submitButton.disabled = true;

    try {
        const response = await fetch(TUTORS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ name, subjects, description, availability })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Unable to create tutor profile');
        }

        document.getElementById('tutorForm').reset();
        await fetchTutors();
        showToast('Profile Created!', 'Your tutor profile is now live.');
    } catch (error) {
        showToast('Could Not Create Profile', error.message || 'Please try again.');
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
};

window.requestSession = async function (tutorId, tutorName) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Login Required', 'Please log in before requesting a tutoring session.');
        return;
    }

    if (String(tutorId).startsWith('mock-')) {
        showToast('Backend Needed', `Start the backend to send a real session request to ${tutorName}.`);
        return;
    }

    try {
        const response = await fetch(`${TUTORS_API_URL}/${tutorId}/request`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders()
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Unable to request tutoring session');
        }

        showToast('Request Sent', data.message || `Session request sent successfully to ${tutorName}.`);
    } catch (error) {
        showToast('Request Failed', error.message || 'Please try again.');
    }
};

function escapeForSingleQuotedJs(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function showToast(title, message) {
    const toast = document.getElementById('toastNotification');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3000);
}