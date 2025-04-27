// backend/services/estimateService.js
const estimates = {}; // This acts as our temporary "database"

module.exports = {
    getAllEstimates: () => Object.values(estimates),
    getEstimateById: (id) => estimates[id],
    createEstimate: (data) => {
        const newId = `est${Date.now()}`;
        estimates[newId] = { id: newId, ...data };
        return estimates[newId];
    }
};