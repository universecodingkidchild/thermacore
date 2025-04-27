const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const Estimate = require('../models/Estimate');

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token === process.env.ADMIN_TOKEN) {
        next();
    } else {
        res.status(403).json({ error: 'Unauthorized' });
    }
};

// Delete ALL Contacts
router.delete('/contacts/all', verifyAdmin, async (req, res) => {
    try {
        const { deletedCount } = await Contact.deleteMany({});
        res.json({ success: true, deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete ALL Estimates
router.delete('/estimates/all', verifyAdmin, async (req, res) => {
    try {
        const { deletedCount } = await Estimate.deleteMany({});
        res.json({ success: true, deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;