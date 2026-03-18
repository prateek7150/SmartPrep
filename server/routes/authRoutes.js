

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

console.log("--- AUTH DEBUG ---");
console.log("Register type:", typeof authController.register);
console.log("Login type:", typeof authController.login);
console.log("Router type (internal):", typeof router);

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;