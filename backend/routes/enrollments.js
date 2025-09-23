const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const models = require('../utils/models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { isEnrollmentOpen } = require('../utils/enrollment');

// Base route for all enrollments with flexible filtering
router.get('/',
  authenticateToken,
  async (req, res) => {
    try {
      const { status, semester, student_id } = req.query;
      const currentAcademicYear = req.user.enrolled_year || new Date().getFullYear();
      const Enrollment = await models.Enrollment();
      const Course = await models.Course();
      // Build where clause
      const whereClause = {};
      // If status is provided, filter by status
      if (status) {
        if (Array.isArray(status)) {
          whereClause.enrollment_status = { [Op.in]: status };
        } else {
          whereClause.enrollment_status = status;
        }
      }
      // Filter by student ID - default to current user if not an admin
      if (req.user.user_type === 'admin' && student_id) {
        whereClause.student_id = student_id;
      } else if (req.user.is_head_of_department) {
        // HOD: show all enrollments for their department
        // This requires a join, so we fetch all and filter below
      } else {
        whereClause.student_id = req.user.id;
      }
      // Add semester filter (default to user's current semester)
      if (semester) {
        whereClause.semester = semester;
      } else {
        whereClause.semester = req.user.current_semester;
      }
      let enrollments = await Enrollment.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });
      // If HOD, filter enrollments to only those in their department
      if (req.user.is_head_of_department) {
        const User = await models.User();
        const Degree = await models.Degree();
        // Get all students in HOD's department
        const students = await User.findAll({ where: { department_id: req.user.department_id } });
        const studentIds = students.map(s => s.id);
        enrollments = enrollments.filter(e => studentIds.includes(e.student_id));
      }
      // Process enrollments to include course details
      const enrollmentsWithCourses = [];
      for (const enrollment of enrollments) {
        // Get course details for all course_codes in the enrollment
        const courseCodes = enrollment.course_codes || [];
        const courses = await Course.findAll({
          where: {
            code: {
              [Op.in]: courseCodes
            }
          },
          attributes: ['id', 'name', 'code']
        });
        enrollmentsWithCourses.push({
          ...enrollment.get({ plain: true }),
          courses: courses.map(course => ({
            id: course.id,
            name: course.name,
            code: course.code
          }))
        });
      }
      res.json(enrollmentsWithCourses);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
  }
);

// UPDATED: Get enrollment draft for current semester (doesn't create automatically)
router.get('/draft',
  authenticateToken,
  async (req, res) => {
    try {
      const { Enrollment } = await models.getMany('Enrollment');

      let draft = await Enrollment.findOne({
        where: {
          student_id: req.user.id,
          semester: req.user.current_semester,
          enrollment_status: 'draft'
        }
      });

      // No longer automatically creating a draft
      if (!draft) {
        // Return empty object when no draft exists to simplify frontend handling
        return res.json({});
      }

      res.json({ exists: true, draft });
    } catch (error) {
      console.error('Error fetching enrollment draft:', error);
      res.status(500).json({ error: 'Failed to fetch enrollment draft' });
    }
  }
);

