// ── Navbar scroll effect ──────────────────────────────────────────
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        navbar.classList.add('bg-white', 'shadow-sm', 'border-b', 'border-gray-100');
        navbar.classList.remove('bg-transparent');
    } else {
        navbar.classList.remove('bg-white', 'shadow-sm', 'border-b', 'border-gray-100');
    }
});

// Close mobile menu logic has been moved to authState.js