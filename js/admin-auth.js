document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('errorMessage');

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const data = await response.json();
            // Store the token in localStorage
            localStorage.setItem('adminToken', data.token);
            // Redirect to admin dashboard
            window.location.href = '/admin/index.html';
        } else {
            errorElement.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorElement.style.display = 'block';
    }
});

// Enhanced logout function with better error handling
function handleLogout() {
    const logoutButtons = document.querySelectorAll('.logout-button');
    
    logoutButtons.forEach(button => {
        // Remove any existing listeners to prevent duplicates
        button.removeEventListener('click', logoutHandler);
        // Add new listener
        button.addEventListener('click', logoutHandler);
    });

    async function logoutHandler(e) {
        e.preventDefault();
        
        // Add visual feedback
        const icon = this.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-spinner fa-spin';
        }
        this.style.pointerEvents = 'none';
        
        try {
            // Clear client-side token
            localStorage.removeItem('adminToken');
            
            // Send logout request to server
            const response = await fetch('/api/admin/logout', {
                method: 'POST',
                credentials: 'include' // Important for cookies
            });

            // Always redirect to login page
            window.location.href = '/admin/login.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/admin/login.html';
        }
    }
}

// Authentication check and logout setup
function initAdminAuth() {
    if (window.location.pathname.includes('/admin/') && 
        !window.location.pathname.includes('/admin/login.html')) {
        
        // Check for token
        const token = localStorage.getItem('adminToken') || 
                     document.cookie.split('; ').find(row => row.startsWith('adminToken='))?.split('=')[1];

        if (!token) {
            window.location.href = '/admin/login.html';
            return;
        }

        // Setup logout functionality
        handleLogout();
        
        // Optional: Validate token with server
        validateToken(token);
    }
}

// Optional token validation
async function validateToken(token) {
    try {
        const response = await fetch('/api/admin/validate', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            window.location.href = '/admin/login.html';
        }
    } catch (error) {
        console.error('Token validation error:', error);
        window.location.href = '/admin/login.html';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdminAuth);