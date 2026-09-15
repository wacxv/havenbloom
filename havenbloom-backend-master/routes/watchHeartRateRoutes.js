const express = require('express');
const router = express.Router();
const watchHeartRateController = require('../controllers/watchHeartRateController');

router.post('/', watchHeartRateController.createWatchHeartRate);
router.get('/', watchHeartRateController.getAllWatchHeartRates);
router.get('/:id', watchHeartRateController.getWatchHeartRate);
router.put('/:id', watchHeartRateController.updateWatchHeartRate);
router.delete('/:id', watchHeartRateController.deleteWatchHeartRate);

module.exports = router;