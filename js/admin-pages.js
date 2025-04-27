document.addEventListener('DOMContentLoaded', function () {
    // Initialize Quill editor
    const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image', 'video'],
                ['clean']
            ]
        },
        placeholder: 'Write your page content here...'
    });

    // DOM elements
    const newPageBtn = document.getElementById('newPageBtn');
    const pageEditorModal = document.getElementById('pageEditorModal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelPageBtn = document.getElementById('cancelPageBtn');
    const savePageBtn = document.getElementById('savePageBtn');
    const previewPageBtn = document.getElementById('previewPageBtn');
    const pageSearch = document.getElementById('pageSearch');
    const pageFilter = document.getElementById('pageFilter');
    const pagesTable = document.querySelector('#pagesTable tbody');
    const pageTitle = document.getElementById('pageTitle');
    const pageSlug = document.getElementById('pageSlug');
    const pageStatus = document.getElementById('pageStatus');
    const pageMetaTitle = document.getElementById('pageMetaTitle');
    const pageMetaDescription = document.getElementById('pageMetaDescription');
    const editorTitle = document.getElementById('editorTitle');

    // Current page being edited
    let currentPageId = null;
    let isEditing = false;

    // Event listeners
    newPageBtn.addEventListener('click', openNewPageModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelPageBtn.addEventListener('click', closeModal);
    savePageBtn.addEventListener('click', savePage);
    previewPageBtn.addEventListener('click', previewPage);
    pageSearch.addEventListener('input', filterPages);
    pageFilter.addEventListener('change', filterPages);
    pageTitle.addEventListener('input', generateSlug);

    // Load pages on page load
    loadPages();

    // Functions
    function openNewPageModal() {
        currentPageId = null;
        isEditing = false;
        editorTitle.textContent = 'New Page';
        resetForm();
        openModal();
    }

    function openEditPageModal(page) {
        currentPageId = page.id;
        isEditing = true;
        editorTitle.textContent = 'Edit Page';

        // Fill form with page data
        pageTitle.value = page.title;
        pageSlug.value = page.slug;
        quill.root.innerHTML = page.content;
        pageStatus.value = page.status;
        pageMetaTitle.value = page.metaTitle || '';
        pageMetaDescription.value = page.metaDescription || '';

        openModal();
    }

    function resetForm() {
        pageTitle.value = '';
        pageSlug.value = '';
        quill.root.innerHTML = '';
        pageStatus.value = 'published';
        pageMetaTitle.value = '';
        pageMetaDescription.value = '';
    }

    function openModal() {
        pageEditorModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        pageEditorModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    function generateSlug() {
        if (!isEditing) {
            const title = pageTitle.value;
            if (title) {
                fetch('/api/pages/generate-slug', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ title })
                })
                    .then(response => response.json())
                    .then(data => {
                        pageSlug.value = data.slug;
                    })
                    .catch(error => {
                        console.error('Error generating slug:', error);
                    });
            }
        }
    }

    function savePage() {
        const pageData = {
            title: pageTitle.value,
            slug: pageSlug.value,
            content: quill.root.innerHTML,
            status: pageStatus.value,
            metaTitle: pageMetaTitle.value,
            metaDescription: pageMetaDescription.value
        };

        const url = isEditing ? `/api/pages/${currentPageId}` : '/api/pages';
        const method = isEditing ? 'PUT' : 'POST';

        fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pageData)
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw err; });
                }
                return response.json();
            })
            .then(data => {
                closeModal();
                loadPages();
                showNotification('Page saved successfully!', 'success');
            })
            .catch(error => {
                console.error('Error saving page:', error);
                showNotification(error.error || 'Error saving page', 'error');
            });
    }

    function previewPage() {
        const pageData = {
            title: pageTitle.value,
            slug: pageSlug.value,
            content: quill.root.innerHTML,
            status: pageStatus.value
        };

        // Store page data in sessionStorage for preview
        sessionStorage.setItem('previewPage', JSON.stringify(pageData));

        // Open preview in new tab
        window.open('/preview', '_blank');
    }

    function loadPages() {
        fetch('/api/pages')
            .then(response => response.json())
            .then(data => {
                renderPagesTable(data);
            })
            .catch(error => {
                console.error('Error loading pages:', error);
            });
    }

    function filterPages() {
        const searchTerm = pageSearch.value;
        const statusFilter = pageFilter.value;

        let url = '/api/pages/filter?';
        if (statusFilter !== 'all') url += `status=${statusFilter}&`;
        if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                renderPagesTable(data);
            })
            .catch(error => {
                console.error('Error filtering pages:', error);
            });
    }

    function renderPagesTable(pages) {
        pagesTable.innerHTML = '';

        if (pages.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" class="text-center">No pages found</td>`;
            pagesTable.appendChild(row);
            return;
        }

        pages.forEach(page => {
            const row = document.createElement('tr');

            // Format date
            const date = new Date(page.updatedAt);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            row.innerHTML = `
                <td>${page.title}</td>
                <td>${page.slug}</td>
                <td><span class="status-${page.status}">${page.status.charAt(0).toUpperCase() + page.status.slice(1)}</span></td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" data-id="${page.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" data-id="${page.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            pagesTable.appendChild(row);
        });

        // Add event listeners to action buttons
        document.querySelectorAll('.action-btn.edit').forEach(btn => {
            btn.addEventListener('click', function () {
                const pageId = this.getAttribute('data-id');
                const page = pages.find(p => p.id === pageId);
                if (page) openEditPageModal(page);
            });
        });

        document.querySelectorAll('.action-btn.delete').forEach(btn => {
            btn.addEventListener('click', function () {
                const pageId = this.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this page?')) {
                    deletePage(pageId);
                }
            });
        });
    }
    function clearAllData(type) {
        fetch(`/api/clear-data/${type}`, {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(`${type} cleared successfully!`);
                } else {
                    throw new Error(data.error || 'Unknown error');
                }
            })
            .catch(error => {
                alert(`Error: ${error.message}`);
            });
    }


    function deletePage(pageId) {
        fetch(`/api/pages/${pageId}`, {
            method: 'DELETE'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error deleting page');
                }
                return response.json();
            })
            .then(data => {
                loadPages();
                showNotification('Page deleted successfully!', 'success');
            })
            .catch(error => {
                console.error('Error deleting page:', error);
                showNotification('Error deleting page', 'error');
            });
    }

    function showNotification(message, type) {
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

    // Close modal when clicking outside
    pageEditorModal.addEventListener('click', function (e) {
        if (e.target === pageEditorModal) {
            closeModal();
        }
    });
});