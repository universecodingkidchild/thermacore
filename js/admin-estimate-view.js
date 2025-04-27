document.addEventListener('DOMContentLoaded', function () {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const estimateId = urlParams.get('id');

    if (!estimateId || estimateId === 'undefined') {
        showError('Invalid estimate ID');
        return;
    }

    // Initialize UI elements
    const loadingIndicator = document.getElementById('loadingIndicator');
    const cancelButton = document.getElementById('cancelLoading');
    const detailsContainer = document.getElementById('estimateDetails');
    const errorDisplay = document.getElementById('errorDisplay');

    // Set up cancel button
    cancelButton.addEventListener('click', () => {
        if (window.activeFetchController) {
            window.activeFetchController.abort();
        }
        loadingIndicator.style.display = 'none';
        cancelButton.style.display = 'none';
        errorDisplay.style.display = 'block';
        errorDisplay.innerHTML = 'Loading cancelled by user';
    });

    // Print Button functionality
    document.getElementById('printEstimate')?.addEventListener('click', function () {
        const printContent = document.getElementById('estimateDetails').innerHTML;
        const attachmentsContent = document.getElementById('attachmentList').innerHTML;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Estimate #${estimateId}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h2 { color: #2c3e50; }
                    .detail-row { margin-bottom: 10px; }
                    .detail-label { font-weight: bold; }
                    .attachment-item { margin-bottom: 10px; }
                    @page { size: auto; margin: 10mm; }
                </style>
            </head>
            <body>
                ${printContent}
                <h3><i class="fas fa-paperclip"></i> Attachments</h3>
                ${attachmentsContent}
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    });

    // Download Button functionality
    document.getElementById('downloadEstimate')?.addEventListener('click', async function () {
        const button = this;
        const originalHTML = button.innerHTML;

        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
            button.disabled = true;

            const token = localStorage.getItem('adminToken');
            if (!token) throw new Error('Not authenticated');

            // First try server-side PDF generation
            const response = await fetch(`/api/admin/estimates/${estimateId}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                // Fallback to client-side PDF generation if server fails
                const element = document.getElementById('estimateDetails');
                const opt = {
                    margin: 10,
                    filename: `estimate-${estimateId}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                // Use html2pdf.js if available
                if (typeof html2pdf !== 'undefined') {
                    await html2pdf().from(element).set(opt).save();
                } else {
                    throw new Error('PDF generation not available');
                }
            } else {
                // Download server-generated PDF
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `estimate-${estimateId}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download PDF: ' + error.message);
        } finally {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }
    });

    loadEstimateDetails(estimateId);
});

async function loadEstimateDetails(estimateId) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const cancelButton = document.getElementById('cancelLoading');
    const detailsContainer = document.getElementById('estimateDetails');
    const errorDisplay = document.getElementById('errorDisplay');
    const attachmentsContainer = document.getElementById('attachmentList');

    try {
        // Show loading state
        loadingIndicator.style.display = 'flex';
        cancelButton.style.display = 'block';
        errorDisplay.style.display = 'none';
        detailsContainer.innerHTML = '';
        attachmentsContainer.innerHTML = '';

        const token = localStorage.getItem('adminToken');
        if (!token) {
            throw new Error('Session expired. Please login again.');
        }

        // Create abort controller
        const controller = new AbortController();
        window.activeFetchController = controller;

        // Try direct endpoint first
        let response = await fetch(`/api/admin/estimates/${estimateId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });

        if (!response.ok) {
            // If direct endpoint fails, try the array endpoint
            const arrayResponse = await fetch('/api/admin/recent-estimates', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            if (!arrayResponse.ok) {
                throw new Error(`Failed to load estimate (${arrayResponse.status})`);
            }

            const allEstimates = await arrayResponse.json();
            const foundEstimate = Array.isArray(allEstimates)
                ? allEstimates.find(e => String(e.id) === String(estimateId) || String(e._id) === String(estimateId))
                : null;

            if (!foundEstimate) throw new Error('Estimate not found');

            renderEstimateDetails(foundEstimate);
            renderAttachments(foundEstimate.files || []);
        } else {
            const estimate = await response.json();
            if (!estimate) throw new Error('No estimate data received');

            renderEstimateDetails(estimate);
            renderAttachments(estimate.files || []);
        }

    } catch (error) {
        console.error('Error:', error);
        errorDisplay.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${error.name === 'AbortError' ? 'Request cancelled' : error.message}</h3>
                <button onclick="window.location.href='submissions.html'">Back to Submissions</button>
                <button onclick="location.reload()">Try Again</button>
            </div>
        `;
        errorDisplay.style.display = 'block';
    } finally {
        loadingIndicator.style.display = 'none';
        cancelButton.style.display = 'none';
        detailsContainer.style.display = 'block';
        delete window.activeFetchController;
    }
}

// 1. First try - Direct endpoint for single estimate
async function tryDirectFetch(estimateId, token) {
    try {
        const response = await fetch(`/api/admin/estimates/${estimateId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

// 2. Fallback - Get all estimates and search
async function tryArrayFetch(estimateId, token) {
    try {
        const response = await fetch('/api/admin/recent-estimates', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const estimates = Array.isArray(data) ? data :
            Array.isArray(data?.data) ? data.data :
                Array.isArray(data?.estimates) ? data.estimates : [];

        return estimates.find(e =>
            String(e.id) === String(estimateId) ||
            String(e._id) === String(estimateId)
        );
    } catch {
        return null;
    }
}

function renderEstimateDetails(estimate) {
    const container = document.getElementById('estimateDetails');

    const formattedDate = estimate.date
        ? new Date(estimate.date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'Date not available';

    container.innerHTML = `
        <div class="estimate-header">
            <h2>Estimate Request #${estimate.id || 'N/A'}</h2>
            <span class="estimate-date">Submitted on ${formattedDate}</span>
        </div>

        <div class="estimate-grid">
            <div class="estimate-section">
                <h3><i class="fas fa-user"></i> Contact Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Full Name:</span>
                    <span class="detail-value">${estimate.fullName || 'Not provided'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${estimate.email || 'Not provided'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">${estimate.phone || 'Not provided'}</span>
                </div>
            </div>

            <div class="estimate-section">
                <h3><i class="fas fa-project-diagram"></i> Project Details</h3>
                <div class="detail-row">
                    <span class="detail-label">Project Type:</span>
                    <span class="detail-value">${estimate.projectType || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Services Needed:</span>
                    <span class="detail-value">${estimate.services?.join(', ') || 'None selected'}</span>
                </div>
            </div>

            <div class="estimate-section full-width">
                <h3><i class="fas fa-file-alt"></i> Project Description</h3>
                <div class="project-description">
                    ${estimate.projectDescription || 'No description provided'}
                </div>
            </div>
        </div>
    `;
}

function renderAttachments(files) {
    const container = document.getElementById('attachmentList');

    if (!files || files.length === 0) {
        container.innerHTML = '<p class="no-files">No files attached to this estimate</p>';
        return;
    }

    container.innerHTML = files.map(file => `
        <div class="attachment-item">
            <i class="fas ${getFileIcon(file)}"></i>
            <div class="attachment-info">
                <span class="attachment-name">${file.originalname || file.filename || 'Unnamed file'}</span>
                <span class="attachment-size">${formatFileSize(file.size)}</span>
            </div>
            <button class="download-attachment" data-url="${file.url || ''}">
                <i class="fas fa-download"></i>
            </button>
        </div>
    `).join('');

    // Add download handlers
    document.querySelectorAll('.download-attachment').forEach(btn => {
        btn.addEventListener('click', function () {
            const fileUrl = this.getAttribute('data-url');
            if (fileUrl) {
                window.open(fileUrl, '_blank');
            }
        });
    });
}

// Helper functions
function getFileIcon(file) {
    const type = file.mimetype || file.type || '';
    if (type.includes('pdf')) return 'fa-file-pdf';
    if (type.includes('image')) return 'fa-file-image';
    if (type.includes('word')) return 'fa-file-word';
    return 'fa-file';
}

function formatFileSize(bytes) {
    if (!bytes) return 'Size unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function showError(message) {
    const container = document.getElementById('estimateDetails');
    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>${message}</h3>
            <div class="button-container">
                <button onclick="window.location.href='submissions.html'">
                    <i class="fas fa-arrow-left"></i> Back to Submissions
                </button>
                <button onclick="location.reload()">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        </div>
    `;
}

function printEstimate() {
    window.print();
}

function downloadEstimate() {
    document.getElementById('downloadEstimate')?.click();
}