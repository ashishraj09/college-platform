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
      const Enrollment = await models.Enrollment();
      const Course = await models.Course();
      const User = await models.User();
      const Degree = await models.Degree();
      const Department = await models.Department();

      // Helper: Build filter for each user type
      function buildFilter(user, query) {
        const { status, semester, student_id, department_code } = query;
        let filter = {};
        if (user.user_type === 'admin') {
          if (student_id) filter.student_id = student_id;
          filter.semester = semester || user.current_semester;
          if (status) filter.enrollment_status = Array.isArray(status) ? { [Op.in]: status } : status;
        } else if (user.is_head_of_department) {
          if (status) {
            filter.enrollment_status = Array.isArray(status) ? { [Op.in]: status } : status;
          }
          if (semester) filter.semester = semester;
        } else {
          filter.student_id = user.id;
          // Only filter by semester if explicitly provided
          if (semester) filter.semester = semester;
          if (status) filter.enrollment_status = Array.isArray(status) ? { [Op.in]: status } : status;
        }
        return filter;
      }

      // Helper: Filter enrollments for HOD by department
      async function filterHODDepartment(enrollments, user, query) {
        let deptCode = query.department_code;
        if (!deptCode && user.department_id) {
          const dept = await Department.findOne({ where: { id: user.department_id } });
          if (dept) deptCode = dept.code;
        }
        if (deptCode) {
          return enrollments.filter(e => e.department_code === deptCode);
        } else {
          const students = await User.findAll({ where: { department_id: user.department_id } });
          const studentIds = students.map(s => s.id);
          return enrollments.filter(e => studentIds.includes(e.student_id));
        }
      }

      // Helper: Search filter for HOD
      async function filterHODSearch(enrollments, query) {
        const search = query.search;
        if (!search) return enrollments;
        const studentIdSet = new Set(enrollments.map(e => e.student_id));
        const searchStudents = await User.findAll({
          where: {
            id: { [Op.in]: Array.from(studentIdSet) },
            [Op.or]: [
              { first_name: { [Op.iLike]: `%${search}%` } },
              { last_name: { [Op.iLike]: `%${search}%` } },
              { student_id: { [Op.iLike]: `%${search}%` } }
            ]
          }
        });
        const matchedIds = new Set(searchStudents.map(s => s.id));
        return enrollments.filter(e => matchedIds.has(e.student_id));
      }

      // Helper: Attach course and student info
      async function shapeEnrollment(enrollment, userType) {
        const courseCodes = enrollment.course_codes || [];
        const coursesRaw = await Course.findAll({
          where: { code: { [Op.in]: courseCodes } },
          attributes: ['id', 'name', 'code', 'credits']
        });
        // Map to unique course per code (first match)
        const codeToCourse = {};
        for (const course of coursesRaw) {
          if (!codeToCourse[course.code]) {
            codeToCourse[course.code] = course;
          }
        }
        const courses = courseCodes.map(code => codeToCourse[code]).filter(Boolean);
        let shaped = {
          ...enrollment.get({ plain: true }),
          courses: courses.map(course => ({ id: course.id, name: course.name, code: course.code, credits: course.credits }))
        };
        // For students, do NOT include any other course arrays
        if (userType === 'hod') {
          const student = await User.findOne({
            where: { id: enrollment.student_id },
            attributes: ['id', 'first_name', 'last_name', 'student_id', 'degree_id']
          });
          let degree = null;
          if (student && student.degree_id) {
            degree = await Degree.findOne({ where: { id: student.degree_id }, attributes: ['id', 'name', 'code'] });
          }
          shaped.student = {
            id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            student_id: student.student_id,
            degree: degree ? { id: degree.id, name: degree.name, code: degree.code } : undefined
          };
        }
        // Remove any other course arrays for students (future-proof)
        if (userType === 'student') {
          delete shaped.all_courses;
          delete shaped.semester_courses;
        }
        return shaped;
      }

      // Main logic
      const filter = buildFilter(req.user, req.query);
      let enrollments = await Enrollment.findAll({
        where: filter,
        order: [['created_at', 'DESC']]
      });

      // HOD department and search filters
      if (req.user.is_head_of_department) {
        enrollments = await filterHODDepartment(enrollments, req.user, req.query);
        enrollments = await filterHODSearch(enrollments, req.query);
      }

      // Pagination for HOD/admin
      let page = parseInt(req.query.page, 10) || 1;
      let limit = parseInt(req.query.limit, 10) || 20;
      let total = enrollments.length;
      let pages = Math.ceil(total / limit);
      if (req.user.is_head_of_department || req.user.user_type === 'admin') {
        enrollments = enrollments.slice((page - 1) * limit, page * limit);
      }

      // Shape enrollments
      let shapedEnrollments = [];
      if (req.user.is_head_of_department || req.user.user_type === 'admin') {
        for (const enrollment of enrollments) {
          shapedEnrollments.push(await shapeEnrollment(enrollment, 'hod'));
        }
        res.json({
          enrollments: shapedEnrollments,
          pagination: { total, page, limit, pages }
        });
      } else {
        // For students, always include 'courses' in response
        for (const enrollment of enrollments) {
          shapedEnrollments.push(await shapeEnrollment(enrollment, 'student'));
        }
        res.json(shapedEnrollments);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
  }
);

