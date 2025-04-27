document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contactForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const spinner = submitButton.querySelector('.spinner');

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Show loading state
        buttonText.textContent = 'Sending...';
        spinner.classList.remove('hidden');
        submitButton.disabled = true;
        
        try {
            // Create form data object
            const formData = {
                name: form.querySelector('#contactName').value.trim(),
                email: form.querySelector('#contactEmail').value.trim(),
                phone: form.querySelector('#contactPhone').value.trim(),
                subject: form.querySelector('#contactSubject').value.trim(),
                message: form.querySelector('#contactMessage').value.trim()
            };
            
            // Send to server
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                await Swal.fire({
                    title: 'Message Sent!',
                    html: 'Thank you for contacting us. We will get back to you within 24 hours. ' + (result.messageId || 'N/A'),
                    icon: 'success',
                    confirmButtonColor: '#e74c3c',
                    confirmButtonText: 'OK',
                    customClass: {
                        popup: 'sweetalert-custom',
                        title: 'sweetalert-title'
                    }
                });
                form.reset();
            } else {
                await Swal.fire({
                    title: 'Error',
                    text: result.message || 'There was an error sending your message. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#e74c3c',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            console.error('Submission error:', error);
            await Swal.fire({
                title: 'Network Error',
                text: 'Could not connect to the server. Please check your internet connection and try again.',
                icon: 'error',
                confirmButtonColor: '#e74c3c',
                confirmButtonText: 'OK'
            });
        } finally {
            // Reset button state
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