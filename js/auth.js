function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleLoginBtn = document.getElementById('toggleLoginBtn');
    const toggleRegisterBtn = document.getElementById('toggleRegisterBtn');

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
            const response = await fetch('http://localhost:3000/api/auth/login', {
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
            const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, rollNo, email, branch, year, password })
            });
            const data = await response.json();

            btn.innerHTML = originalText;
            btn.classList.remove('opacity-75', 'cursor-not-allowed');

            if (response.ok) {
                // Success
                alert('Registration Successful! Please login.');
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