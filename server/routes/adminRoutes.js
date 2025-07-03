const express = require('express');
const { getBusinessData, saveBusinessData } = require('../controllers/adminController');

const router = express.Router();

router.get('/business-data', getBusinessData);
router.post('/business-data', saveBusinessData);

module.exports = router;
