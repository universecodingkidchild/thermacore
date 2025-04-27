document.addEventListener('DOMContentLoaded', function() {
    // Initialize editor functionality
    if (document.querySelector('.content-editor')) {
        initEditor();
    }

    // Initialize submissions table functionality
    if (document.querySelector('.submissions-table')) {
        initSubmissionsTable();
    }

    // Initialize SEO form functionality
    if (document.querySelector('.seo-form')) {
        initSEOForm();
    }
});

function initEditor() {
    const pageSelector = document.querySelector('.page-selector select');
    const contentEditor = document.querySelector('.content-editor');
    const saveButton = document.querySelector('.save-button');
    
    // In a real implementation, this would load content from a database
    const pageContents = {
        'home': '<h2>Welcome to ProShield</h2><p>Professional fireproofing and insulation services for all building types.</p>',
        'about': '<h2>About Our Company</h2><p>Founded in 2005, we have been serving the community with quality workmanship.</p>',
        'contact': '<h2>Contact Us</h2><p>Get in touch with our team for your project needs.</p>',
        'estimate': '<h2>Request an Estimate</h2><p>Submit your project details for a free quote.</p>'
    };
    
    // Load initial content
    contentEditor.innerHTML = pageContents['home'];
    
    // Handle page selection changes
    pageSelector.addEventListener('change', function() {
        const selectedPage = this.value;
        contentEditor.innerHTML = pageContents[selectedPage] || '';
    });
    
    // Handle save button click
    saveButton.addEventListener('click', function() {
        const selectedPage = pageSelector.value;
        const newContent = contentEditor.innerHTML;
        
        // In a real implementation, this would save to a database
        pageContents[selectedPage] = newContent;
        
        alert('Content saved successfully!');
    });
    
    // Simple toolbar functionality
    document.querySelectorAll('.editor-toolbar button').forEach(button => {
        button.addEventListener('click', function() {
            const command = this.getAttribute('data-command');
            
            if (command === 'h2') {
                document.execCommand('formatBlock', false, '<h2>');
            } else if (command === 'h3') {
                document.execCommand('formatBlock', false, '<h3>');
            } else if (command === 'p') {
                document.execCommand('formatBlock', false, '<p>');
            } else {
                document.execCommand(command, false, null);
            }
        });
    });
}

function initSubmissionsTable() {
    // In a real implementation, this would load data from a database
    const submissions = [
        {
            id: 1,
            name: 'John Smith',
            company: 'ABC Construction',
            email: 'john@abcconstruction.com',
            phone: '(555) 123-4567',
            date: '2023-05-15',
            files: 3,
            project: 'Commercial Office Building'
        },
        {
            id: 2,
            name: 'Sarah Johnson',
            company: 'XYZ Developers',
            email: 'sarah@xyzdev.com',
            phone: '(555) 987-6543',
            date: '2023-05-14',
            files: 5,
            project: 'Residential Complex'
        },
        {
            id: 3,
            name: 'Michael Brown',
            company: 'Industrial Solutions Inc.',
            email: 'michael@industrialsolutions.com',
            phone: '(555) 456-7890',
            date: '2023-05-12',
            files: 2,
            project: 'Warehouse Facility'
        }
    ];
    
    const tableBody = document.querySelector('.submissions-table tbody');
    
    // Populate table with data
    submissions.forEach(submission => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${submission.id}</td>
            <td>${submission.name}</td>
            <td>${submission.company}</td>
            <td>${submission.email}</td>
            <td>${submission.phone}</td>
            <td>${submission.date}</td>
            <td>${submission.files}</td>
            <td>${submission.project}</td>
            <td class="action" data-id="${submission.id}">View Details</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add click handlers for view details
    document.querySelectorAll('.submissions-table .action').forEach(button => {
        button.addEventListener('click', function() {
            const submissionId = this.getAttribute('data-id');
            viewSubmissionDetails(submissionId);
        });
    });
}

function viewSubmissionDetails(submissionId) {
    // In a real implementation, this would fetch details from a database
    alert(`Viewing details for submission #${submissionId}\nThis would show all submitted information and allow downloading files.`);
}

function initSEOForm() {
    const seoForm = document.querySelector('.seo-form');
    
    // In a real implementation, this would load current SEO settings from a database
    const seoSettings = {
        'home': {
            title: 'ProShield Fireproofing & Insulation | Commercial & Residential',
            description: 'Professional fireproofing, insulation, drywall, and taping services for commercial, residential, and industrial buildings.',
            keywords: 'fireproofing, insulation, drywall, taping, commercial, residential, industrial'
        },
        'about': {
            title: 'About Us | ProShield Fireproofing & Insulation',
            description: 'Learn about our company history and commitment to quality fireproofing and insulation services.',
            keywords: 'about us, company history, quality workmanship'
        }
    };
    
    const pageSelector = seoForm.querySelector('select[name="page"]');
    const titleInput = seoForm.querySelector('input[name="title"]');
    const descriptionInput = seoForm.querySelector('textarea[name="description"]');
    const keywordsInput = seoForm.querySelector('textarea[name="keywords"]');
    
    // Load initial data
    updateSEOFields(seoSettings['home']);
    
    // Handle page selection changes
    pageSelector.addEventListener('change', function() {
        const selectedPage = this.value;
        updateSEOFields(seoSettings[selectedPage] || { title: '', description: '', keywords: '' });
    });
    
    // Handle form submission
    seoForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const selectedPage = pageSelector.value;
        
        // In a real implementation, this would save to a database
        seoSettings[selectedPage] = {
            title: titleInput.value,
            description: descriptionInput.value,
            keywords: keywordsInput.value
        };
        
        alert('SEO settings saved successfully!');
    });
    
    function updateSEOFields(settings) {
        titleInput.value = settings.title || '';
        descriptionInput.value = settings.description || '';
        keywordsInput.value = settings.keywords || '';
    }
}