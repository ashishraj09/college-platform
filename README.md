# College Platform - Enterprise Course Management System

A comprehensive enterprise-level web application for managing college courses, enrollments, and user workflows with role-based access control.

## 🏗️ Architecture

- **Frontend**: React.js 18 with TypeScript, Material-UI v5
- **Backend**: Node.js with Express.js, Sequelize ORM  
- **Database**: PostgreSQL
- **Authentication**: JWT-based with refresh tokens
- **State Management**: Redux Toolkit
- **Email**: Nodemailer with template support

## 👥 User Roles

### Admin
- Create, modify, and deactivate user accounts
- Full system access and oversight
- Dedicated admin UI interface
- Send account creation emails with password reset links

### Faculty
- Create and manage courses with project details
- Department-specific access control
- Course approval workflow management
- Head of Department privileges for approvals

### Office Users  
- Review and approve student enrollments
- Final approval authority for course enrollments
- System oversight capabilities

### Students
- Browse and select courses based on degree/department
- Submit enrollment requests
- Receive enrollment confirmation emails

## ✨ Key Features

### 🔐 Authentication & Security
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Password encryption with bcrypt
- Email verification and password reset
- Rate limiting and security headers

### 📚 Course Management
- Comprehensive course creation with study details
- Multi-status workflow (Draft → Submitted → Approved → Active)
- Faculty-specific course ownership
- Department and degree linkage

### 📝 Enrollment System  
- Student course selection based on eligibility
- Multi-level approval workflow:
  1. Head of Department approval
  2. Office user final approval
- Email notifications at each step
- Enrollment confirmation system

### 📊 Audit & Compliance
- Comprehensive audit logging for all actions
- Change tracking with old/new value comparison
- User action history with IP and timestamp
- Compliance reporting capabilities

### 📧 Email System
- Template-based email notifications
- Workflow-triggered automated emails
- Password reset and welcome emails
- Direct links to approval interfaces

### 📱 Responsive Design
- Material-UI based responsive interface
- Role-specific UI layouts
- Mobile-friendly design
- Accessible components

## 🚀 Getting Started

### Prerequisites
- Node.js 14+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd collage-platform
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Copy environment configuration
   cp .env.example .env.development
   # Edit .env.development with your database and email settings
   
   # Start development server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Start development server  
   npm start
   ```

4. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb college_platform_dev
   
   # Run migrations (if available)
   cd backend
   npm run db:migrate
   
   # Seed initial data (if available)
   npm run seed
   ```

## 📋 Environment Configuration

### Backend (.env.development)
```env
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5432  
DB_NAME=college_platform_dev
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Email (using Mailtrap for development)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-username
SMTP_PASS=your-password
FROM_EMAIL=noreply@college-platform.dev

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

### Frontend (.env.development)
```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_ENVIRONMENT=development
REACT_APP_APP_NAME=College Platform
```

## 📁 Project Structure

```
collage-platform/
├── backend/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── audit.js             # Audit logging middleware
│   │   └── validation.js        # Input validation
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── Course.js            # Course model
│   │   ├── Department.js        # Department model
│   │   ├── Degree.js            # Degree model
│   │   ├── Enrollment.js        # Enrollment model
│   │   ├── AuditLog.js          # Audit log model
│   │   └── index.js             # Model associations
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── users.js             # User management routes
│   │   ├── courses.js           # Course management routes
│   │   ├── departments.js       # Department routes
│   │   ├── degrees.js           # Degree routes
│   │   ├── enrollments.js       # Enrollment routes
│   │   └── audit.js             # Audit routes
│   ├── utils/
│   │   ├── email.js             # Email utilities
│   │   └── auth.js              # Auth utilities
│   ├── .env.development         # Development environment
│   ├── .env.production          # Production environment
│   └── server.js                # Express server
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── common/
    │   │       └── ProtectedRoute.tsx
    │   ├── contexts/
    │   │   └── AuthContext.tsx    # Authentication context
    │   ├── hooks/
    │   │   └── redux.ts           # Redux hooks
    │   ├── pages/
    │   │   └── auth/
    │   │       └── LoginPage.tsx  # Login page
    │   ├── routes/
    │   │   └── AppRoutes.tsx      # Application routing
    │   ├── services/
    │   │   └── api.ts             # API service layer
    │   ├── store/
    │   │   ├── slices/            # Redux slices
    │   │   └── store.ts           # Redux store
    │   ├── theme/
    │   │   └── theme.ts           # Material-UI theme
    │   └── App.tsx                # Main App component
    ├── .env.development           # Development environment
    └── .env.production            # Production environment
