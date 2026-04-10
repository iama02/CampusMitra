document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
        document.getElementById('loginForm')?.classList.add('hidden');
        document.getElementById('registerForm')?.classList.add('hidden');
        document.getElementById('resetPasswordForm')?.classList.remove('hidden');
        // Hide the toggle buttons entirely to force user to handle reset
        document.querySelector('.bg-slate-100')?.classList.add('hidden');
    }
});

function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotPasswordForm');
    const resetForm = document.getElementById('resetPasswordForm');
    const toggleLoginBtn = document.getElementById('toggleLoginBtn');
    const toggleRegisterBtn = document.getElementById('toggleRegisterBtn');

    if (forgotForm) forgotForm.classList.add('hidden');
    if (resetForm) resetForm.classList.add('hidden');

    if (tab === 'login') {
        // Show Login Form
        loginForm.classList.remove('hidden');
        loginForm.classList.add('fade-in');

        // Hide Register Form
        registerForm.classList.add('hidden');
        registerForm.classList.remove('fade-in');

        // Style Active Button
        toggleLoginBtn.className = 'flex-1 py-2 text-center rounded-md font-semibold transition-all duration-300 text-white bg-primary shadow';
        toggleRegisterBtn.className = 'flex-1 py-2 text-center rounded-md font-semibold text-gray-500 transition-all duration-300 hover:text-textdark';
    } else {
        // Show Register Form
        registerForm.classList.remove('hidden');
        registerForm.classList.add('fade-in');

        // Hide Login Form
        loginForm.classList.add('hidden');
        loginForm.classList.remove('fade-in');

        // Style Active Button
        toggleRegisterBtn.className = 'flex-1 py-2 text-center rounded-md font-semibold transition-all duration-300 text-white bg-primary shadow';
        toggleLoginBtn.className = 'flex-1 py-2 text-center rounded-md font-semibold text-gray-500 transition-all duration-300 hover:text-textdark';
    }
}

function showError(inputId, message) {
    const errorEl = document.getElementById(inputId + 'Error');
    const inputEl = document.getElementById(inputId);
    if (errorEl && inputEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        inputEl.classList.add('border-danger', 'focus:ring-danger', 'focus:border-danger', 'bg-red-50');
        inputEl.classList.remove('border-gray-300', 'focus:ring-primary', 'focus:border-primary', 'bg-gray-50/50');
    }
}

function hideError(inputId) {
    const errorEl = document.getElementById(inputId + 'Error');
    const inputEl = document.getElementById(inputId);
    if (errorEl && inputEl) {
        errorEl.classList.add('hidden');
        inputEl.classList.remove('border-danger', 'focus:ring-danger', 'focus:border-danger', 'bg-red-50');
        inputEl.classList.add('border-gray-300', 'focus:ring-primary', 'focus:border-primary', 'bg-gray-50/50');
    }
}

function isValidCollegeEmail(email) {
    // Regex or simple string match, but prompt said .ac.in validation
    return email.toLowerCase().endsWith('.ac.in');
}

async function handleLogin(e) {
    e.preventDefault();
    let isValid = true;

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    hideError('loginEmail');
    hideError('loginPassword');

    if (!email) {
        showError('loginEmail', 'College Email is required');
        isValid = false;
    } else if (!isValidCollegeEmail(email)) {
        showError('loginEmail', 'Email must end with .ac.in');
        isValid = false;
    }

    if (!password) {
        showError('loginPassword', 'Password is required');
        isValid = false;
    }

    if (isValid) {
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.innerHTML = `<span class="flex items-center justify-center"><svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Signing In...</span>`;
        btn.classList.add('opacity-75', 'cursor-not-allowed');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            btn.innerHTML = originalText;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');

            if (response.ok) {
                // Save token and user info
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect to home
                window.location.href = '../index.html';
            } else {
                showError('loginPassword', data.message || 'Login failed');
            }
        } catch (error) {
            btn.innerHTML = originalText;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            showError('loginPassword', 'Server is fully down. Please try again later.');
        }
    }
}

