const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/login', userController.loginUser);
router.post('/register', userController.registerUser);
router.patch('/:id/password', userController.updatePasswordById);
router.get('/:id', userController.getUserById);

module.exports = router;
