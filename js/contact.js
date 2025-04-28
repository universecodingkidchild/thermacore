document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const spinner = submitButton.querySelector('.spinner');

    function showSuccessAlert() {
        return showAlert(
            'Success', 
            'Your message has been sent successfully!', 
            'success'
        );
    }

    function showAlert(title, text, icon = 'info') {
        // Use SweetAlert if available (requires SweetAlert2 library)
        if (typeof Swal !== 'undefined') {
            return Swal.fire({
                title,
                text,
                icon,
                confirmButtonText: 'OK'
            });
        }
        // Fallback to browser alert
        alert(`${title}: ${text}`);
        return Promise.resolve();
    }

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        buttonText.textContent = 'Sending...';
        spinner.classList.remove('hidden');
        submitButton.disabled = true;
        
        try {
            const formData = {
                name: form.querySelector('#contactName').value.trim(),
                email: form.querySelector('#contactEmail').value.trim(),
                phone: form.querySelector('#contactPhone').value.trim(),
                subject: form.querySelector('#contactSubject').value.trim(),
                message: form.querySelector('#contactMessage').value.trim()
            };
            
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
    
            // First check response status
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Submission failed');
            }
    
            // Then parse JSON
            const result = await response.json();
            
            if (result.success) {
                await showSuccessAlert();
                form.reset();
            } else {
                throw new Error(result.message || 'Submission failed');
            }
        } catch (error) {
            console.error('Submission error:', error);
            await showAlert(
                'Error', 
                error.message || 'Could not connect to the server',
                'error'
            );
        } finally {
            buttonText.textContent = 'Send Message';
            spinner.classList.add('hidden');
            submitButton.disabled = false;
        }
    });

    function validateForm() {
        let isValid = true;
        const emailField = form.querySelector('#contactEmail');
        const phoneField = form.querySelector('#contactPhone');
        
        // Reset error states
        form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        
        // Validate required fields
        form.querySelectorAll('[required]').forEach(field => {
            if (!field.value.trim()) {
                markAsError(field, 'This field is required');
                isValid = false;
            }
        });
        
        // Validate email format
        if (emailField && !isValidEmail(emailField.value)) {
            markAsError(emailField, 'Please enter a valid email address');
            isValid = false;
        }
        
        // Validate phone format (if provided)
        if (phoneField.value && !isValidPhone(phoneField.value)) {
            markAsError(phoneField, 'Please enter a valid phone number');
            isValid = false;
        }
        
        return isValid;
    }

    function markAsError(element, message) {
        const formGroup = element.closest('.form-group');
        if (!formGroup) return;
        
        formGroup.classList.add('error');
        const errorElement = formGroup.querySelector('.error-message') || document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        if (!formGroup.querySelector('.error-message')) {
            formGroup.appendChild(errorElement);
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
});