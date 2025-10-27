
const express = require('express');
const router = express.Router();
const { Course, Degree, User } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');

// Helper: check if user is admin, HOD, or creator
async function canModifyCollaborators(req, entity, entityType) {
  const user = req.user;
  if (!user) return false;
  if (user.user_type === 'admin') return true;
  if (user.user_type === 'faculty' && user.is_head_of_department) return true;
  if (entity.created_by && entity.created_by === user.id) return true;
  return false;
}

// Helper: check if user is in same department
function isSameDepartment(user, entity) {
  return (
    user.department_code &&
    entity.department_code &&
    user.department_code.toUpperCase() === entity.department_code.toUpperCase()
  );
}

// Add collaborator to course
router.post('/course/:courseId/add', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const { userId } = req.body;
  const course = await Course.findByPk(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const user = await User.findByPk(userId);
  if (!user || user.user_type !== 'faculty') return res.status(400).json({ error: 'Invalid faculty user' });
  if (!isSameDepartment(user, course)) return res.status(400).json({ error: 'Faculty must be in same department' });
  if (!(await canModifyCollaborators(req, course, 'course'))) return res.status(403).json({ error: 'Not authorized' });
  await course.addCollaborator(user);
  res.json({ success: true });
});

// Remove collaborator from course
router.post('/course/:courseId/remove', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const { userId } = req.body;
  const course = await Course.findByPk(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const user = await User.findByPk(userId);
  if (!user) return res.status(400).json({ error: 'Invalid user' });
  if (!(await canModifyCollaborators(req, course, 'course'))) return res.status(403).json({ error: 'Not authorized' });
  await course.removeCollaborator(user);
  res.json({ success: true });
});

// Add collaborator to degree
router.post('/degree/:degreeId/add', authenticateToken, async (req, res) => {
  const { degreeId } = req.params;
  const { userId } = req.body;
  const degree = await Degree.findByPk(degreeId);
  if (!degree) return res.status(404).json({ error: 'Degree not found' });
  const user = await User.findByPk(userId);
  if (!user || user.user_type !== 'faculty') return res.status(400).json({ error: 'Invalid faculty user' });
  if (!isSameDepartment(user, degree)) return res.status(400).json({ error: 'Faculty must be in same department' });
  if (!(await canModifyCollaborators(req, degree, 'degree'))) return res.status(403).json({ error: 'Not authorized' });
  await degree.addCollaborator(user);
  res.json({ success: true });
});

// Remove collaborator from degree
router.post('/degree/:degreeId/remove', authenticateToken, async (req, res) => {
  const { degreeId } = req.params;
  const { userId } = req.body;
  const degree = await Degree.findByPk(degreeId);
  if (!degree) return res.status(404).json({ error: 'Degree not found' });
  const user = await User.findByPk(userId);
  if (!user) return res.status(400).json({ error: 'Invalid user' });
  if (!(await canModifyCollaborators(req, degree, 'degree'))) return res.status(403).json({ error: 'Not authorized' });
  await degree.removeCollaborator(user);
  res.json({ success: true });
});

// Get collaborators for a degree
router.get('/degree/:degreeId', authenticateToken, async (req, res) => {
  const { degreeId } = req.params;
  const degree = await Degree.findByPk(degreeId, {
    include: [{ model: User, as: 'collaborators', attributes: { exclude: ['password'] } }]
  });
  if (!degree) return res.status(404).json({ error: 'Degree not found' });
  res.json({ collaborators: degree.collaborators || [] });
});

// Get collaborators for a course
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const course = await Course.findByPk(courseId, {
    include: [{ model: User, as: 'collaborators', attributes: { exclude: ['password'] } }]
  });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json({ collaborators: course.collaborators || [] });
});

module.exports = router;
