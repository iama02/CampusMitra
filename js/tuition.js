// LocalStorage Data Key
const TUTORS_STORAGE_KEY = 'tutors';

// Initial dummy data
const DEFAULT_TUTORS = [
    {
        id: "t1",
        name: "Rohan Kapoor",
        subjects: "Data Structures, Algorithms",
        description: "Final year CS student with an internship at Google. I love breaking down complex graph and tree problems into simple visual concepts.",
        availability: "Mon, Wed & Fri (6 PM - 8 PM)",
        rating: "⭐⭐⭐⭐⭐",
        reviewText: '"Helped me clear my DSA mid-term easily!" - Amit'
    },
    {
        id: "t2",
        name: "Priya Desai",
        subjects: "Engineering Physics, Calculus",
        description: "Secured top grades in applied sciences. Patient and willing to go over fundamentals as many times as you need.",
        availability: "Weekends (10 AM - 1 PM)",
        rating: "⭐⭐⭐⭐☆",
        reviewText: '"Explains Calculus theorems really well." - Rahul'
    }
];

// On page load
document.addEventListener('DOMContentLoaded', () => {
    initTutors();
});

function initTutors() {
    // Check if data exists in localStorage
    const storedTutors = localStorage.getItem(TUTORS_STORAGE_KEY);
    
    if (!storedTutors) {
        // Initialize with default tutors
        localStorage.setItem(TUTORS_STORAGE_KEY, JSON.stringify(DEFAULT_TUTORS));
    }
    
    renderTutors();
}

function getTutors() {
    return JSON.parse(localStorage.getItem(TUTORS_STORAGE_KEY)) || [];
}

// Render dynamic HTML
function renderTutors() {
    const grid = document.getElementById('tutorsGrid');
    const tutors = getTutors();
    
    grid.innerHTML = '';
    
    tutors.forEach(tutor => {
        // Simple initials for avatar
        const initials = tutor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        
        const cardHTML = `
            <div class="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden hover:shadow-[0_8px_20px_-6px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col p-6">
                <!-- Header: Avatar & Name -->
                <div class="flex items-start gap-4 mb-4">
                    <div class="w-12 h-12 rounded-full bg-indigo-50 text-secondary flexitems-center justify-center font-bold text-lg border border-indigo-100 shrink-0 flex items-center justify-center">
                        ${initials}
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 leading-tight">${tutor.name}</h3>
                        <p class="text-sm font-medium text-primary mt-0.5">${tutor.subjects}</p>
                    </div>
                </div>
                
                <!-- Description -->
                <p class="text-sm text-gray-600 mb-4 flex-1">${tutor.description}</p>
                
                <!-- Availability & Rating -->
                <div class="bg-gray-50 rounded-xl p-3 mb-5 border border-gray-100 space-y-2">
                    <div class="flex items-start gap-2 text-xs">
                        <span class="text-gray-400">🕒</span>
                        <span class="text-gray-700 font-medium">${tutor.availability}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs border-t border-gray-200/60 pt-2 mt-2">
                        <span class="text-gray-500">${tutor.rating}</span>
                        <span class="text-gray-400 italic">${tutor.reviewText || '"No reviews yet"'}</span>
                    </div>
                </div>
                
                <!-- Action Button -->
                <button onclick="requestSession('${tutor.name}')" class="w-full text-sm font-semibold bg-white text-primary border border-primary px-4 py-2.5 rounded-xl hover:bg-primary hover:text-white transition-colors duration-200">
                    Request Session
                </button>
            </div>
        `;
        
        grid.innerHTML += cardHTML;
    });
}

// Handle Form Submission
window.handleTutorSubmit = function(event) {
    event.preventDefault();
    
    const name = document.getElementById('tutorName').value.trim();
    const subjects = document.getElementById('tutorSubjects').value.trim();
    const description = document.getElementById('tutorDesc').value.trim();
    const availability = document.getElementById('tutorAvailability').value.trim();
    
    // Create new tutor object
    const newTutor = {
        id: 't' + Date.now(),
        name,
        subjects,
        description,
        availability,
        rating: "⭐⭐⭐⭐⭐", // default starting rating
        reviewText: '"New Tutor on CampusMitra!"'
    };
    
    // Save to localStorage
    const tutors = getTutors();
    tutors.unshift(newTutor); // Add to beginning of array
    localStorage.setItem(TUTORS_STORAGE_KEY, JSON.stringify(tutors));
    
    // Reset form & re-render
    document.getElementById('tutorForm').reset();
    renderTutors();
    
    // Show success toast for profile creation
    showToast("Profile Created!", "Your tutor profile is now live.");
};

// Handle Request Session interaction
window.requestSession = function(tutorName) {
    showToast("Request Sent", `Session request sent successfully to ${tutorName}.`);
};

// Toast utility
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