async function handleRegister(e) {
    e.preventDefault();
    let isValid = true;

    const fields = ['regName', 'regRollNo', 'regEmail', 'regBranch', 'regYear', 'regPassword', 'regConfirmPassword'];
    fields.forEach(hideError);

    const name = document.getElementById('regName').value.trim();
    const rollNo = document.getElementById('regRollNo').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const branch = document.getElementById('regBranch').value;
    const year = document.getElementById('regYear').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const whatsappNumber = document.getElementById('regWhatsapp').value.trim();

    if (!name) {
        showError('regName', 'Full Name is required');
        isValid = false;
    }

    if (!rollNo) {
        showError('regRollNo', 'Roll Number is required');
        isValid = false;
    }

    if (!email) {
        showError('regEmail', 'College Email is required');
        isValid = false;
    } else if (!isValidCollegeEmail(email)) {
        showError('regEmail', 'Must be a valid .ac.in address');
        isValid = false;
    }

    if (!branch) {
        showError('regBranch', 'Please select a branch');
        isValid = false;
    }

    if (!year) {
        showError('regYear', 'Please select a year');
        isValid = false;
    }

    if (!password) {
        showError('regPassword', 'Password is required');
        isValid = false;
    } else if (password.length < 6) {
        showError('regPassword', 'Password must be at least 6 characters');
        isValid = false;
    }

    if (!confirmPassword) {
        showError('regConfirmPassword', 'Please confirm your password');
        isValid = false;
    } else if (password !== confirmPassword) {
        showError('regConfirmPassword', 'Passwords do not match');
        isValid = false;
    }

    if (isValid) {
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.innerHTML = `<span class="flex items-center justify-center"><svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Creating...</span>`;
        btn.classList.add('opacity-75', 'cursor-not-allowed');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, rollNo, email, branch, year, password, whatsappNumber })
            });
            const data = await response.json();

            btn.innerHTML = originalText;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');

            if (response.ok) {
                // Success
                showToast('Registration Successful!', 'Please login to continue.');
                e.target.reset(); // clear the form
                switchTab('login'); // switch to login view
            } else {
                showError('regEmail', data.message || 'Registration failed');
            }
        } catch (error) {
            btn.innerHTML = originalText;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');
            showError('regEmail', 'Server error. Please try again.');
        }
    }
}

function showToast(title, message) {
    const toast = document.getElementById('toastNotification');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    if (toast && toastTitle && toastMessage) {
        toastTitle.textContent = title;
        toastMessage.textContent = message;

        toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
        toast.classList.add('translate-y-0', 'opacity-100');

        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
        }, 3000);
    }
}

function showForgotPassword(e) {
    if(e) e.preventDefault();
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('resetPasswordForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.remove('hidden');
    document.querySelector('.bg-slate-100')?.classList.add('hidden'); // Hide toggles
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim();
    if(!email) return;

    const btn = document.getElementById('btnForgot');
    const originalText = btn.textContent;
    btn.textContent = "Sending...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        
        btn.textContent = originalText;
        btn.disabled = false;

        if (response.ok) {
            showToast('Reset Link Sent!', 'Please check your email to reset your password.');
            setTimeout(() => {
                // Reveal the UI again for when they click the token
                // Actually they will open a new tab from the terminal, so we can just leave it
            }, 3000);
        } else {
            alert(data.message || 'Failed to send reset link');
        }
    } catch (err) {
        btn.textContent = originalText;
        btn.disabled = false;
        console.error(err);
        alert('Server error. Please try again.');
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    
    if(!token) {
        alert("Invalid or missing reset token.");
        return;
    }

    const password = document.getElementById('resetPassword').value;
    if(password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    const btn = document.getElementById('btnReset');
    const originalText = btn.textContent;
    btn.textContent = "Resetting...";
    btn.disabled = true;

    try {
        const response = await fetch(`/api/auth/reset-password/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await response.json();
        
        btn.textContent = originalText;
        btn.disabled = false;

        if (response.ok) {
            showToast('Password Reset!', 'You can now log in with your new password.');
            setTimeout(() => {
                // Remove token from URL and switch to login
                window.history.replaceState({}, document.title, window.location.pathname);
                document.querySelector('.bg-slate-100')?.classList.remove('hidden');
                switchTab('login');
            }, 2500);
        } else {
            alert(data.message || 'Failed to reset password. Token might be expired.');
        }
    } catch (err) {
        btn.textContent = originalText;
        btn.disabled = false;
        console.error(err);
        alert('Server error. Please try again.');
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}
