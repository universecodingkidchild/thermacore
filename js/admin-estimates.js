document.addEventListener('DOMContentLoaded', function() {
    const estimatesTable = document.getElementById('estimatesTableBody');
    const refreshBtn = document.getElementById('refreshEstimates');

    // Load estimates on page load
    loadEstimates();

    // Refresh button handler
    refreshBtn.addEventListener('click', loadEstimates);

    async function loadEstimates() {
        try {
            estimatesTable.innerHTML = '<tr><td colspan="6">Loading submissions...</td></tr>';
            
            const response = await fetch('/api/admin/estimates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            
            const estimates = await response.json();
            
            if (estimates.length === 0) {
                estimatesTable.innerHTML = '<tr><td colspan="6">No submissions found</td></tr>';
                return;
            }
            
            renderEstimates(estimates);
        } catch (error) {
            console.error('Error loading estimates:', error);
            estimatesTable.innerHTML = `<tr><td colspan="6">Failed to load submissions: ${error.message}</td></tr>`;
        }
    }

    function renderEstimates(estimates) {
        estimatesTable.innerHTML = '';
        
        estimates.forEach(estimate => {
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