// UPDATED: Get enrollment draft for current semester (doesn't create automatically)
router.get('/draft',
  authenticateToken,
  require('../middleware/audit').auditMiddleware('read', 'enrollment', 'Fetched enrollment draft'),
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
  require('../middleware/audit').auditMiddleware('update', 'enrollment', 'Enrollment draft saved'),
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
        // Ensure course_codes are codes
        const course_codes_clean = Array.from(new Set(course_codes));
        draft = await Enrollment.create({
          student_id: req.user.id,
          academic_year: academicYear,
          semester: req.user.current_semester,
          course_codes: course_codes_clean,
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

      // Add message to Message table if provided
      const Message = require('../models/Message');
      if (req.body.message) {
        await Message.create({
          type: 'enrollment',
          reference_id: draft.id,
          sender_id: req.user.id,
          message: req.body.message,
        });
      }
  res.json({ message: 'Draft saved successfully', draft: draftPlain, id: draft.id });
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
  require('../middleware/audit').auditMiddleware('update', 'enrollment', 'Enrollment draft submitted'),
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
        const course_codes_clean = Array.from(new Set(req.body.course_codes));
        const courses = await Course.findAll({
          where: {
            code: { [Op.in]: course_codes_clean }
          }
        });
        if (courses.length !== course_codes_clean.length) {
          return res.status(400).json({ error: 'One or more course codes are invalid', found: courses.map(c => c.code), requested: course_codes_clean });
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
          course_codes: course_codes_clean,
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
        submitted_at: new Date()
      });

      // Add message to Message table if provided
      const Message = require('../models/Message');
      if (req.body.message) {
        await Message.create({
          type: 'enrollment',
          reference_id: draft.id,
          sender_id: req.user.id,
          message: req.body.message,
        });
      }

      // Send email to HOD for approval and confirmation to student
      try {
        const { sendEnrollmentApprovalEmail, sendEnrollmentStatusEmail } = require('../utils/email');
        const Department = await models.Department();
        const Degree = await models.Degree();
        const User = await models.User();
        let hodUser = null;
        let department = null;
        let degree = null;
        // Always use department_code from enrollment record for HOD lookup
        let deptCode = draft.department_code || null;
        if (deptCode) {
          department = await Department.findOne({ where: { code: deptCode } });
          if (department) {
            hodUser = await User.findOne({ where: { department_id: department.id, is_head_of_department: true } });
          }
        }
        // Attach student and course info for emails
        const student = await User.findOne({ where: { id: draft.student_id } });
        if (student && student.degree_id) {
          degree = await Degree.findOne({ where: { code: student.degree_code } });
        }
        // Deduplicate course codes before querying
  const courseCodes = Array.from(new Set(draft.course_codes || []));
  const Course = await models.Course();
  const courses = await Course.findAll({ where: { code: { [Op.in]: courseCodes } } });
  const courseList = courses.map(c => `${c.name} (${c.code})`);
        // Send to HOD
        if (hodUser && hodUser.email) {
          await sendEnrollmentApprovalEmail({
            ...draft.get({ plain: true }),
            student,
            degree,
            department,
            courseList
          }, hodUser, true);
        } else {
          console.warn('No HOD user found or HOD user missing email for department:', department ? department.code : null);
        }
        // Send confirmation to student
        // Prepare deduplicated course details for email
        const coursesDeduped = [];
        const seenCodes = new Set();
        for (const c of courses) {
          if (!seenCodes.has(c.code)) {
            coursesDeduped.push({ name: c.name, code: c.code, credits: c.credits });
            seenCodes.add(c.code);
          }
        }
        // Ensure department and degree name/code are passed
        const departmentName = department ? department.name : '';
        const departmentCode = department ? department.code : '';
        const degreeName = degree ? degree.name : '';
        const degreeCode = degree ? degree.code : '';
        await sendEnrollmentStatusEmail({
          student,
          enrollment: draft,
          courses: coursesDeduped,
          degree: { name: degreeName, code: degreeCode },
          department: { name: departmentName, code: departmentCode },
          status: draft.enrollment_status === 'change_requested' ? 'Change Requested' : draft.enrollment_status,
          hod: hodUser || {},
          rejection_reason: draft.rejection_reason || '',
        });
      } catch (emailErr) {
        console.error('Failed to send enrollment approval/confirmation email:', emailErr);
      }

      res.json({ message: 'Enrollment submitted for HOD approval', id: draft.id });
    } catch (error) {
      console.error('Error submitting enrollment:', error);
      res.status(500).json({ error: 'Failed to submit enrollment' });
    }
  }
);


module.exports = router;