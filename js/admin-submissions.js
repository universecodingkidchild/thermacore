document.addEventListener('DOMContentLoaded', function () {
    const estimatesTable = document.getElementById('estimatesTableBody');
    const refreshBtn = document.getElementById('refreshEstimates');
    const loadingIndicator = document.getElementById('loadingIndicator') || createLoadingIndicator();

    async function loadEstimates() {
        loadingIndicator.style.display = 'block';
        estimatesTable.innerHTML = '';

        try {
            const token = localStorage.getItem('adminToken');
            if (!token) throw new Error('No authentication token found');

            // First try the main endpoint
            let estimates = await tryEndpoint('/api/admin/estimates', token);

            // If empty, try the recent-estimates endpoint as fallback
            if (!estimates || estimates.length === 0) {
                estimates = await tryEndpoint('/api/admin/recent-estimates', token);
            }

            renderEstimates(estimates);

        } catch (error) {
            console.error("Load failed:", error);
            estimatesTable.innerHTML = `
                <tr class="error">
                    <td colspan="6">
                        Error: ${error.message}
                        <button onclick="loadEstimates()">Retry</button>
                    </td>
                </tr>
            `;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }
    // In admin-submissions.js
    async function loadSubmissions() {
        try {
            const response = await fetch('/api/admin/estimates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            const submissions = await response.json();

            // Render submissions in table
            document.querySelector('#submissionsTable tbody').innerHTML =
                submissions.map(sub => `
          <tr>
            <td>${new Date(sub.date).toLocaleString()}</td>
            <td>${sub.fullName}</td>
            <td>${sub.email}</td>
            <td>${sub.files?.length || 0} files</td>
          </tr>
        `).join('');
        } catch (error) {
            console.error('Failed to load submissions:', error);
        }
    }

    async function tryEndpoint(endpoint, token) {
        try {
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Endpoint ${endpoint} failed`);

            const data = await response.json();

            // Handle both response formats:
            // 1. Direct array
            // 2. { data: [...] } format
            return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

        } catch (error) {
            console.warn(`Failed to load from ${endpoint}:`, error);
            return [];
        }
    }

    function renderEstimates(estimates) {
        if (!estimates || estimates.length === 0) {
            estimatesTable.innerHTML = `
                <tr>
                    <td colspan="6" class="empty">
                        No estimates found
                    </td>
                </tr>
            `;
            return;
        }

        estimatesTable.innerHTML = estimates.map(est => `
            <tr>
                <td>${est.id?.toString().slice(-6) || 'N/A'}</td>
                <td>${est.fullName || 'No name'}</td>
                <td>${est.email || 'No email'}</td>
                <td>${est.projectType || 'No type'}</td>
                <td>${est.date ? new Date(est.date).toLocaleDateString() : 'No date'}</td>
                <td>
                    <a href="estimate-view.html?id=${est.id || ''}" class="btn-view">
                        <i class="fas fa-eye"></i> View
                    </a>
                </td>
            </tr>
        `).join('');
    }

    // Helper function to create loading indicator
    function createLoadingIndicator() {
        const div = document.createElement('div');
        div.id = 'loadingIndicator';
        div.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        div.style.cssText = 'padding:20px;text-align:center;display:none';
        document.querySelector('.admin-content').prepend(div);
        return div;
    }

    // Event listeners
    refreshBtn?.addEventListener('click', loadEstimates);
    loadEstimates();
});