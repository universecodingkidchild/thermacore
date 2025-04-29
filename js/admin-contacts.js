document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const contactsTable = document.querySelector('#contactsTable tbody');
    const contactSearch = document.getElementById('contactSearch');
    const contactFilter = document.getElementById('contactFilter');
    const refreshContactsBtn = document.getElementById('refreshContactsBtn');
    const contactDetailModal = document.getElementById('contactDetailModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const saveContactBtn = document.getElementById('saveContactBtn');
    const deleteContactBtn = document.getElementById('deleteContactBtn');
    const replyEmailBtn = document.getElementById('replyEmailBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorDisplay = document.getElementById('errorDisplay');

    // Current contact being viewed
    let currentContact = null;

    // Event listeners
    contactSearch.addEventListener('input', debounce(loadContacts, 300));
    contactFilter.addEventListener('change', loadContacts);
    refreshContactsBtn.addEventListener('click', loadContacts);
    closeModalBtn.addEventListener('click', closeModal);
    saveContactBtn.addEventListener('click', saveContactChanges);
    deleteContactBtn.addEventListener('click', () => deleteContact(currentContact?.id));

    // Close modal when clicking outside
    contactDetailModal.addEventListener('click', function(e) {
        if (e.target === contactDetailModal) {
            closeModal();
        }
    });

    // Initial load
    loadContacts();

    // --- Core Functions --- //

    function loadContacts() {
        showLoading(true);
        errorDisplay.style.display = 'none';

        const searchTerm = contactSearch.value.toLowerCase();
        const statusFilter = contactFilter.value;

        fetch('/api/admin/contacts', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('API Response:', data); // Debug log
            
            // Handle different response formats
            const contacts = Array.isArray(data) ? data : 
                           Array.isArray(data?.data) ? data.data : 
                           Array.isArray(data?.contacts) ? data.contacts : [];

            if (!contacts.length) {
                renderEmptyState();
                return;
            }

            // Apply filters
            const filteredContacts = contacts.filter(contact => {
                const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
                const matchesSearch = !searchTerm || 
                    (contact.name?.toLowerCase().includes(searchTerm) ||
                     contact.email?.toLowerCase().includes(searchTerm) ||
                     contact.subject?.toLowerCase().includes(searchTerm));
                return matchesStatus && matchesSearch;
            });

            renderContactsTable(filteredContacts);
        })
        .catch(error => {
            console.error('Error loading contacts:', error);
            showError('Failed to load contacts. Please try again.');
        })
        .finally(() => showLoading(false));
    }

    function renderContactsTable(contacts) {
        contactsTable.innerHTML = '';

        if (!contacts.length) {
            renderEmptyState();
            return;
        }

        contacts.forEach(contact => {
            const row = document.createElement('tr');
            const date = contact.created_at ? new Date(contact.created_at) : new Date();
            
            row.innerHTML = `
                <td>${contact.name || 'No name'}</td>
                <td><a href="mailto:${contact.email || ''}">${contact.email || 'No email'}</a></td>
                <td>${contact.subject || 'No subject'}</td>
                <td>${date.toLocaleDateString()}</td>
                <td><span class="status-badge ${contact.status || 'new'}">${(contact.status || 'new').toUpperCase()}</span></td>
                <td>
                    <button class="btn-view" data-id="${contact.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-delete" data-id="${contact.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            contactsTable.appendChild(row);
        });

        // Add event listeners
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', () => viewContactDetails(btn.dataset.id));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Delete this contact permanently?')) {
                    deleteContact(btn.dataset.id);
                }
            });
        });
    }

    function viewContactDetails(contactId) {
        showLoading(true);
        
        fetch(`/api/admin/contacts/${contactId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Accept': 'application/json' // Explicitly request JSON
            }
        })
        .then(response => {
            // First check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(contact => {
            if (!contact) throw new Error('Contact data is empty');
            
            currentContact = contact;
            
            // Populate modal
            document.getElementById('modalContactName').textContent = contact.name || 'No name';
            document.getElementById('modalContactEmail').textContent = contact.email || 'No email';
            document.getElementById('modalContactPhone').textContent = contact.phone || 'No phone';
            document.getElementById('modalContactSubject').textContent = contact.subject || 'No subject';
            document.getElementById('modalContactMessage').textContent = contact.message || 'No message';
            document.getElementById('modalContactStatus').value = contact.status || 'new';
            
            // Show modal
            contactDetailModal.classList.add('show');
        })
        .catch(error => {
            console.error('Error loading contact details:', error);
            showError('Failed to load contact details. The contact may not exist.');
        })
        .finally(() => showLoading(false));
    }

    // --- Helper Functions --- //

    function showLoading(show) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }

    function showError(message) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
    }

    function renderEmptyState() {
        contactsTable.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No contacts found</p>
                </td>
            </tr>
        `;
    }

    function closeModal() {
        contactDetailModal.classList.remove('show');
        currentContact = null;
    }

    function saveContactChanges() {
        if (!currentContact) return;

        const newStatus = document.getElementById('modalContactStatus').value;
        
        fetch(`/api/admin/contacts/${currentContact.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to update contact');
            closeModal();
            loadContacts();
            showNotification('Contact updated successfully', 'success');
        })
        .catch(error => {
            console.error('Error updating contact:', error);
            showNotification('Failed to update contact', 'error');
        });
    }

    function deleteContact(contactId) {
        if (!contactId) return;
        
        fetch(`/api/admin/contacts/${contactId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to delete contact');
            showNotification('Contact deleted successfully', 'success');
            loadContacts();
            if (currentContact) closeModal();
        })
        .catch(error => {
            console.error('Error deleting contact:', error);
            showNotification('Failed to delete contact', 'error');
        });
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
});