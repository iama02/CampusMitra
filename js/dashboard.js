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

// ── Mobile menu toggle ────────────────────────────────────────────
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const hamburgerLines = document.querySelectorAll('.hamburger-line');

menuToggle.addEventListener('click', () => {
    const isOpen = !mobileMenu.classList.contains('hidden');

    if (isOpen) {
        mobileMenu.classList.add('hidden');
        // Reset hamburger
        hamburgerLines[0].style.transform = 'none';
        hamburgerLines[1].style.opacity = '1';
        hamburgerLines[2].style.transform = 'none';
    } else {
        mobileMenu.classList.remove('hidden');
        // Animate to X
        hamburgerLines[0].style.transform = 'translateY(8px) rotate(45deg)';
        hamburgerLines[1].style.opacity = '0';
        hamburgerLines[2].style.transform = 'translateY(-8px) rotate(-45deg)';
    }
});

// Close mobile menu when a link is clicked
mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        hamburgerLines[0].style.transform = 'none';
        hamburgerLines[1].style.opacity = '1';
        hamburgerLines[2].style.transform = 'none';
    });
});