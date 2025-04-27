document.addEventListener('DOMContentLoaded', function () {
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

    // Current contact being viewed
    let currentContact = null;

    // Event listeners
    contactSearch.addEventListener('input', loadContacts);
    contactFilter.addEventListener('change', loadContacts);
    refreshContactsBtn.addEventListener('click', loadContacts);
    closeModalBtn.addEventListener('click', closeModal);
    saveContactBtn.addEventListener('click', saveContactChanges);
    deleteContactBtn.addEventListener('click', deleteContact);

    // Close modal when clicking outside
    contactDetailModal.addEventListener('click', function (e) {
        if (e.target === contactDetailModal) {
            closeModal();
        }
    });

    // Load contacts on page load
    loadContacts();

    // Functions
    function loadContacts() {
        console.log('Loading contacts...');

        // First fetch all contacts
        fetch('/api/contacts', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            credentials: 'include'
        })
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(allContacts => {
                console.log('Received contacts:', allContacts);
                if (!Array.isArray(allContacts)) {
                    throw new Error('Invalid data format - expected array');
                }

                // Apply client-side filtering
                const searchTerm = contactSearch.value.toLowerCase();
                const statusFilter = contactFilter.value;

                let filteredContacts = allContacts;

                // Status filter
                if (statusFilter !== 'all') {
                    filteredContacts = filteredContacts.filter(
                        contact => contact.status === statusFilter
                    );
                }

                // Search filter
                if (searchTerm) {
                    filteredContacts = filteredContacts.filter(contact =>
                        (contact.name && contact.name.toLowerCase().includes(searchTerm)) ||
                        (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
                        (contact.subject && contact.subject.toLowerCase().includes(searchTerm)) ||
                        (contact.message && contact.message.toLowerCase().includes(searchTerm))
                    );
                }

                renderContactsTable(filteredContacts);
            })
            .catch(error => {
                console.error('Error loading contacts:', error);
                showNotification(`Failed to load contacts: ${error.message}`, 'error');
            });
    }

    function renderContactsTable(contacts) {
        console.log(`Rendering ${contacts.length} contacts`);
        contactsTable.innerHTML = '';

        if (!contacts || contacts.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" class="text-center">No contacts found</td>`;
            contactsTable.appendChild(row);
            return;
        }

        contacts.forEach(contact => {
            try {
                const row = document.createElement('tr');
                const date = new Date(contact.createdAt || new Date());
                const formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // Safely handle status with defaults
                const status = contact.status || 'new';
                const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1);

                row.innerHTML = `
                    <td>${contact.name || 'N/A'}</td>
                    <td><a href="mailto:${contact.email || ''}">${contact.email || 'N/A'}</a></td>
                    <td>${contact.subject || 'N/A'}</td>
                    <td>${formattedDate}</td>
                    <td><span class="status-${status}">${statusDisplay}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view" data-id="${contact.id || ''}">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="action-btn delete" data-id="${contact.id || ''}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                contactsTable.appendChild(row);
            } catch (error) {
                console.error('Error rendering contact row:', contact, error);
            }
        });

        // Add event listeners to action buttons
        document.querySelectorAll('.action-btn.view').forEach(btn => {
            btn.addEventListener('click', function () {
                const contactId = this.getAttribute('data-id');
                if (contactId) {
                    viewContactDetails(contactId);
                }
            });
        });

        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', function () {
                const contactId = this.getAttribute('data-id');
                if (contactId && confirm('Are you sure you want to delete this contact submission?')) {
                    deleteContact(contactId);
                }
            });
        });
    }

    function viewContactDetails(contactId) {
        console.log(`Viewing contact details for ID: ${contactId}`);
        fetch(`/api/contacts/${contactId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(contact => {
                if (!contact) {
                    throw new Error('Contact not found');
                }

                currentContact = contact;
                console.log('Contact details:', contact);

                // Populate modal
                document.getElementById('detailName').textContent = contact.name || 'N/A';
                document.getElementById('detailEmail').textContent = contact.email || 'N/A';
                document.getElementById('detailPhone').textContent = contact.phone || 'Not provided';
                document.getElementById('detailSubject').textContent = contact.subject || 'N/A';
                document.getElementById('detailMessage').textContent = contact.message || 'N/A';
                document.getElementById('detailStatus').value = contact.status || 'new';

                // Set reply link
                if (contact.email && contact.subject) {
                    replyEmailBtn.href = `mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`;
                    replyEmailBtn.style.display = 'inline-block';
                } else {
                    replyEmailBtn.style.display = 'none';
                }

                // Open modal
                contactDetailModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            })
            .catch(error => {
                console.error('Error fetching contact details:', error);
                showNotification(`Failed to load contact details: ${error.message}`, 'error');
            });
    }

    function closeModal() {
        contactDetailModal.classList.remove('show');
        document.body.style.overflow = '';
        currentContact = null;
    }

    function saveContactChanges() {
        if (!currentContact) return;

        const newStatus = document.getElementById('detailStatus').value;
        console.log(`Updating contact ${currentContact.id} status to ${newStatus}`);

        fetch(`/api/contacts/${currentContact.id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify({ status: newStatus }),
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(updatedContact => {
                console.log('Contact updated:', updatedContact);
                showNotification('Contact updated successfully', 'success');
                closeModal();
                loadContacts();
            })
            .catch(error => {
                console.error('Error updating contact:', error);
                showNotification(`Failed to update contact: ${error.message}`, 'error');
            });
    }

    function deleteContact(contactId) {
        if (!contactId && currentContact) {
            contactId = currentContact.id;
        }

        if (!contactId) return;

        console.log(`Deleting contact ID: ${contactId}`);
        fetch(`/api/contacts/${contactId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            credentials: 'include'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(() => {
                console.log('Contact deleted successfully');
                showNotification('Contact deleted successfully', 'success');
                if (currentContact) closeModal();
                loadContacts();
            })
            .catch(error => {
                console.error('Error deleting contact:', error);
                showNotification(`Failed to delete contact: ${error.message}`, 'error');
            });
    }

    function showNotification(message, type) {
        console.log(`Showing notification: [${type}] ${message}`);
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
});