// UPDATED: Save enrollment draft (can be called multiple times)
router.put('/draft',
  [
    body('course_codes').isArray().withMessage('Course codes must be an array'),
    body('course_codes.*').isString().withMessage('Invalid course code'),
    handleValidationErrors
  ],
  authenticateToken,
  async (req, res) => {
    try {
      const { Enrollment, Course } = await models.getMany('Enrollment', 'Course');

      const { course_codes } = req.body;
      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;

      // Check if enrollment window is open
      const enrollmentOpen = await isEnrollmentOpen(req.user);
      if (!enrollmentOpen) {
        return res.status(400).json({ 
          error: 'Enrollment window is currently closed. Please check back during the enrollment period.' 
        });
      }

      // Validate course_codes
      const courses = await Course.findAll({
        where: {
          code: { [Op.in]: course_codes }
        }
      });

      // Deduplicate found codes
      const foundCodes = Array.from(new Set(courses.map(c => c.code)));
      const requestedCodes = Array.from(new Set(course_codes));
      // Compare sets
      if (foundCodes.length !== requestedCodes.length || !requestedCodes.every(code => foundCodes.includes(code))) {
        return res.status(400).json({ 
          error: 'One or more course codes are invalid for this degree program',
          found: foundCodes,
          requested: requestedCodes
        });
      }

      // Find or create draft
      let draft = await Enrollment.findOne({
        where: {
          student_id: req.user.id,
          academic_year: academicYear,
          semester: req.user.current_semester,
          enrollment_status: 'draft'
        }
      });

      if (!draft) {
        // Get department code from user
        let department_code = null;
        if (req.user.department_id) {
          const Department = await models.Department();
          const dept = await Department.findOne({ where: { id: req.user.department_id } });
          if (dept) department_code = dept.code;
        }
        draft = await Enrollment.create({
          student_id: req.user.id,
          academic_year: academicYear,
          semester: req.user.current_semester,
          course_codes: course_codes,
          enrollment_status: 'draft',
          department_code
        });
      } else {
        // Allow updates if:
        // 1. Status is draft, OR
        // 2. Previous submission was rejected (allow resubmission)
        const hasRejectedEnrollment = await Enrollment.findOne({
          where: {
            student_id: req.user.id,
            academic_year: academicYear,
            semester: req.user.current_semester,
            enrollment_status: 'rejected'
          }
        });

        if (draft.enrollment_status === 'draft' || hasRejectedEnrollment) {
          await draft.update({
            course_codes: course_codes,
            enrollment_status: 'draft' // Reset status for resubmission
          });
        } else {
          return res.status(400).json({ error: 'Cannot modify enrollment that is still under review' });
        }
      }

      // Add course_codes to response
      const draftPlain = draft.get({ plain: true });
      draftPlain.course_codes = course_codes;

      res.json({ message: 'Draft saved successfully', draft: draftPlain });
    } catch (error) {
      console.error('Error saving enrollment draft:', error);
      res.status(500).json({ error: 'Failed to save enrollment draft' });
    }
  }
);

// UPDATED: Submit enrollment draft to HOD
router.post('/draft/submit',
  [
    body('course_codes').optional().isArray().withMessage('Course codes must be an array'),
    body('course_codes.*').optional().isString().withMessage('Invalid course code'),
    handleValidationErrors
  ],
  authenticateToken,
  async (req, res) => {
    try {
      const { Enrollment, Course } = await models.getMany('Enrollment', 'Course');

      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;

      // Check if enrollment window is open
      const enrollmentOpen = await isEnrollmentOpen(req.user);
      if (!enrollmentOpen) {
        return res.status(400).json({ 
          error: 'Enrollment window is currently closed. Please check back during the enrollment period.' 
        });
      }

      // Check if student already has active enrollment requests
      const activeEnrollments = await Enrollment.findAll({
        where: {
          student_id: req.user.id,
          academic_year: academicYear,
          semester: req.user.current_semester,
          enrollment_status: ['pending_hod_approval', 'pending_office_approval']
        }
      });

      if (activeEnrollments.length > 0) {
        return res.status(400).json({ 
          error: 'You already have an active enrollment request pending approval. Please wait for it to be processed before submitting a new request.',
          activeEnrollments: activeEnrollments.length
        });
      }

      let draft = await Enrollment.findOne({
        where: {
          student_id: req.user.id,
          academic_year: academicYear,
          semester: req.user.current_semester,
          enrollment_status: 'draft'
        }
      });

      // If no draft, but course_codes are provided, create a draft
      if (!draft && req.body.course_codes) {
        // Validate course_codes
        const courses = await Course.findAll({
          where: {
            code: { [Op.in]: req.body.course_codes }
          }
        });
        if (courses.length !== req.body.course_codes.length) {
          return res.status(400).json({ error: 'One or more course codes are invalid', found: courses.map(c => c.code), requested: req.body.course_codes });
        }
        // Get department code from user
        let department_code = null;
        if (req.user.department_id) {
          const Department = await models.Department();
          const dept = await Department.findOne({ where: { id: req.user.department_id } });
          if (dept) department_code = dept.code;
        }
        draft = await Enrollment.create({
          student_id: req.user.id,
          academic_year: academicYear,
          semester: req.user.current_semester,
          course_codes: req.body.course_codes,
          enrollment_status: 'draft',
          department_code
        });
      }

      if (!draft) {
        return res.status(404).json({ error: 'No draft found and no course_codes provided' });
      }

      if (draft.enrollment_status !== 'draft') {
        return res.status(400).json({ error: 'This enrollment is not in draft status' });
      }

      if (!draft.course_codes || draft.course_codes.length === 0) {
        return res.status(400).json({ error: 'No courses selected' });
      }

      // Update enrollment record to pending_hod_approval status
      await draft.update({
        enrollment_status: 'pending_hod_approval',
        submitted_at: new Date(),
        rejection_reason: null // Clear any previous rejection reason
      });

      res.json({ message: 'Enrollment submitted for HOD approval' });
    } catch (error) {
      console.error('Error submitting enrollment:', error);
      res.status(500).json({ error: 'Failed to submit enrollment' });
    }
  }
);

