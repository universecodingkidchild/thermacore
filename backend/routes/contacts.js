const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Initialize contacts file if it doesn't exist
if (!fs.existsSync(CONTACTS_FILE)) {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify([]));
}

// Helper function to read contacts
const readContacts = () => {
    try {
        const data = fs.readFileSync(CONTACTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading contacts:', err);
        return [];
    }
};

// Helper function to save contacts
const saveContacts = (contacts) => {
    try {
        fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
    } catch (err) {
        console.error('Error saving contacts:', err);
    }
};

// Get all contacts (newest first)
router.get('/', (req, res) => {
    const contactsPath = path.join(__dirname, '../data/contacts.json');
    console.log(`Attempting to read contacts from: ${contactsPath}`); // Debug path

    // Create file if missing
    if (!fs.existsSync(contactsPath)) {
        console.log("Contacts file not found - creating new empty file"); // Debug log
        try {
            fs.writeFileSync(contactsPath, '[]', 'utf8');
            console.log("Successfully created new empty contacts file"); // Debug log
            return res.json([]);
        } catch (writeError) {
            console.error("Failed to create contacts file:", writeError); // Debug log
            return res.status(500).json({
                error: 'Failed to initialize contacts storage',
                details: process.env.NODE_ENV === 'development' ? writeError.message : undefined
            });
        }
    }

    try {
        console.log("Reading contacts file..."); // Debug log
        const data = fs.readFileSync(contactsPath, 'utf8');
        console.log("Raw file content:", data.length > 100 ? `${data.substring(0, 100)}...` : data); // Debug log (truncated if long)

        let contacts = [];
        if (data.trim() !== '') {
            contacts = JSON.parse(data);
            if (!Array.isArray(contacts)) {
                console.error("Contacts data is not an array - resetting file"); // Debug log
                contacts = [];
                fs.writeFileSync(contactsPath, '[]', 'utf8');
            }
        }

        console.log(`Returning ${contacts.length} contacts`); // Debug log
        res.json(contacts.reverse());

    } catch (err) {
        console.error('Error processing contacts:', err); // Debug log
        try {
            // Attempt to reset corrupted file
            fs.writeFileSync(contactsPath, '[]', 'utf8');
            console.log("Reset corrupted contacts file"); // Debug log
            res.json([]);
        } catch (writeError) {
            console.error("Failed to reset contacts file:", writeError); // Debug log
            res.status(500).json({
                error: 'Failed to load contacts',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }
});
// Get single contact by ID
router.get('/filter', (req, res) => {
    try {
        const { status, search } = req.query;
        const contactsPath = path.join(__dirname, '../data/contacts.json');

        if (!fs.existsSync(contactsPath)) {
            return res.json([]);
        }

        const data = fs.readFileSync(contactsPath, 'utf8');
        let contacts = JSON.parse(data);

        // Apply filters
        if (status && status !== 'all') {
            contacts = contacts.filter(contact => contact.status === status);
        }

        if (search) {
            const searchTerm = search.toLowerCase();
            contacts = contacts.filter(contact =>
                (contact.name && contact.name.toLowerCase().includes(searchTerm)) ||
                (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
                (contact.subject && contact.subject.toLowerCase().includes(searchTerm)) ||
                (contact.message && contact.message.toLowerCase().includes(searchTerm))
            );
        }

        res.json(contacts.reverse()); // Newest first
    } catch (err) {
        console.error('Error filtering contacts:', err);
        res.status(500).json({ error: 'Failed to filter contacts' });
    }
});
router.get('/:id', (req, res) => {
    try {
        const contacts = readContacts();
        const contact = contacts.find(c => c.id === req.params.id);

        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        res.json(contact);
    } catch (err) {
        console.error('Error fetching contact:', err);
        res.status(500).json({ error: 'Failed to fetch contact' });
    }
});

// Get filtered contacts
router.get('/filter', (req, res) => {
    try {
        const { status, search } = req.query;
        let contacts = readContacts();

        // Filter by status if provided
        if (status && status !== 'all') {
            contacts = contacts.filter(contact => contact.status === status);
        }

        // Filter by search term if provided
        if (search) {
            const searchTerm = search.toLowerCase();
            contacts = contacts.filter(contact =>
                contact.name.toLowerCase().includes(searchTerm) ||
                contact.email.toLowerCase().includes(searchTerm) ||
                contact.subject.toLowerCase().includes(searchTerm) ||
                (contact.message && contact.message.toLowerCase().includes(searchTerm))
            );
        }

        // Return newest first
        res.json(contacts.reverse());
    } catch (err) {
        console.error('Error filtering contacts:', err);
        res.status(500).json({ error: 'Failed to filter contacts' });
    }
});

// Update contact status
router.put('/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const contacts = readContacts();
        const contactIndex = contacts.findIndex(c => c.id === id);

        if (contactIndex === -1) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        contacts[contactIndex].status = status;
        contacts[contactIndex].updatedAt = new Date().toISOString();
        saveContacts(contacts);

        res.json(contacts[contactIndex]);
    } catch (err) {
        console.error('Error updating contact status:', err);
        res.status(500).json({ error: 'Failed to update contact status' });
    }
});

// Delete contact
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const contacts = readContacts();
        const filteredContacts = contacts.filter(c => c.id !== id);

        if (contacts.length === filteredContacts.length) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        saveContacts(filteredContacts);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting contact:', err);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
});

module.exports = router;