// routes/admin.js
const express = require('express');
const router = express.Router();
const Estimate = require('../models/Estimate');

// routes/admin.js
router.get('/estimates/:id', async (req, res) => {
    try {
        const estimate = await Estimate.findById(req.params.id); 
        if (!estimate) {
            return res.status(404).json({ error: "Not found" }); // ← Must return JSON
        }
        res.json(estimate); // ← Critical that this is JSON
    } catch (error) {
        res.status(500).json({ error: error.message }); // ← Must be JSON
    }
});

module.exports = router;