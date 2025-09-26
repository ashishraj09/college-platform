require('dotenv').config({ path: require('path').join(__dirname, '../.env.development') });
const { User, Department, Degree, Course, Message, AuditLog } = require('../models');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const faker = require('@faker-js/faker').faker;
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// Utility to clean database before seeding
async function cleanDatabase() {
  await User.destroy({ where: {}, truncate: true, cascade: true });
  await Course.destroy({ where: {}, truncate: true, cascade: true });
  await Degree.destroy({ where: {}, truncate: true, cascade: true });
  await Department.destroy({ where: {}, truncate: true, cascade: true });
  await Message.destroy({ where: {}, truncate: true, cascade: true });
  await AuditLog.destroy({ where: {}, truncate: true, cascade: true });
}

function fakeEmail() {
  return `${faker.internet.userName().toLowerCase()}@myskytower.com`;
}


async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function seedTestData() {
  await sequelize.sync({ force: true });
  await cleanDatabase();

  // Create admin account
  const adminUser = await User.create({
    id: uuidv4(),
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@myskytower.com',
    password: await hashPassword('admin123'),
    user_type: 'admin',
    employee_id: 'ADMIN001',
    status: 'active',
    email_verified: true,
  });

  // Create Departments
  const departments = [];
  const departmentData = [
    { name: 'Chemistry', code: 'CHEM', description: 'Department of Chemistry' },
    { name: 'Physics', code: 'PHYS', description: 'Department of Physics' },
    { name: 'Biology', code: 'BIOL', description: 'Department of Biology' },
    { name: 'Mathematics', code: 'MATH', description: 'Department of Mathematics' },
    { name: 'Computer Science', code: 'COMP', description: 'Department of Computer Science' }
  ];
  
  for (const deptInfo of departmentData) {
    const dept = await Department.create({
      id: uuidv4(),
      name: deptInfo.name,
      code: deptInfo.code,
      description: deptInfo.description,
      status: 'active',
    });
    departments.push(dept);
  }

  // Create Faculty Users (3 per department, one HOD)
  const facultyByDept = {};
  for (const dept of departments) {
  facultyByDept[dept.code] = [];
    for (let f = 0; f < 3; f++) {
      const faculty = await User.create({
        id: uuidv4(),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: fakeEmail(),
        password: await hashPassword('password123'),
        user_type: 'faculty',
        employee_id: `EMP${dept.code}${f + 1}`,
        department_code: dept.code,
        status: 'active',
        email_verified: true,
        is_head_of_department: f === 0, // First faculty is HOD
      });
      facultyByDept[dept.code].push(faculty);
    }
  }

  // Create Degrees (5 per department)
  const degrees = [];
  for (const dept of departments) {
    // Different degree types based on department
    const degreeTypes = [];
    
    if (dept.code === 'CHEM') {
      degreeTypes.push(
        { name: 'Analytical Chemistry', code: 'ANCH' },
        { name: 'Organic Chemistry', code: 'ORCH' },
        { name: 'Inorganic Chemistry', code: 'INCH' },
        { name: 'Physical Chemistry', code: 'PHCH' },
        { name: 'Biochemistry', code: 'BICH' }
      );
    } else if (dept.code === 'PHYS') {
      degreeTypes.push(
        { name: 'Theoretical Physics', code: 'THPH' },
        { name: 'Applied Physics', code: 'APPH' },
        { name: 'Astrophysics', code: 'ASPH' },
        { name: 'Nuclear Physics', code: 'NUPH' },
        { name: 'Quantum Physics', code: 'QUPH' }
      );
    } else if (dept.code === 'BIOL') {
      degreeTypes.push(
        { name: 'Molecular Biology', code: 'MOBI' },
        { name: 'Ecology', code: 'ECOL' },
        { name: 'Genetics', code: 'GENE' },
        { name: 'Microbiology', code: 'MICR' },
        { name: 'Marine Biology', code: 'MARB' }
      );
    } else if (dept.code === 'MATH') {
      degreeTypes.push(
        { name: 'Pure Mathematics', code: 'PUMA' },
        { name: 'Applied Mathematics', code: 'APMA' },
        { name: 'Statistics', code: 'STAT' },
        { name: 'Mathematical Finance', code: 'MAFI' },
        { name: 'Computational Mathematics', code: 'COMA' }
      );
    } else if (dept.code === 'COMP') {
      degreeTypes.push(
        { name: 'Software Engineering', code: 'SOEN' },
        { name: 'Artificial Intelligence', code: 'ARTI' },
        { name: 'Cybersecurity', code: 'CYSE' },
        { name: 'Data Science', code: 'DATA' },
        { name: 'Computer Networks', code: 'NETE' }
      );
    }
    
    for (let j = 0; j < degreeTypes.length; j++) {
      const degreeType = degreeTypes[j];
      // Pick a non-HOD faculty (index 1 or 2)
  const nonHodFaculty = facultyByDept[dept.code][1] || facultyByDept[dept.code][2];
      const degree = await Degree.create({
        id: uuidv4(),
        name: `MSc in ${degreeType.name}`,
        code: `${degreeType.code}`,
        description: `Master of Science in ${degreeType.name}`,
        duration_years: 2,
        department_id: dept.id,
        status: 'active',
        courses_per_semester: { '1': 4, '2': 4 },
        created_by: nonHodFaculty.id,
      });
      degrees.push(degree);
    }
  }

  // Create Courses (4 per semester per degree)
  for (const degree of degrees) {
    for (let semester = 1; semester <= 2; semester++) {
      // Create department and degree specific courses
      const coursesByDepartment = {
        'CHEM': [
          { name: 'Advanced Analytical Techniques', code: 'AAT' },
          { name: 'Molecular Spectroscopy', code: 'MSP' },
          { name: 'Chemical Thermodynamics', code: 'CTD' },
          { name: 'Organic Synthesis', code: 'OSY' }
        ],
        'PHYS': [
          { name: 'Quantum Mechanics', code: 'QME' },
          { name: 'Electromagnetic Theory', code: 'EMT' },
          { name: 'Statistical Mechanics', code: 'SME' },
          { name: 'Particle Physics', code: 'PPH' }
        ],
        'BIOL': [
          { name: 'Cell Biology', code: 'CBI' },
          { name: 'Evolutionary Biology', code: 'EBI' },
          { name: 'Molecular Genetics', code: 'MGE' },
          { name: 'Ecology and Conservation', code: 'ECO' }
        ],
        'MATH': [
          { name: 'Advanced Calculus', code: 'ACA' },
          { name: 'Abstract Algebra', code: 'AAL' },
          { name: 'Complex Analysis', code: 'CAN' },
          { name: 'Numerical Methods', code: 'NME' }
        ],
        'COMP': [
          { name: 'Advanced Algorithms', code: 'AAL' },
          { name: 'Machine Learning', code: 'MLE' },
          { name: 'Distributed Systems', code: 'DSY' },
          { name: 'Software Architecture', code: 'SAR' }
        ]
      };
      
      // Get the department code from the degree's department
      const deptCode = departments.find(d => d.id === degree.department_id).code;
      const courses = coursesByDepartment[deptCode];
      // Use department code to access faculty list (not department_id)
      const facultyList = facultyByDept[deptCode];
      for (let k = 0; k < courses.length; k++) {
        const course = courses[k];
        // Distribute courses among faculty members more evenly
        // Use faculty index based on a combination of course index and semester
        // This ensures different faculty members get assigned different courses
        const facultyIndex = (k + semester) % facultyList.length;
        const assignedFaculty = facultyList[facultyIndex];
        await Course.create({
          id: uuidv4(),
          name: `${course.name} ${semester === 2 ? 'II' : 'I'}`,
          code: `${degree.code}${course.code}${semester}`,
          overview: `${course.name} for ${semester === 1 ? 'beginning' : 'advanced'} graduate students.`,
          credits: 4,
          semester,
          department_id: degree.department_id,
          degree_id: degree.id,
          status: 'active',
          study_details: {},
          faculty_details: {},
          created_by: assignedFaculty.id,
        });
      }
    }
  }

  // Create Student Users (10 per department)
  for (const dept of departments) {
    for (let s = 0; s < 10; s++) {
      const degreeObj = degrees.find(d => d.department_id === dept.id);
      await User.create({
        id: uuidv4(),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: fakeEmail(),
        password: await hashPassword('password123'),
        user_type: 'student',
        student_id: `STU${dept.code}${s + 1}`,
        degree_code: degreeObj ? degreeObj.code : null,
        department_code: dept.code,
        status: 'active',
        email_verified: true,
        enrolled_year: 2025,
        current_semester: 1,
        // Removed degree_id and department_id fields
      });
    }
  }

  console.log('Test data seeded successfully!');
  process.exit(0);
}

if (require.main === module) {
  seedTestData();
}
