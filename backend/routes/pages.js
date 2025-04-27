const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const slugify = require('slugify');
const fs = require('fs');
const path = require('path');

// In-memory database (replace with real database in production)
let pages = [];
const PAGES_FILE = path.join(__dirname, '../data/pages.json');

// Load pages from file
try {
    const data = fs.readFileSync(PAGES_FILE, 'utf8');
    pages = JSON.parse(data);
} catch (err) {
    console.error('Error loading pages data:', err);
    pages = [];
}

// Helper function to save pages to file
const savePages = () => {
    fs.writeFileSync(PAGES_FILE, JSON.stringify(pages, null, 2), 'utf8');
};

// Middleware to validate page data
const validatePage = [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('slug').trim().notEmpty().withMessage('Slug is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('status').isIn(['published', 'draft', 'archived']).withMessage('Invalid status'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Get all pages
router.get('/', (req, res) => {
    try {
        res.json(pages);
    } catch (err) {
        console.error('Error fetching pages:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get filtered pages
router.get('/filter', (req, res) => {
    try {
        const { status, search } = req.query;
        let filteredPages = [...pages];

        if (status && status !== 'all') {
            filteredPages = filteredPages.filter(page => page.status === status);
        }

        if (search) {
            const searchTerm = search.toLowerCase();
            filteredPages = filteredPages.filter(page =>
                page.title.toLowerCase().includes(searchTerm) ||
                page.slug.toLowerCase().includes(searchTerm)
            );
        }

        res.json(filteredPages);
    } catch (err) {
        console.error('Error filtering pages:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single page by ID
router.get('/:id', (req, res) => {
    try {
        const page = pages.find(p => p.id === req.params.id);
        if (!page) {
            return res.status(404).json({ error: 'Page not found' });
        }
        res.json(page);
    } catch (err) {
        console.error('Error fetching page:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new page
router.post('/', validatePage, (req, res) => {
    try {
        const { title, slug, content, status, metaTitle, metaDescription } = req.body;

        // Check if slug already exists
        const slugExists = pages.some(page => page.slug === slug);
        if (slugExists) {
            return res.status(400).json({ error: 'Slug already exists' });
        }

        const newPage = {
            id: Date.now().toString(),
            title,
            slug,
            content,
            status,
            metaTitle: metaTitle || title,
            metaDescription: metaDescription || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        pages.push(newPage);
        savePages();

        res.status(201).json(newPage);
    } catch (err) {
        console.error('Error creating page:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update page
router.put('/:id', validatePage, (req, res) => {
    try {
        const { id } = req.params;
        const { title, slug, content, status, metaTitle, metaDescription } = req.body;

        const pageIndex = pages.findIndex(p => p.id === id);
        if (pageIndex === -1) {
            return res.status(404).json({ error: 'Page not found' });
        }

        // Check if slug already exists (excluding current page)
        const slugExists = pages.some(page => page.slug === slug && page.id !== id);
        if (slugExists) {
            return res.status(400).json({ error: 'Slug already exists' });
        }

        const updatedPage = {
            ...pages[pageIndex],
            title,
            slug,
            content,
            status,
            metaTitle: metaTitle || title,
            metaDescription: metaDescription || '',
            updatedAt: new Date().toISOString()
        };

        pages[pageIndex] = updatedPage;
        savePages();

        res.json(updatedPage);
    } catch (err) {
        console.error('Error updating page:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete page
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const pageIndex = pages.findIndex(p => p.id === id);

        if (pageIndex === -1) {
            return res.status(404).json({ error: 'Page not found' });
        }

        pages.splice(pageIndex, 1);
        savePages();

        res.json({ message: 'Page deleted successfully' });
    } catch (err) {
        console.error('Error deleting page:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate slug from title
router.post('/generate-slug', (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const slug = slugify(title, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g
        });

        res.json({ slug });
    } catch (err) {
        console.error('Error generating slug:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;