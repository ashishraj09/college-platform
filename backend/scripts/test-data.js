require('dotenv').config({ path: require('path').join(__dirname, '../.env.development') });
const { User, Department, Degree, Course, Message, AuditLog } = require('../models');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const faker = require('@faker-js/faker').faker;

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

async function seedTestData() {
  await sequelize.sync();
  await cleanDatabase();

  // Create admin account
  const adminUser = await User.create({
    id: uuidv4(),
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@myskytower.com',
    password: 'admin123', // Should be hashed in production
    user_type: 'admin',
    employee_id: 'ADMIN001',
    status: 'active',
    email_verified: true,
  });

  // Create Departments
  const departments = [];
  for (let i = 0; i < 5; i++) {
    const dept = await Department.create({
      id: uuidv4(),
      name: `Computer Science ${i + 1}`,
      code: `CS${i + 1}`,
      description: `Department of Computer Science ${i + 1}`,
      status: 'active',
    });
    departments.push(dept);
  }

  // Create Faculty Users (2 per department, one HOD)
  const facultyByDept = {};
  for (const dept of departments) {
    facultyByDept[dept.id] = [];
    for (let f = 0; f < 2; f++) {
      const faculty = await User.create({
        id: uuidv4(),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: fakeEmail(),
        password: 'password123', // Should be hashed in production
        user_type: 'faculty',
        employee_id: `EMP${dept.code}${f + 1}`,
        department_id: dept.id,
        status: 'active',
        email_verified: true,
        is_head_of_department: f === 0, // First faculty is HOD
      });
      facultyByDept[dept.id].push(faculty);
    }
  }

  // Create Degrees (5 per department)
  const degrees = [];
  for (const dept of departments) {
    for (let j = 0; j < 5; j++) {
      const degree = await Degree.create({
        id: uuidv4(),
        name: `MComp ${dept.code} ${j + 1}`,
        code: `MC${dept.code}${j + 1}`,
        description: `Master of Computer Science ${dept.code} ${j + 1}`,
        duration_years: 2,
        department_id: dept.id,
        status: 'active',
        courses_per_semester: { '1': 4, '2': 4 },
      });
      degrees.push(degree);
    }
  }

  // Create Courses (4 per semester per degree)
  for (const degree of degrees) {
    for (let semester = 1; semester <= 2; semester++) {
      for (let k = 0; k < 4; k++) {
        // Pick a random faculty from the department as creator
        const facultyList = facultyByDept[degree.department_id];
        const creator = facultyList[Math.floor(Math.random() * facultyList.length)];
        await Course.create({
          id: uuidv4(),
          name: `Course ${degree.code} S${semester} #${k + 1}`,
          code: `${degree.code}S${semester}C${k + 1}`,
          overview: faker.lorem.sentence(),
          credits: 4,
          semester,
          department_id: degree.department_id,
          degree_id: degree.id,
          status: 'active',
          study_details: {},
          faculty_details: {},
          created_by: creator.id,
        });
      }
    }
  }

  // Create Student Users (10 per department)
  for (const dept of departments) {
    for (let s = 0; s < 10; s++) {
      await User.create({
        id: uuidv4(),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: fakeEmail(),
        password: 'password123', // Should be hashed in production
        user_type: 'student',
        student_id: `STU${dept.code}${s + 1}`,
        degree_id: degrees.find(d => d.department_id === dept.id).id,
        department_id: dept.id,
        status: 'active',
        email_verified: true,
        enrolled_year: 2025,
        current_semester: 1,
      });
    }
  }

  console.log('Test data seeded successfully!');
  process.exit(0);
}

seedTestData().catch(err => {
  console.error('Error seeding test data:', err);
  process.exit(1);
});
