const express = require('express');
const router = express.Router();
const controller = require('../controllers/fetalHeartRateController');

router.post('/', controller.createFetalHeartRate);
router.get('/', controller.getAllFetalHeartRates);
router.get('/:id', controller.getFetalHeartRate);
router.put('/:id', controller.updateFetalHeartRate);
router.delete('/:id', controller.deleteFetalHeartRate);

module.exports = router;