require('dotenv').config({ path: '.env.development' });
const db = require('./models');

const addMoreSemester3Courses = async () => {
  try {
    console.log('📚 Adding more semester 3 courses for testing...');
    
    // Get faculty user to assign as creator
    const facultyUser = await db.User.findOne({
      where: { user_type: 'faculty' }
    });
    
    const department = await db.Department.findOne({
      where: { code: 'CS' }
    });
    
    const degree = await db.Degree.findOne({
      where: { code: 'BS-CS' }
    });
    
    const additionalCourses = [
      {
        name: 'Database Management Systems',
        code: 'CS302',
        overview: 'Comprehensive study of database design, implementation, and management',
        credits: 4,
        semester: 3,
        prerequisites: ['CS201']
      },
      {
        name: 'Computer Networks',
        code: 'CS303',
        overview: 'Network protocols, architecture, and distributed systems',
        credits: 3,
        semester: 3,
        prerequisites: ['CS101']
      },
      {
        name: 'Software Engineering',
        code: 'CS304',
        overview: 'Software development methodologies and project management',
        credits: 4,
        semester: 3,
        prerequisites: ['CS201']
      },
      {
        name: 'Operating Systems',
        code: 'CS305',
        overview: 'OS concepts, process management, memory management, and file systems',
        credits: 4,
        semester: 3,
        prerequisites: ['CS201']
      },
      {
        name: 'Discrete Mathematics',
        code: 'MATH301',
        overview: 'Mathematical foundations for computer science including logic and set theory',
        credits: 3,
        semester: 3,
        prerequisites: []
      }
    ];
    
    for (const courseData of additionalCourses) {
      await db.Course.findOrCreate({
        where: { code: courseData.code },
        defaults: {
          ...courseData,
          study_details: {
            objectives: [`Master ${courseData.name.toLowerCase()} concepts`],
            topics: ['Fundamental concepts', 'Advanced applications', 'Practical projects'],
            assessment: 'Exams, assignments, and projects'
          },
          faculty_details: {
            instructor: 'Dr. Computer Science',
            office_hours: 'Mon-Wed-Fri 2-4 PM'
          },
          max_students: 30,
          department_id: department.id,
          degree_id: degree.id,
          created_by: facultyUser.id,
          status: 'active'
        }
      });
      console.log(`✅ Added/found: ${courseData.code} - ${courseData.name}`);
    }
    
    // Get final count of semester 3 courses
    const semester3Courses = await db.Course.findAll({
      where: { semester: 3 },
      attributes: ['name', 'code', 'credits'],
      order: [['code', 'ASC']]
    });
    
    console.log(`\n🎉 Total semester 3 courses: ${semester3Courses.length}`);
    console.log('\n📋 All semester 3 courses:');
    semester3Courses.forEach(course => {
      console.log(`- ${course.code}: ${course.name} (${course.credits} credits)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding courses:', error);
    process.exit(1);
  }
};

addMoreSemester3Courses();
