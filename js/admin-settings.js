document.addEventListener('DOMContentLoaded', function () {
    // Load saved settings
    loadSettings();

    // Theme switcher
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const theme = this.dataset.theme;
            document.documentElement.setAttribute('data-theme', theme);
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            saveSetting('theme', theme);
            updateThemeInAllPages(theme);
        });
    });

    // Accent color picker
    document.getElementById('accentColor').addEventListener('change', function () {
        const color = this.value;
        document.documentElement.style.setProperty('--primary-color', color);
        document.documentElement.style.setProperty('--primary-hover', adjustColor(color, -20));
        saveSetting('accentColor', color);
        updateAccentColorInAllPages(color);
    });

    // Profile picture handlers
    document.getElementById('changeProfilePic').addEventListener('click', function () {
        document.getElementById('profilePictureUpload').click();
    });

    document.getElementById('profilePictureUpload').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const imageData = event.target.result;
                document.getElementById('profilePicture').src = imageData;
                saveSetting('profilePicture', imageData);
                updateProfilePictureInAllPages(imageData);
                showToast('Profile picture updated');
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('removeProfilePic').addEventListener('click', function () {
        const defaultPic = '../images/default-avatar.jpg';
        document.getElementById('profilePicture').src = defaultPic;
        saveSetting('profilePicture', defaultPic);
        updateProfilePictureInAllPages(defaultPic);
        showToast('Profile picture removed');
    });

    // Save all settings
    document.getElementById('saveSettings').addEventListener('click', saveAllSettings);

    // Reset to defaults
    document.getElementById('resetSettings').addEventListener('click', resetSettings);

    // Data export
    document.getElementById('exportData').addEventListener('click', exportData);

    // Clear old estimates (now fully functional)
    document.getElementById('clearOldEstimates').addEventListener('click', clearOldEstimates);

    // Delete all estimates (UPDATED)
    // Delete all estimates (UPDATED)
    document.getElementById('deleteAllEstimates')?.addEventListener('click', async function () {
        if (!confirm('WARNING: This will permanently delete ALL estimate submissions. Are you sure?')) return;

        try {
            const response = await fetch('/api/clear-estimates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to clear estimates');
            }

            showToast(result.message || 'All estimates deleted successfully');
            window.dispatchEvent(new Event('estimatesUpdated'));
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Error: ' + error.message);
        }
    });

    // Delete all contacts (UPDATED)
    document.getElementById('deleteAllContacts')?.addEventListener('click', async function () {
        if (!confirm('WARNING: This will permanently delete ALL contact submissions. Are you sure?')) return;

        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await fetch('/api/clear-contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            // First check if response is ok
            if (!response.ok) {
                // Try to get error details from response
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                throw new Error(errorData.message || errorData.error || 'Failed to clear contacts');
            }

            // If response is ok, parse it
            const result = await response.json();

            showToast(result.message || 'All contacts deleted successfully');
            window.dispatchEvent(new Event('contactsUpdated'));

            // Debug output
            console.log('Delete successful:', result);
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Error: ' + error.message);

            // Additional debug for network errors
            if (error.name === 'TypeError') {
                console.error('Network error details:', error);
            }
        }
    });

    // Update SEO settings
    document.getElementById('updateSeoSettings')?.addEventListener('click', updateSeoSettings);

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('adminSettings')) || {};

        // Theme
        const theme = settings.theme || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelector(`.theme-btn[data-theme="${theme}"]`).classList.add('active');

        // Accent color
        const accentColor = settings.accentColor || '#3498db';
        document.getElementById('accentColor').value = accentColor;
        document.documentElement.style.setProperty('--primary-color', accentColor);
        document.documentElement.style.setProperty('--primary-hover', adjustColor(accentColor, -20));

        // Profile picture
        const profilePicture = settings.profilePicture || '../images/default-avatar.jpg';
        document.getElementById('profilePicture').src = profilePicture;
        // In the profile picture change handler (inside DOMContentLoaded)
        document.getElementById('profilePictureUpload').addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const imageData = event.target.result;
                    document.getElementById('profilePicture').src = imageData;
                    saveSetting('profilePicture', imageData);

                    // Broadcast the change to other tabs/pages
                    localStorage.setItem('adminProfilePicture', imageData);

                    // Update dashboard if it's open in the same browser
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'profilePictureUpdate',
                            image: imageData
                        }, '*');
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Other settings
        if (settings.emailNotifications !== undefined) {
            document.getElementById('emailNotifications').checked = settings.emailNotifications;
        }
        if (settings.notificationSound) {
            document.getElementById('notificationSound').value = settings.notificationSound;
        }
        if (settings.estimateExpiry) {
            document.getElementById('estimateExpiry').value = settings.estimateExpiry;
        }
        if (settings.estimateTerms) {
            document.getElementById('estimateTerms').value = settings.estimateTerms;
        }
        if (settings.twoFactorAuth !== undefined) {
            document.getElementById('twoFactorAuth').checked = settings.twoFactorAuth;
        }
        if (settings.sessionTimeout) {
            document.getElementById('sessionTimeout').value = settings.sessionTimeout;
        }

        // Load SEO settings if they exist
        if (settings.seoSettings) {
            const seo = settings.seoSettings;
            if (document.getElementById('metaTitle')) document.getElementById('metaTitle').value = seo.metaTitle || '';
            if (document.getElementById('metaDescription')) document.getElementById('metaDescription').value = seo.metaDescription || '';
            if (document.getElementById('metaKeywords')) document.getElementById('metaKeywords').value = seo.metaKeywords || '';
            if (document.getElementById('metaImage')) document.getElementById('metaImage').value = seo.metaImage || '';
        }
    }

    function saveSetting(key, value) {
        const settings = JSON.parse(localStorage.getItem('adminSettings')) || {};
        settings[key] = value;
        localStorage.setItem('adminSettings', JSON.stringify(settings));
    }

    function saveAllSettings() {
        const settings = {
            theme: document.documentElement.getAttribute('data-theme'),
            accentColor: document.getElementById('accentColor').value,
            profilePicture: document.getElementById('profilePicture').src,
            emailNotifications: document.getElementById('emailNotifications').checked,
            notificationSound: document.getElementById('notificationSound').value,
            estimateExpiry: document.getElementById('estimateExpiry').value,
            estimateTerms: document.getElementById('estimateTerms').value,
            twoFactorAuth: document.getElementById('twoFactorAuth').checked,
            sessionTimeout: document.getElementById('sessionTimeout').value,
            seoSettings: {
                metaTitle: document.getElementById('metaTitle')?.value || '',
                metaDescription: document.getElementById('metaDescription')?.value || '',
                metaKeywords: document.getElementById('metaKeywords')?.value || '',
                metaImage: document.getElementById('metaImage')?.value || ''
            }
        };

        localStorage.setItem('adminSettings', JSON.stringify(settings));
        showToast('Settings saved successfully!');
    }

    function resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            localStorage.removeItem('adminSettings');
            localStorage.removeItem('adminProfilePicture');
            location.reload();
        }
    }

    function exportData() {
        showToast('Export started. You will receive an email when ready.');
        // Actual implementation would call your API
    }

    async function clearOldEstimates() {
        const days = document.getElementById('clearEstimateAge').value;
        if (!confirm(`Permanently delete all estimates older than ${days} days?`)) return;

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`/api/admin/estimates?olderThan=${days}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to delete estimates');

            showToast(`Deleted estimates older than ${days} days`);

            // Refresh estimates in submissions page if open
            window.dispatchEvent(new CustomEvent('estimatesUpdated'));
            if (window.opener) {
                window.opener.postMessage({ type: 'estimatesUpdated' }, '*');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Error deleting estimates: ' + error.message);
        }
    }

    function updateSeoSettings() {
        const seoSettings = {
            metaTitle: document.getElementById('metaTitle')?.value || '',
            metaDescription: document.getElementById('metaDescription')?.value || '',
            metaKeywords: document.getElementById('metaKeywords')?.value || '',
            metaImage: document.getElementById('metaImage')?.value || ''
        };

        // Save to localStorage
        const currentSettings = JSON.parse(localStorage.getItem('adminSettings')) || {};
        currentSettings.seoSettings = seoSettings;
        localStorage.setItem('adminSettings', JSON.stringify(currentSettings));

        showToast('SEO settings updated successfully!');
    }

    // Helper functions
    function adjustColor(color, amount) {
        return '#' + color.replace(/^#/, '').replace(/../g,
            color => ('0' + Math.min(255, Math.max(0,
                parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function updateThemeInAllPages(theme) {
        // Update in other open tabs
        localStorage.setItem('adminSettings', JSON.stringify({
            ...JSON.parse(localStorage.getItem('adminSettings') || {}),
            theme: theme
        }));
    }

    function updateAccentColorInAllPages(color) {
        // Update in other open tabs
        localStorage.setItem('adminSettings', JSON.stringify({
            ...JSON.parse(localStorage.getItem('adminSettings') || {}),
            accentColor: color
        }));
    }

    function updateProfilePictureInAllPages(imageData) {
        // Save to separate key for easier access
        localStorage.setItem('adminProfilePicture', imageData);

        // Update in settings object too
        const settings = JSON.parse(localStorage.getItem('adminSettings')) || {};
        settings.profilePicture = imageData;
        localStorage.setItem('adminSettings', JSON.stringify(settings));
    }
});

// Listen for changes from other tabs
window.addEventListener('storage', function (event) {
    if (event.key === 'adminSettings') {
        const settings = JSON.parse(event.newValue);
        if (settings.theme) {
            document.documentElement.setAttribute('data-theme', settings.theme);
        }
        if (settings.accentColor) {
            document.documentElement.style.setProperty('--primary-color', settings.accentColor);
            document.documentElement.style.setProperty('--primary-hover',
                adjustColor(settings.accentColor, -20));
        }
        if (settings.seoSettings) {
            const seo = settings.seoSettings;
            if (document.getElementById('metaTitle')) document.getElementById('metaTitle').value = seo.metaTitle || '';
            if (document.getElementById('metaDescription')) document.getElementById('metaDescription').value = seo.metaDescription || '';
            if (document.getElementById('metaKeywords')) document.getElementById('metaKeywords').value = seo.metaKeywords || '';
            if (document.getElementById('metaImage')) document.getElementById('metaImage').value = seo.metaImage || '';
        }
    }
    if (event.key === 'adminProfilePicture') {
        const profilePic = document.getElementById('profilePicture');
        if (profilePic) profilePic.src = event.newValue;
    }
});