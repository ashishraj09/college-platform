// Helper function to check if enrollment is currently open for a user
const isEnrollmentOpen = async (user) => {
  if (!user || !user.degree_id || !user.current_semester) {
    return false;
  }
  
  try {
    const { Degree } = require('../models');
    const degree = await Degree.findByPk(user.degree_id);
    
    if (!degree) {
      return false;
    }
    
    const semesterStr = user.current_semester.toString();
    const semesterConfig = degree.courses_per_semester?.[semesterStr];
    
    if (!semesterConfig || !semesterConfig.enrollment_start || !semesterConfig.enrollment_end) {
      return false;
    }
    
    const now = new Date();
    const startDate = new Date(semesterConfig.enrollment_start);
    const endDate = new Date(semesterConfig.enrollment_end);
    
    return now >= startDate && now <= endDate;
  } catch (error) {
    console.error('Error checking enrollment window:', error);
    return false;
  }
};

module.exports = { isEnrollmentOpen };