const isEnrollmentOpen = async (user) => {
  // Accept either degree_id or degree_code
  const degreeId = user.degree_id;
  const degreeCode = user.degree_code;
  const semester = user.current_semester;

  if (!semester || (!degreeId && !degreeCode)) {
    console.log('isEnrollmentOpen: Missing degree_id/degree_code or current_semester', user);
    return false;
  }

  try {
    const { Degree } = require('../models');
    let degree = null;

    if (degreeId) {
      degree = await Degree.findByPk(degreeId);
    } else if (degreeCode) {
      degree = await Degree.findOne({ where: { code: degreeCode } });
    }

    if (!degree) {
      console.log('isEnrollmentOpen: Degree not found for degree_id/code', degreeId, degreeCode);
      return false;
    }

    const semesterStr = semester.toString();
    let perSemesterObj = degree.courses_per_semester;

    // Parse if it's a string
    if (typeof perSemesterObj === 'string' && perSemesterObj.trim().length > 0) {
      try {
        perSemesterObj = JSON.parse(perSemesterObj);
      } catch (e) {
        console.error('Failed to parse courses_per_semester JSON:', e, perSemesterObj);
        perSemesterObj = {};
      }
    }

    console.log('isEnrollmentOpen: Parsed perSemesterObj:', perSemesterObj);

    const semesterConfig = perSemesterObj?.[semesterStr];

    // Log degree code, semester, and enrollment window for debugging
    console.log(
      `isEnrollmentOpen: Degree=${degree.code}, Semester=${semesterStr}, SemesterConfig=`, semesterConfig
    );

    if (!semesterConfig || !semesterConfig.enrollment_start || !semesterConfig.enrollment_end) {
      console.log('isEnrollmentOpen: Missing enrollment_start or enrollment_end in semesterConfig', semesterConfig);
      return false;
    }

    const now = new Date();
    const startDate = new Date(semesterConfig.enrollment_start);
    const endDate = new Date(semesterConfig.enrollment_end);

    console.log(
      `isEnrollmentOpen: Now=${now.toISOString()}, Start=${startDate.toISOString()}, End=${endDate.toISOString()}`
    );

    return now >= startDate && now <= endDate;
  } catch (error) {
    console.error('Error checking enrollment window:', error);
    return false;
  }
};

module.exports = { isEnrollmentOpen };