```

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/register` - Register new user (Admin only)

### Users
- `GET /api/users` - Get all users (Admin/Office)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Courses
- `GET /api/courses` - Get courses
- `POST /api/courses` - Create course (Faculty)
- `PUT /api/courses/:id` - Update course
- `PATCH /api/courses/:id/approve` - Approve course (HOD)

### Enrollments
- `GET /api/enrollments` - Get enrollments  
- `POST /api/enrollments` - Create enrollment (Student)
- `PATCH /api/enrollments/:id/approve` - Approve enrollment

## 🗃️ Database Schema

### Users Table
- Personal information (name, email, IDs)
- Role-based fields (user_type, department, degree)
- Status and verification fields
- Authentication fields (password, reset tokens)

### Courses Table  
- Course details (name, code, overview, credits)
- Study and faculty details (JSON fields)
- Status workflow tracking
- Department and degree associations

### Enrollments Table
- Student-course associations
- Academic year and semester tracking
- Multi-level approval workflow
- Status progression tracking

### Audit Logs Table
- Comprehensive action logging
- User, entity, and change tracking
- Metadata including IP and user agent

## 🔧 Development Scripts

### Backend
```bash
npm run dev          # Development server with nodemon
npm run start        # Production server
npm run seed         # Seed database with initial data
npm run db:migrate   # Run database migrations
node scripts/ensure-database-schema.js  # Verify and create database schema
```

### Frontend  
```bash
npm start            # Development server
npm run build        # Production build
npm test             # Run tests
npm run eject        # Eject from Create React App
```

## 🚀 Deployment

### Production Environment Setup

1. **Database**: Set up PostgreSQL with SSL
2. **Environment**: Configure production environment variables
3. **Email**: Set up production email service (SendGrid, AWS SES)
4. **Security**: Configure SSL/TLS, secure headers
5. **Monitoring**: Set up logging and monitoring

### Vercel Deployment
The application is configured for deployment on Vercel with the following build-time optimizations:

1. **Database Schema Verification**: During the build process, the system verifies the database schema and creates tables if needed
2. **Model Association Verification**: Ensures all model associations are properly initialized
3. **Connection Testing**: Validates database connectivity before deployment completes
4. **Automated Schema Management**: Uses `scripts/ensure-database-schema.js` to handle database schema setup without data loss

This build-time approach ensures that the database is properly configured before the application is deployed, preventing runtime errors in the serverless environment.

#### Setting up Vercel Environment Variables
For the database schema verification to work correctly, you must set up these environment variables in your Vercel project settings:

- `DB_HOST`: Your database hostname (e.g., `db.example.com`)
- `DB_PORT`: Database port (typically `5432` for PostgreSQL)
- `DB_NAME`: Name of your database
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_DIALECT`: Set to `postgres`
- `DB_SSL`: Set to `true` for cloud-hosted databases

These variables are used during both build time and runtime to ensure proper database connectivity.

### Environment Variables
Ensure all production environment variables are properly configured:
- Database connection with SSL
- Secure JWT secrets (long, random strings)
- Production email service credentials
- Correct frontend/backend URLs
- SSL enforcement settings

## 📝 Contributing

1. Follow TypeScript and ESLint configurations
2. Implement comprehensive error handling
3. Add audit logging for all user actions
4. Follow Material-UI design patterns
5. Write tests for new functionality
6. Update documentation for new features

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Review the documentation
- Check the audit logs for debugging

---

**College Platform** - Empowering educational institutions with comprehensive course management.
