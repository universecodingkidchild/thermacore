document.addEventListener('DOMContentLoaded', function() {
    const estimatesTable = document.getElementById('estimatesTableBody');
    const refreshBtn = document.getElementById('refreshEstimates');

    // Load estimates on page load
    loadEstimates();

    // Refresh button handler
    refreshBtn.addEventListener('click', loadEstimates);
    // Run this on your submissions page
const firstEstimateId = document.querySelector('#estimatesTableBody tr td:first-child').textContent;
console.log("Sample Estimate ID:", firstEstimateId);

    async function loadEstimates() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            alert('Not authenticated. Please login.');
            window.location.href = '/admin/login.html';
            return;
        }
        
        try {
            const response = await fetch('/api/admin/estimates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
            }
            
            const estimates = await response.json();
            renderEstimates(estimates);
        } catch (error) {
            console.error('Error loading estimates:', error);
            alert(`Error loading estimates: ${error.message}`);
        }
    }

    function renderEstimates(estimates) {
        estimatesTable.innerHTML = '';
        
        estimates.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(estimate => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${estimate.id.slice(-6)}</td>
                <td>${estimate.fullName}</td>
                <td>${estimate.email}</td>
                <td>${estimate.projectType}</td>
                <td>${new Date(estimate.date).toLocaleDateString()}</td>
                <td>
                    <a href="/admin/estimate-view.html?id=${estimate.id}" class="btn-view">
                        <i class="fas fa-eye"></i> View
                    </a>
                </td>
            `;
            estimatesTable.appendChild(row);
        });
    }
});