// Get courses available for the student's degree
router.get('/my-degree-courses',
  authenticateToken,
  async (req, res) => {
    try {
      const { academic_year, semester } = req.query;
      
      if (!req.user.degree_id) {
        return res.status(400).json({ error: 'User does not have an assigned degree' });
      }

      // Load needed models
      const { Degree, Department, Course } = await models.getMany('Degree', 'Department', 'Course');

      // Get degree information
      const degree = await Degree.findByPk(req.user.degree_id, {
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name', 'code']
          }
        ]
      });

      if (!degree) {
        return res.status(404).json({ error: 'Degree not found' });
      }

      const whereClause = {
        degree_id: req.user.degree_id,
        status: 'active'
      };

      if (academic_year) whereClause.academic_year = academic_year;
      if (semester) whereClause.semester = semester;

      const courses = await Course.findAll({
        where: whereClause,
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name', 'code']
          }
        ],
        order: [['code', 'ASC']]
      });

      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;
      
      // Get semester-specific enrollment dates from degree configuration
      const semesterStr = req.user.current_semester.toString();
      const semesterConfig = degree.courses_per_semester?.[semesterStr];
      
      // Format the response to match the expected DegreeCourses structure
      const response = {
        degree: {
          id: degree.id,
          name: degree.name,
          code: degree.code,
          duration_years: degree.duration_years,
          courses_per_semester: degree.courses_per_semester,
          department: degree.department
        },
        student: {
          current_semester: req.user.current_semester,
          enrolled_year: req.user.enrolled_year
        },
        courses: courses,
        enrollment_start_at: semesterConfig?.enrollment_start || null,
        enrollment_end_at: semesterConfig?.enrollment_end || null
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching degree courses:', error);
      res.status(500).json({ error: 'Failed to fetch degree courses' });
    }
  }
);

// Get user's enrollments with optional status filter
router.get('/my-enrollments',
  authenticateToken,
  async (req, res) => {
    try {
      const { status, academic_year, semester } = req.query;
      const currentYear = new Date().getFullYear();
      const currentAcademicYear = `${currentYear}-${currentYear + 1}`;
      
      // Build where clause
      const whereClause = {
        student_id: req.user.id,
        academic_year: academic_year || currentAcademicYear,
        semester: semester || req.user.current_semester
      };
      
      // Add status filter if provided (can be a single status or an array)
      if (status) {
        if (Array.isArray(status)) {
          whereClause.enrollment_status = { [Op.in]: status };
        } else {
          whereClause.enrollment_status = status;
        }
      }
      
      const { Enrollment, Course } = await models.getMany('Enrollment', 'Course');

      const enrollments = await Enrollment.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });

      // Process enrollments to include course details
      const enrollmentsWithCourses = [];
      for (const enrollment of enrollments) {
        // Get course details for all course_ids in the enrollment
        const courseIds = enrollment.course_ids || [];
        const courses = await Course.findAll({
          where: {
            id: {
              [Op.in]: courseIds
            }
          },
          attributes: ['id', 'name', 'code']
        });

        // Create a new object with enrollment and course details
        enrollmentsWithCourses.push({
          ...enrollment.get({ plain: true }),
          courses: courses.map(course => ({
            id: course.id,
            name: course.name,
            code: course.code
          }))
        });
      }

      res.json({
        enrollments: enrollmentsWithCourses,
        count: enrollmentsWithCourses.length,
        hasActiveEnrollment: enrollmentsWithCourses.length > 0
      });
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
  }
);

module.exports = router;