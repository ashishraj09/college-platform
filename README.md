
# College Platform - Enterprise Course Management System

**College Platform** is a modern, enterprise-grade web application designed to streamline and automate the management of academic courses, degree programs, user roles, and student enrollments for colleges and universities. It provides a robust workflow for course creation, approval, and enrollment, with fine-grained role-based access control for administrators, faculty, office staff, and students.

**Key goals:**
- Centralize all course, degree, and enrollment data in a secure, auditable system
- Automate multi-step approval workflows for courses and enrollments
- Enable collaboration between faculty and departments
- Provide a seamless, responsive user experience for all roles
- Ensure compliance, auditability, and security for sensitive academic data

**Who is this for?**
- Colleges and universities seeking to digitize and modernize their academic administration
- Developers and IT teams building custom academic management solutions
- Faculty and staff who need a transparent, collaborative workflow for course and degree management

**What does it do?**
- Lets admins, faculty, and office staff manage users, courses, degrees, and enrollments
- Supports multi-level approval and collaboration for both courses and enrollments
- Provides students with a self-service portal for course selection and enrollment tracking
- Sends automated email notifications for all major workflow events
- Tracks all changes and approvals for compliance and reporting


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
- Rate limiting with proxy support for Vercel
- Security headers with Helmet

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

## 🚀 Getting Started

### Prerequisites
- Node.js 14+ (recommended: latest LTS)
- PostgreSQL 12+ (local or remote)
- npm or yarn

### 1. Clone the repository
```bash
git clone <repository-url>
cd collage-platform
```

### 2. Set up the backend
```bash
cd backend
npm install

# Copy and edit environment configuration
cp .env.example .env.development
# Edit .env.development with your database and email settings

# Create the database (if not already created)
createdb college_platform_dev

# Run migrations to set up schema
npm run db:migrate

# (Optional) Seed initial data
npm run seed

# Start the backend server (development mode)

# The backend will run on http://localhost:5000 by default
```

### 3. Set up the frontend
```bash
cd ../frontend
npm install

# Start the frontend development server
npm start
# The frontend will run on http://localhost:3000 by default
```

### 4. Access the application
- Open your browser and go to http://localhost:3000
- Log in with an admin or test account (see seed data or ask your admin)

---
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
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_APP_NAME=College Platform
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

### Auth
- `POST /api/auth/register` — Register a new user (admin only)
- `POST /api/auth/login` — User login
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Reset password
- `GET /api/auth/profile` — Get current user profile
- `POST /api/auth/logout` — Logout user
- `GET /api/auth/me` — Get authenticated user's profile

### Users
- `GET /api/users` — List all users
- `GET /api/users/:id` — Get user by ID
- `PUT /api/users/:id` — Update user
- `DELETE /api/users/:id` — Delete user
- `GET /api/users/stats` — Get user/collaborator stats
- `GET /api/users/department/:code` — Get users by department
- `POST /api/users/:id/reset-password` — Admin reset user password

### Courses
- `GET /api/courses` — List courses (with filters)
- `GET /api/courses/public/:code` — Public course details
- `GET /api/courses/preview/:id` — Preview course (with meta)
- `GET /api/courses/my-courses` — Faculty's courses
- `GET /api/courses/department-courses` — Department courses
- `GET /api/courses/:id` — Get course by ID
- `GET /api/courses/:id/edit` — Get course for editing
- `POST /api/courses` — Create course
- `POST /api/courses/:id/create-version` — Create new version
- `GET /api/courses/:id/can-edit` — Can edit check
- `PATCH /api/courses/:id/submit` — Submit for approval
- `PATCH /api/courses/:id/approve` — Approve course
- `PATCH /api/courses/:id/reject` — Reject course
- `PATCH /api/courses/:id/publish` — Publish/activate course
- `PUT /api/courses/:id` — Update course
- `DELETE /api/courses/:id` — Delete course

### Degrees
- `GET /api/degrees/public` — List public degrees
- `GET /api/degrees/public/:code` — Public degree details
- `GET /api/degrees/preview/:id` — Preview degree
- `GET /api/degrees` — List degrees (with filters)
- `GET /api/degrees/:id` — Get degree by ID
- `POST /api/degrees` — Create degree
- `PUT /api/degrees/:id` — Update degree
- `DELETE /api/degrees/:id` — Delete degree
- `PATCH /api/degrees/:id/submit` — Submit for approval
- `PATCH /api/degrees/:id/approve` — Approve degree
- `PATCH /api/degrees/:id/reject` — Reject degree
- `PATCH /api/degrees/:id/publish` — Publish/activate degree

### Enrollments
- `GET /api/enrollments` — List enrollments
- `GET /api/enrollments/draft` — List draft enrollments
- `PUT /api/enrollments/draft` — Update draft enrollment
- `POST /api/enrollments/draft/submit` — Submit draft enrollment
- `POST /api/enrollments` — Create enrollment
- `PATCH /api/enrollments/:id/approve` — Approve enrollment
- `PATCH /api/enrollments/:id/reject` — Reject enrollment

### Departments
- `GET /api/departments` — List departments
- `GET /api/departments/:id` — Get department by ID
- `POST /api/departments` — Create department
- `PUT /api/departments/:id` — Update department
- `DELETE /api/departments/:id` — Delete department
- `GET /api/departments/:id/degrees` — Get degrees in department
- `GET /api/departments/public/:code` — Public department info

### Collaborators
- `POST /api/collaborators/course/:courseId/add` — Add course collaborator
- `POST /api/collaborators/course/:courseId/remove` — Remove course collaborator
- `GET /api/collaborators/course/:courseId` — List course collaborators
- `POST /api/collaborators/degree/:degreeId/add` — Add degree collaborator
- `POST /api/collaborators/degree/:degreeId/remove` — Remove degree collaborator
- `GET /api/collaborators/degree/:degreeId` — List degree collaborators

### Timeline & Health
- `GET /api/timeline/:entityType/:entityId` — Get timeline for entity
- `GET /api/health` — Health check

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
5. **Deployment Protection**: Automatically aborts deployment if critical database issues are detected

This build-time approach ensures that the database is properly configured before the application is deployed, preventing runtime errors in the serverless environment. The deployment will be automatically cancelled if any critical database issues are detected, ensuring that only valid builds are deployed.

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

## 📄 License

This project is proprietary and all rights are reserved. Copying, redistribution, or use of any part of this codebase is not permitted unless explicitly agreed to or approved in writing by the project owner.

For any licensing inquiries or requests for permission, please contact the project maintainer.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Review the documentation
- Check the audit logs for debugging

---

**College Platform** - Empowering educational institutions with comprehensive course management.
