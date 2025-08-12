const express = require('express');
const router = express.Router();

// Enrollment routes will be implemented here
router.get('/', (req, res) => {
  res.json({ message: 'Enrollments endpoint - Implementation in progress' });
});

module.exports = router;
