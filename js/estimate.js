document.addEventListener('DOMContentLoaded', function() {
    // Add SweetAlert CSS (if not already in your HTML)
    const sweetAlertCSS = document.createElement('link');
    sweetAlertCSS.rel = 'stylesheet';
    sweetAlertCSS.href = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css';
    document.head.appendChild(sweetAlertCSS);

    const form = document.getElementById('estimateRequestForm');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('blueprintFiles');
    const filePreview = document.getElementById('filePreview');
    const submitButton = form.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const spinner = submitButton.querySelector('.spinner');
    
    const maxFiles = 20;
    const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes

    // File upload area click handler
    fileUploadArea.addEventListener('click', function() {
        fileInput.click();
    });

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        fileUploadArea.classList.add('highlight');
    }

    function unhighlight() {
        fileUploadArea.classList.remove('highlight');
    }

    fileUploadArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // File input change handler
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        const validFiles = [];
        const invalidFiles = [];
        
        // Check number of files
        if (files.length > maxFiles) {
            showAlert('Error', `You can upload a maximum of ${maxFiles} files.`, 'error');
            return;
        }
        
        // Check each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (file.type !== 'application/pdf') {
                invalidFiles.push(file.name);
                continue;
            }
            
            if (file.size > maxFileSize) {
                invalidFiles.push(`${file.name} (file too large)`);
                continue;
            }
            
            validFiles.push(file);
        }
        
        // Show invalid files message
        if (invalidFiles.length > 0) {
            showAlert('Invalid Files', `The following files were not accepted (PDF only, max 10MB each):<br>${invalidFiles.join('<br>')}`, 'error');
        }
        
        // Update file input with valid files only
        const dataTransfer = new DataTransfer();
        validFiles.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
        
        // Update preview
        updateFilePreview(validFiles);
    }

    function updateFilePreview(files) {
        if (files.length === 0) {
            filePreview.innerHTML = '<p>No files selected</p>';
            return;
        }
        
        filePreview.innerHTML = '';
        const list = document.createElement('ul');
        
        files.forEach((file, index) => {
            const item = document.createElement('li');
            item.className = 'file-preview-item';
            
            item.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file-pdf"></i>
                    <span>${file.name} (${formatFileSize(file.size)})</span>
                </div>
                <button class="remove-file" data-index="${index}" aria-label="Remove file">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            list.appendChild(item);
        });
        
        filePreview.appendChild(list);
        
        // Add remove file handlers
        document.querySelectorAll('.remove-file').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const index = parseInt(this.getAttribute('data-index'));
                removeFile(index);
            });
        });
    }

    function removeFile(index) {
        const files = Array.from(fileInput.files);
        files.splice(index, 1);
        
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
        
        updateFilePreview(files);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Show loading state
        buttonText.textContent = 'Processing...';
        spinner.classList.remove('hidden');
        submitButton.disabled = true;
        
        try {
            // Create FormData object
            const formData = new FormData(form);
            
            // Send data to server
            const response = await fetch('/api/send-estimate', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                await showAlert(
                    'Request Submitted!', 
                    'Your estimate request has been received. One of our estimators will reach out to you once your quote is ready.', 
                    'success'
                );
                form.reset();
                filePreview.innerHTML = '<p>No files selected</p>';
            } else {
                await showAlert(
                    'Submission Failed', 
                    data.message || 'An error occurred while submitting your request. Please try again.', 
                    'error'
                );
            }
        } catch (error) {
            await showAlert(
                'Network Error', 
                'Could not connect to the server. Please check your internet connection and try again.', 
                'error'
            );
            console.error('Error:', error);
        } finally {
            // Reset button state
            buttonText.textContent = 'Submit Request';
            spinner.classList.add('hidden');
            submitButton.disabled = false;
        }
    });

    function validateForm() {
        let isValid = true;
        
        // Reset error states
        document.querySelectorAll('.error').forEach(el => {
            el.classList.remove('error');
        });
        document.querySelectorAll('.error-message').forEach(el => {
            el.innerHTML = '';
        });
        
        // Required fields validation
        const requiredFields = form.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                markAsError(field, 'This field is required');
                isValid = false;
            }
        });
        
        // Email validation
        const emailField = form.querySelector('input[type="email"]');
        if (emailField && !isValidEmail(emailField.value)) {
            markAsError(emailField, 'Please enter a valid email address');
            isValid = false;
        }
        
        // Phone validation
        const phoneField = form.querySelector('input[type="tel"]');
        if (phoneField && !isValidPhone(phoneField.value)) {
            markAsError(phoneField, 'Please enter a valid phone number');
            isValid = false;
        }
        
        // At least one service selected
        const services = form.querySelectorAll('input[name="services[]"]:checked');
        if (services.length === 0) {
            const servicesContainer = form.querySelector('.checkbox-group');
            markAsError(servicesContainer, 'Please select at least one service');
            isValid = false;
        }
        
        return isValid;
    }

    function markAsError(element, message) {
        const formGroup = element.closest('.form-group') || element;
        formGroup.classList.add('error');
        
        const errorMessage = formGroup.querySelector('.error-message') || document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = message;
        
        if (!formGroup.querySelector('.error-message')) {
            formGroup.appendChild(errorMessage);
        }
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function isValidPhone(phone) {
        const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
        return re.test(phone);
    }

    // SweetAlert notification function
    async function showAlert(title, html, icon) {
        return Swal.fire({
            title: title,
            html: html,
            icon: icon,
            confirmButtonColor: '#e74c3c',
            confirmButtonText: 'OK',
            customClass: {
                popup: 'sweetalert-custom',
                title: 'sweetalert-title',
                confirmButton: 'sweetalert-confirm'
            }
        });
    }
});