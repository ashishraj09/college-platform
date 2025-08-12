require('dotenv').config({ path: '.env.development' });
const { sequelize } = require('./config/database');
const { User, Department, Degree, Course } = require('./models');

async function createTestData() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Create test department
    const [department] = await Department.findOrCreate({
      where: { id: '550e8400-e29b-41d4-a716-446655440001' },
      defaults: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Computer Science',
        code: 'CS',
        description: 'Computer Science Department',
        status: 'active'
      }
    });

    // Create test user (faculty)
    const [user] = await User.findOrCreate({
      where: { id: '550e8400-e29b-41d4-a716-446655440000' },
      defaults: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@university.edu',
        password: '$2b$10$hashedpassword', // This is a mock hashed password
        user_type: 'faculty',
        department_id: '550e8400-e29b-41d4-a716-446655440001',
        employee_id: 'FAC001',
        status: 'active'
      }
    });

    // Create test degree
    const [degree] = await Degree.findOrCreate({
      where: { code: 'BS-CS' },
      defaults: {
        name: 'Bachelor of Science in Computer Science',
        code: 'BS-CS',
        description: 'A comprehensive computer science degree program',
        duration_years: 4,
        department_id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'active'
      }
    });

    // Create some test courses
    const courses = [
      {
        name: 'Introduction to Programming',
        code: 'CS101',
        overview: 'Basic programming concepts using Python',
        study_details: { topics: ['Variables', 'Functions', 'Loops', 'Conditionals'] },
        faculty_details: { instructor: 'John Doe', office_hours: 'MW 2-4 PM' },
        credits: 3,
        semester: 1,
        prerequisites: [],
        max_students: 40,
        department_id: '550e8400-e29b-41d4-a716-446655440001',
        degree_id: degree.id,
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        status: 'draft',
        is_elective: false
      },
      {
        name: 'Data Structures',
        code: 'CS201',
        overview: 'Fundamental data structures and algorithms',
        study_details: { topics: ['Arrays', 'Lists', 'Trees', 'Graphs'] },
        faculty_details: { instructor: 'John Doe', office_hours: 'TTh 1-3 PM' },
        credits: 4,
        semester: 3,
        prerequisites: ['CS101'],
        max_students: 35,
        department_id: '550e8400-e29b-41d4-a716-446655440001',
        degree_id: degree.id,
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        status: 'submitted',
        is_elective: false
      },
      {
        name: 'Advanced Algorithms',
        code: 'CS301',
        overview: 'Advanced algorithmic concepts and analysis',
        study_details: { topics: ['Dynamic Programming', 'Graph Algorithms', 'Complexity Analysis'] },
        faculty_details: { instructor: 'John Doe', office_hours: 'MWF 11-12 PM' },
        credits: 4,
        semester: 5,
        prerequisites: ['CS201'],
        max_students: 30,
        department_id: '550e8400-e29b-41d4-a716-446655440001',
        degree_id: degree.id,
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        status: 'approved',
        is_elective: false
      },
      {
        name: 'Web Development',
        code: 'CS401',
        overview: 'Modern web development frameworks and practices',
        study_details: { topics: ['React', 'Node.js', 'Databases', 'API Design'] },
        faculty_details: { instructor: 'John Doe', office_hours: 'TTh 3-5 PM' },
        credits: 3,
        semester: 7,
        prerequisites: ['CS201'],
        max_students: 25,
        department_id: '550e8400-e29b-41d4-a716-446655440001',
        degree_id: degree.id,
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        status: 'active',
        is_elective: true
      }
    ];

    // Create courses
    for (const courseData of courses) {
      await Course.findOrCreate({
        where: { code: courseData.code },
        defaults: courseData
      });
    }

    console.log('Test data created successfully!');
    console.log(`Created:
    - Department: ${department.name} (${department.code})
    - User: ${user.first_name} ${user.last_name} (${user.email})
    - Degree: ${degree.name} (${degree.code})
    - ${courses.length} Courses`);

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await sequelize.close();
  }
}

createTestData();
