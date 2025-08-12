const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.development') });
const { sequelize } = require('./config/database');
const User = require('./models/User');

async function createDefaultAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      where: { user_type: 'admin' } 
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create default admin user
    const saltRounds = 12;
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    const adminUser = await User.create({
      first_name: 'System',
      last_name: 'Administrator',
      email: 'admin@college.edu',
      password: hashedPassword,
      user_type: 'admin',
      employee_id: 'ADM001',
      status: 'active',
      email_verified: true
    });

    console.log('✅ Default admin user created successfully!');
    console.log('📧 Email: admin@college.edu');
    console.log('🔑 Password: admin123');
    console.log('');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await sequelize.close();
  }
}

createDefaultAdmin();
