const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const estimateService = require('../services/estimateService');

// File system data handlers
const getEstimates = async () => {
    const filePath = path.join(__dirname, '../data/estimates.json');
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
};

const saveEstimates = async (estimates) => {
    const filePath = path.join(__dirname, '../data/estimates.json');
    await fs.writeFile(filePath, JSON.stringify(estimates, null, 2));
};

// Delete ALL Estimates
router.delete('/estimates/all', async (req, res) => {
    try {
        await fs.writeFile(
            path.join(__dirname, '../data/estimates.json'),
            '[]',
            'utf8'
        );
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: "Failed to delete estimates" });
    }
});

// Delete ALL Contacts
router.delete('/contacts/all', async (req, res) => {
    try {
        await fs.writeFile(
            path.join(__dirname, '../data/contacts.json'),
            '[]',
            'utf8'
        );
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: "Failed to delete contacts" });
    }
});

// Get single estimate (updated for JSON storage)
router.get('/estimates/:id', async (req, res) => {
    try {
        const estimates = await getEstimates();
        const estimate = estimates.find(e => e.id === req.params.id);

        if (!estimate) {
            return res.status(404).json({ error: "Not found" });
        }
        res.json(estimate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new estimate (unchanged)
router.post('/estimates', (req, res) => {
    const newEstimate = estimateService.createEstimate(req.body);
    res.status(201).json(newEstimate);
});

module.exports = router;