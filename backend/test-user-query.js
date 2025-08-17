const { User, Degree, Department } = require('./models');

async function testUser() {
  try {
    const user = await User.findByPk('aa1f87d8-d895-4f46-a6ba-2157a6154f49', {
      include: [
        {
          model: Degree,
          as: 'degree',
          include: [
            {
              model: Department,
              as: 'department'
            }
          ]
        }
      ]
    });
    
    console.log('User found:', !!user);
    if (user) {
      console.log('User degree:', !!user.degree);
      console.log('User degree_id field:', user.degree_id);
      if (user.degree) {
        console.log('Degree ID:', user.degree.id);
        console.log('Degree name:', user.degree.name);
      } else {
        console.log('No degree relationship loaded');
      }
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

testUser();
