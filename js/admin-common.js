// Apply saved theme and profile picture globally
document.addEventListener('DOMContentLoaded', function () {
    // Load theme
    const savedTheme = localStorage.getItem('adminSettings')
        ? JSON.parse(localStorage.getItem('adminSettings')).theme
        : 'light';
    document.documentElement.setAttribute('data-theme', savedTheme || 'light');

    // Load profile picture
    const savedProfilePic = localStorage.getItem('adminProfilePicture');
    if (savedProfilePic) {
        const profilePics = document.querySelectorAll('.admin-profile-pic');
        profilePics.forEach(pic => pic.src = savedProfilePic);
    }

    // Listen for theme changes from settings page
    window.addEventListener('storage', function (event) {
        if (event.key === 'adminSettings') {
            const settings = JSON.parse(event.newValue);
            document.documentElement.setAttribute('data-theme', settings.theme);
        }
        if (event.key === 'adminProfilePicture') {
            const profilePics = document.querySelectorAll('.admin-profile-pic');
            profilePics.forEach(pic => pic.src = event.newValue);
        }
    });
    // Add this to your existing admin-common.js
    document.addEventListener('DOMContentLoaded', function () {
        // Logout functionality
        const logoutButtons = document.querySelectorAll('.logout-button');

        logoutButtons.forEach(button => {
            button.addEventListener('click', function () {
                fetch('/api/admin/logout', {
                    method: 'POST',
                    credentials: 'same-origin'
                })
                    .then(() => {
                        window.location.href = '/admin/login.html';
                    })
                    .catch(error => {
                        console.error('Logout error:', error);
                    });
            });
        });
    });

    // Listen for estimate deletions
    window.addEventListener('message', function (event) {
        if (event.data.type === 'estimatesDeleted') {
            if (typeof refreshEstimates === 'function') {
                refreshEstimates();
            }
        }
    });
});