document.addEventListener('DOMContentLoaded', async function() {
    // 1. DOM Elements with null checks and error boundaries
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');
    const estimateDetails = document.getElementById('estimateDetails');
    
    if (!loadingIndicator || !errorDisplay || !estimateDetails) {
        console.error('Critical DOM elements missing!');
        document.body.innerHTML = '<div class="fatal-error">Application failed to initialize. Please refresh.</div>';
        return;
    }

    try {
        // 2. Enhanced Authentication Check with JWT structure validation
        const token = localStorage.getItem('adminToken');
        if (!token || !/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)) {
            window.location.href = `/admin/login.html?from=${encodeURIComponent(window.location.pathname + window.location.search)}`;
            return;
        }

        // 3. URL Parameter Handling with strict validation
        const urlParams = new URLSearchParams(window.location.search);
        const estimateId = (urlParams.get('id') || '').trim();
        
        if (!estimateId || !/^[a-zA-Z0-9-_]+$/.test(estimateId)) {
            throw new Error('Invalid estimate reference format');
        }

        // 4. Loading States with accessibility
        loadingIndicator.style.display = 'flex';
        loadingIndicator.setAttribute('aria-live', 'polite');
        errorDisplay.style.display = 'none';
        estimateDetails.style.display = 'none';

        // 5. Enhanced Fetch with retry mechanism
        const startTime = performance.now();
        const response = await fetchWithRetry(
            `/api/admin/estimates/${encodeURIComponent(estimateId)}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Client-Version': '1.0.0'
                },
                cache: 'no-store',
                credentials: 'include'
            },
            2 // Retry attempts
        );

        // 6. Advanced Response Handling with metrics
        const responseTime = (performance.now() - startTime).toFixed(2);
        console.debug(`API response time: ${responseTime}ms`);
        performance.mark('estimate-loaded');

        if (!response.ok) {
            const errorData = await parseErrorResponse(response);
            throw new Error(errorData.message || `Server responded with ${response.status}`);
        }

        // 7. Strict Data Validation
        const estimate = await response.json();
        if (!estimate || typeof estimate !== 'object' || Array.isArray(estimate)) {
            throw new Error('Invalid data structure received');
        }
        if (!estimate._id && !estimate.id) {
            throw new Error('Estimate missing identifier');
        }

        // 8. Display with enhanced safety and performance
        await displayEstimateDetails(estimate);

    } catch (error) {
        console.error('Estimate load failure:', error);
        showError(
            error.message.includes('reference') ? error.message :
            error.message.includes('Network') ? 'Network issues detected. Please check your connection.' :
            `Failed to load estimate: ${error.message}`
        );
        
        // Log error to analytics if available
        if (window.analytics) {
            window.analytics.track('estimate_load_failed', { error: error.message });
        }
    } finally {
        loadingIndicator.style.display = 'none';
    }

    // ========== HELPER FUNCTIONS ========== //
    
    async function fetchWithRetry(url, options, retries = 2) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429 && retries > 0) { // Rate limited
                const retryAfter = response.headers.get('Retry-After') || 1;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return fetchWithRetry(url, options, retries - 1);
            }
            return response;
        } catch (err) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return fetchWithRetry(url, options, retries - 1);
            }
            throw err;
        }
    }

    async function parseErrorResponse(response) {
        try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await response.json();
                return {
                    message: data.message || data.error || 'Unknown error',
                    details: data.details
                };
            }
            const text = await response.text();
            return { 
                message: text.includes('<html') ? 'Server error occurred' : text.slice(0, 200),
                isHtml: text.includes('<html')
            };
        } catch (e) {
            return { message: `Unable to parse error (Status ${response.status})` };
        }
    }

    async function displayEstimateDetails(estimate) {
        // Enhanced formatting utilities with memoization
        const format = {
            date: memoize((dateString) => {
                try {
                    const options = { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit'
                    };
                    return new Date(dateString).toLocaleString('en-US', options);
                } catch {
                    return 'Date not available';
                }
            }),
            currency: memoize((amount) => {
                if (typeof amount !== 'number') return 'Not specified';
                return new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD',
                    minimumFractionDigits: 2
                }).format(amount);
            }),
            text: (input) => input || '—'
        };

        // Safe data display with element validation
        const displayField = (elementId, value, formatter = format.text) => {
            const element = document.getElementById(elementId);
            if (!element) {
                console.warn(`Element ${elementId} not found`);
                return;
            }
            
            try {
                const formattedValue = formatter(value);
                if (element.dataset.richText === 'true') {
                    element.innerHTML = formattedValue;
                } else {
                    element.textContent = formattedValue;
                }
                element.removeAttribute('aria-busy');
            } catch (e) {
                console.error(`Failed to display ${elementId}:`, e);
                element.textContent = 'Error displaying value';
            }
        };

        // Batch display updates for performance
        const fields = [
            { id: 'estimateId', value: estimate._id || estimate.id, formatter: (id) => id ? id.slice(-6) : 'REF-XXXX' },
            { id: 'estimateDate', value: estimate.date || estimate.createdAt, formatter: format.date },
            { id: 'clientName', value: estimate.fullName || estimate.name },
            { id: 'clientEmail', value: estimate.email },
            { id: 'clientPhone', value: estimate.phone || estimate.phoneNumber },
            { id: 'clientCompany', value: estimate.company },
            { id: 'clientAddress', value: estimate.address },
            { id: 'projectType', value: estimate.projectType },
            { id: 'projectSize', value: estimate.size || estimate.squareFootage },
            { id: 'projectBudget', value: estimate.budget, formatter: format.currency },
            { id: 'projectTimeline', value: estimate.timeline },
            { id: 'projectDescription', value: estimate.description || estimate.projectDescription },
            { id: 'heatingRequirements', value: estimate.heatingRequirements },
            { id: 'currentSystem', value: estimate.currentSystem },
            { id: 'specialRequirements', value: estimate.specialRequirements }
        ];

        fields.forEach(field => {
            displayField(field.id, field.value, field.formatter);
        });

        // Trigger UI update with animation frame
        await new Promise(resolve => requestAnimationFrame(resolve));
        estimateDetails.style.display = 'block';
        estimateDetails.setAttribute('aria-live', 'polite');
    }

    function showError(message, isHtml = false) {
        if (!errorDisplay) return;
        
        errorDisplay.innerHTML = `
            <div class="error-content" role="alert">
                <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                <div>
                    <h4>Unable to Load Estimate</h4>
                    <div>${isHtml ? message : escapeHtml(message)}</div>
                    <div class="error-actions">
                        <button onclick="window.location.reload()" class="btn-retry" aria-label="Retry loading">
                            <i class="fas fa-sync-alt" aria-hidden="true"></i> Try Again
                        </button>
                        <button onclick="window.location.href='submissions.html'" class="btn-back" aria-label="Back to submissions">
                            <i class="fas fa-arrow-left" aria-hidden="true"></i> Back to List
                        </button>
                    </div>
                </div>
            </div>
        `;
        errorDisplay.style.display = 'flex';
    }

    // Utility functions
    function memoize(fn) {
        const cache = new Map();
        return (arg) => {
            if (cache.has(arg)) return cache.get(arg);
            const result = fn(arg);
            cache.set(arg, result);
            return result;
        };
    }

    function escapeHtml(unsafe) {
        return unsafe.replace(/[&<"'>]/g, match => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match]));
    }
});