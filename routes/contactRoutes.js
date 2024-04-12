const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Define routes for contact management
router.post('/', contactController.createContact);
router.get('/', contactController.getAllContacts);
router.get('/:id', contactController.getContactById);
router.put('/:id', contactController.updateContact);
module.exports = router;
