require('dotenv').config({ path: '.env.development' });
const db = require('./models');

const updateAllCoursesToSemester3 = async () => {
  try {
    console.log('🔄 Updating all courses to semester 3...');
    
    const result = await db.Course.update(
      { semester: 3 },
      { 
        where: {},
        returning: true
      }
    );
    
    console.log('✅ Updated courses count:', result[0]);
    
    // Show updated courses
    const updatedCourses = await db.Course.findAll({
      attributes: ['name', 'code', 'semester', 'credits'],
      order: [['code', 'ASC']]
    });
    
    console.log('\n📚 All courses now in semester 3:');
    updatedCourses.forEach(course => {
      console.log(`- ${course.code}: ${course.name} (${course.credits} credits, semester ${course.semester})`);
    });
    
    console.log('\n🎉 All courses successfully moved to semester 3!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating courses:', error);
    process.exit(1);
  }
};

updateAllCoursesToSemester3();
