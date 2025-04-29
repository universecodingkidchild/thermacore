document.addEventListener('DOMContentLoaded', function() {
    const estimatesTable = document.getElementById('estimatesTableBody');
    const refreshBtn = document.getElementById('refreshEstimates');

    // Load estimates on page load
    loadEstimates();

    // Refresh button handler
    refreshBtn.addEventListener('click', loadEstimates);

    async function loadEstimates() {
        try {
            const response = await fetch('/api/admin/estimates');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const estimates = await response.json();
            console.log('Raw estimates data:', estimates); // Debugging
            
            const tableBody = document.getElementById('estimates-table-body');
            if (!tableBody) {
                console.error('Estimates table body not found!');
                return;
            }
    
            tableBody.innerHTML = estimates.map(estimate => `
                <tr>
                    <td>${estimate.fullName}</td> <!-- Changed from name to fullName -->
                    <td>${estimate.projectType}</td>
                    <td>${estimate.date}</td>
                    <!-- other columns -->
                </tr>
            `).join('');
    
        } catch (error) {
            console.error('Failed to load estimates:', error);
            // Show error to user
            alert('Failed to load estimates. Check console for details.');
        }
    }
    
    // Call this when the page loads
    document.addEventListener('DOMContentLoaded', loadEstimates);

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