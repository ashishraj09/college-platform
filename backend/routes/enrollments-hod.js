const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const { Enrollment, Course, User, Department, Degree } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { isEnrollmentOpen } = require('../utils/enrollment');

// HOD endpoints for enrollment approval
router.get('/pending-approvals',
  authenticateToken,
  async (req, res) => {
    try {
      // Check if user is a head of department
      if (!req.user.is_head_of_department) {
        return res.status(403).json({ error: 'Only department heads can view pending approvals' });
      }

      const { degree_id, semester, search } = req.query;

      const whereClause = {
        enrollment_status: 'pending_hod_approval'
      };
      
      // Add semester filter to the where clause if provided
      if (semester) {
        whereClause.semester = parseInt(semester);
      }

      const includeClause = [
        {
          model: User,
          as: 'student',
          where: {
            department_id: req.user.department_id
          },
          include: [
            {
              model: Degree,
              as: 'degree',
              ...(degree_id && { where: { id: degree_id } })
            }
          ]
        }
        // Removed Course association as we now use course_ids JSON array
      ];

      // Add search filter if provided
      if (search) {
        includeClause[0].where = {
          ...includeClause[0].where,
          [Op.or]: [
            { first_name: { [Op.iLike]: `%${search}%` } },
            { last_name: { [Op.iLike]: `%${search}%` } },
            { student_id: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }

      const pendingEnrollments = await Enrollment.findAll({
        where: whereClause,
        include: includeClause,
        order: [
          ['createdAt', 'ASC'],
          [{ model: User, as: 'student' }, 'first_name', 'ASC']
        ]
      });

      // After fetching enrollments, we need to get course details separately
      // since we're using course_ids JSON field instead of direct association
      const enrichedEnrollments = await Promise.all(pendingEnrollments.map(async (enrollment) => {
        const enrollmentJson = enrollment.toJSON();
        
        // Get courses for this enrollment
        const courses = await Course.findAll({
          where: { id: { [Op.in]: enrollmentJson.course_ids || [] } }
        });
        
        return {
          ...enrollmentJson,
          courses: courses
        };
      }));

      // Group by student and academic year/semester
      const groupedEnrollments = enrichedEnrollments.reduce((acc, enrollment) => {
        const key = `${enrollment.student.id}-${enrollment.academic_year}-${enrollment.semester}`;
        if (!acc[key]) {
          acc[key] = {
            student: enrollment.student,
            academic_year: enrollment.academic_year,
            semester: enrollment.semester,
            enrollments: []
          };
        }
        acc[key].enrollments.push(enrollment);
        return acc;
      }, {});

      res.json({
        pendingApprovals: Object.values(groupedEnrollments)
      });
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      res.status(500).json({ error: 'Failed to fetch pending approvals' });
    }
  }
);

// HOD approve/reject enrollment
router.post('/hod-decision',
  [
    body('enrollment_ids').isArray({ min: 1 }).withMessage('At least one enrollment must be selected'),
    body('enrollment_ids.*').isUUID().withMessage('Invalid enrollment ID'),
    body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
    body('rejection_reason').optional().isLength({ min: 1 }).withMessage('Rejection reason required when rejecting'),
    handleValidationErrors
  ],
  authenticateToken,
  async (req, res) => {
    try {
      // Check if user is a head of department
      if (!req.user.is_head_of_department) {
        return res.status(403).json({ error: 'Only department heads can approve or reject enrollments' });
      }

      const { enrollment_ids, action, rejection_reason } = req.body;

      const updateData = {
        hod_approved_at: new Date(),
        hod_approved_by: req.user.id
      };

      if (action === 'approve') {
        updateData.enrollment_status = 'approved';
      } else {
        updateData.enrollment_status = 'rejected';
        updateData.rejection_reason = rejection_reason;
      }

      await Enrollment.update(updateData, {
        where: {
          id: { [Op.in]: enrollment_ids },
          enrollment_status: 'pending_hod_approval'
        }
      });

      res.json({ 
        message: `Enrollments ${action}${action === 'approve' ? 'd' : 'ed'} successfully` 
      });
    } catch (error) {
      console.error('Error processing HOD decision:', error);
      res.status(500).json({ error: 'Failed to process decision' });
    }
  }
);

module.exports = router;