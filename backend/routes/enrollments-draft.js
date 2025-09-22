const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const models = require('../utils/models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { isEnrollmentOpen } = require('../utils/enrollment');

// Save enrollment as draft (replaces the EnrollmentDraft functionality)
router.post('/save-draft',
  [
    body('course_ids').isArray().withMessage('Course IDs must be an array'),
    body('course_ids.*').isUUID().withMessage('Invalid course ID'),
    body('academic_year').matches(/^\d{4}-\d{4}$/).withMessage('Academic year must be in format YYYY-YYYY'),
    body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
    handleValidationErrors
  ],
  authenticateToken,
  async (req, res) => {
    try {
      const { course_ids, academic_year, semester } = req.body;
      // Check if enrollment window is open
      const enrollmentOpen = await isEnrollmentOpen(req.user);
      if (!enrollmentOpen) {
        return res.status(400).json({ 
          error: 'Enrollment window is currently closed. Please check back during the enrollment period.' 
        });
      }

      // Get Enrollment model via async getter
      const Enrollment = await require('../utils/models').Enrollment();

      // Check for existing draft enrollment for this semester/year
      let enrollment;
      const existingDraft = await Enrollment.findOne({
        where: {
          student_id: req.user.id,
          academic_year,
          semester,
          enrollment_status: 'draft'
        }
      });

      if (existingDraft) {
        // Update existing draft
        await existingDraft.update({ course_ids });
        enrollment = existingDraft;
      } else {
        // Create a new draft enrollment
        enrollment = await Enrollment.create({
          student_id: req.user.id,
          academic_year,
          semester,
          course_ids,
          enrollment_status: 'draft'
        });
      }

      res.json({ 
        message: 'Enrollment draft saved successfully', 
        enrollment 
      });
    } catch (error) {
      console.error('Error saving enrollment draft:', error);
      res.status(500).json({ error: 'Failed to save enrollment draft' });
    }
  }
);

// Get current enrollment draft
router.get('/draft',
  async (req, res) => {
    try {
      const { academic_year, semester } = req.query;
      // If no academic year/semester provided, use current
      const currentYear = new Date().getFullYear();
      const academicYearToUse = academic_year || `${currentYear}-${currentYear + 1}`;
      const semesterToUse = semester || req.user.current_semester;

      // Get models via async getter
      const Enrollment = await require('../utils/models').Enrollment();
      const Course = await require('../utils/models').Course();
      const Department = await require('../utils/models').Department();
      const Degree = await require('../utils/models').Degree();

      const draft = await Enrollment.findOne({
        where: {
          student_id: req.user.id,
          academic_year: academicYearToUse,
          semester: semesterToUse,
          enrollment_status: 'draft'
        },
        include: [
          {
            model: Course,
            as: 'course',
            include: [
              {
                model: Department,
                as: 'department',
                attributes: ['id', 'name', 'code']
              },
              {
                model: Degree,
                as: 'degree',
                attributes: ['id', 'name', 'code']
              }
            ]
          }
        ]
      });

      if (!draft) {
        // Return empty draft if none exists
        return res.json({
          student_id: req.user.id,
          academic_year: academicYearToUse,
          semester: semesterToUse,
          course_ids: [],
          enrollment_status: 'draft'
        });
      }

      res.json(draft);
    } catch (error) {
      console.error('Error fetching enrollment draft:', error);
      res.status(500).json({ error: 'Failed to fetch enrollment draft' });
    }
  }
);

// Submit draft enrollment for approval
router.post('/submit-draft',
  [
    body('draft_id').isUUID().withMessage('Invalid draft ID'),
    handleValidationErrors
  ],
  authenticateToken,
  async (req, res) => {
    try {
      const { draft_id } = req.body;
      // Check if enrollment window is open
      const enrollmentOpen = await isEnrollmentOpen(req.user);
      if (!enrollmentOpen) {
        return res.status(400).json({ 
          error: 'Enrollment window is currently closed. Please check back during the enrollment period.' 
        });
      }

      // Get Enrollment model via async getter
      const Enrollment = await require('../utils/models').Enrollment();

      // Get the draft enrollment
      const draft = await Enrollment.findOne({
        where: {
          id: draft_id,
          student_id: req.user.id,
          enrollment_status: 'draft'
        }
      });

      if (!draft) {
        return res.status(404).json({ error: 'Draft not found or already submitted' });
      }

      if (!draft.course_ids || draft.course_ids.length === 0) {
        return res.status(400).json({ error: 'No courses selected' });
      }

      // Check if student already has an active enrollment request
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      const existingActive = await Enrollment.findOne({
        where: {
          student_id: req.user.id,
          academic_year: academicYear,
          semester: req.user.current_semester,
          enrollment_status: 'pending_hod_approval'
        }
      });

      if (existingActive) {
        return res.status(400).json({ 
          error: 'You already have an active enrollment request pending approval. Please wait for it to be processed before submitting a new request.'
        });
      }

      // Submit the draft for HOD approval
      await draft.update({
        enrollment_status: 'pending_hod_approval',
        // Clear any previous rejection reasons if this was rejected before
        rejection_reason: null,
        hod_approved_by: null,
        hod_approved_at: null,
        office_approved_by: null,
        office_approved_at: null
      });

      res.json({ 
        message: 'Enrollment submitted for approval',
        enrollment: draft
      });
    } catch (error) {
      console.error('Error submitting enrollment draft:', error);
      res.status(500).json({ error: 'Failed to submit enrollment draft' });
    }
  }
);

module.exports = router;