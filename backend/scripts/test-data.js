require('dotenv').config({ path: require('path').join(__dirname, '../.env.development') });
const { User, Department, Degree, Course, Enrollment, Message, AuditLog } = require('../models');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const faker = require('@faker-js/faker').faker;
const bcrypt = require('bcryptjs');
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

// Dry-run mode: log operations instead of mutating the DB
const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
// Report mode: non-destructive inspection of seed-data.json
const reportMode = process.argv.includes('--report');
// Run-all flag for interactive mode
const runAllFlagGlobal = process.argv.includes('--run-all') || process.argv.includes('--all');

// Simple shared ask(prompt) helper (used throughout). Respects runAllFlagGlobal.
const readline = require('readline');
function ask(question) {
  if (runAllFlagGlobal) return Promise.resolve('a');
  return new Promise(resolve => {
    const r = readline.createInterface({ input: process.stdin, output: process.stdout });
    r.question(question, answer => { r.close(); resolve(answer.trim()); });
  });
}

async function create(Model, values) {
  const type = Model && Model.name ? Model.name : 'Model';
  function detailsFromValues(vals) {
    if (!vals) return '';
    if (type === 'User') {
      const parts = [];
      if (vals.user_type) parts.push(vals.user_type);
      if (vals.first_name || vals.last_name) parts.push(`${(vals.first_name || '')} ${(vals.last_name || '')}`.trim());
      if (vals.email) parts.push(`<${vals.email}>`);
      if (vals.student_id) parts.push(`student_id=${vals.student_id}`);
      if (vals.employee_id) parts.push(`employee_id=${vals.employee_id}`);
      return parts.length ? `(${parts.join(' | ')})` : '';
    }
    if (type === 'Department') {
      return vals.code ? `(${vals.code}) ${vals.name || ''}` : `${vals.name || ''}`;
    }
    if (type === 'Degree') {
      return vals.code ? `(${vals.code}) ${vals.name || ''}` : `${vals.name || ''}`;
    }
    if (type === 'Course') {
      return vals.code ? `(${vals.code}) ${vals.name || ''}` : `${vals.name || ''}`;
    }
    return vals.code ? `(${vals.code})` : '';
  }

  const details = detailsFromValues(values);
  if (isDryRun || reportMode) {
    console.log('[dry-run] would create', type, details);
    // return a lightweight object resembling the created instance
    return { ...(values || {}), id: values && values.id ? values.id : uuidv4(), code: values && values.code ? (values.code || '').toUpperCase() : undefined };
  }

  const instance = await Model.create(values);
  // Log created instance with useful details
  try {
    const instDetails = detailsFromValues(instance);
    console.log('created', type, instDetails);
  } catch (e) {
    console.log('created', type, instance && instance.id ? `(${instance.id})` : '');
  }
  return instance;
}

// Password defaults (can be overridden by env vars)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'password123';

async function ensurePasswordForExisting(userInstance, plainPassword) {
  if (!userInstance) return;
  if (isDryRun) {
    console.log('[dry-run] would update password for User', `(${userInstance.email || userInstance.dataValues && userInstance.dataValues.email || userInstance})`);
    return;
  }
  try {
    const hashed = await hashPassword(plainPassword);
    // userInstance may be a model instance or plain object
    if (typeof userInstance.update === 'function') {
      await userInstance.update({ password: hashed });
    } else {
      await User.update({ password: hashed }, { where: { id: userInstance.id } });
    }
    console.log('updated password for', userInstance.email || userInstance.id || userInstance);
  } catch (e) {
    console.log('failed to update password for', userInstance.email || userInstance.id || userInstance, e && e.message);
  }
}

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
  // Passwords used by seeder
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'password123';

  // compute password hashes once
  const adminHash = await hashPassword(ADMIN_PASSWORD);
  const defaultHash = await hashPassword(DEFAULT_PASSWORD);

  // Allow automation via env var DB_RESET (values: recreate|truncate|none)
  let dbResetChoice = process.env.DB_RESET || null;
  // Ask at startup unless run-all or report mode; include dry-run so user can preview reset choice
  if (!dbResetChoice && !runAllFlagGlobal && !reportMode) {
    const ans = (await ask('Database reset? (r)ecreate/(t)runcate/(n)o: ')).toLowerCase();
    if (ans === 'q') process.exit(0);
    if (ans === 'r' || ans === 'recreate') dbResetChoice = 'recreate';
    else if (ans === 't' || ans === 'truncate') dbResetChoice = 'truncate';
    else dbResetChoice = 'none';
  } else if (!dbResetChoice) {
    // In dry-run/report or run-all: default to 'none' unless env overrides
    dbResetChoice = 'none';
  }

  async function truncateAllModels() {
    const models = [Message, AuditLog, Course, Degree, Department, User];
    for (const M of models) {
      console.log('Truncating', M.name);
      // Use truncate API where available
      if (M && typeof M.truncate === 'function') {
        await M.truncate({ cascade: true, restartIdentity: true });
      } else {
        await M.destroy({ where: {}, truncate: true, cascade: true });
      }
    }
  }

  if (isDryRun || reportMode) {
    console.log('Dry-run/report enabled: skipping sequelize.sync and destructive cleanup');
    if (dbResetChoice === 'recreate') console.log('[dry-run] would recreate database (sequelize.sync({ force: true }))');
    else if (dbResetChoice === 'truncate') console.log('[dry-run] would truncate all tables');
  } else {
    if (dbResetChoice === 'recreate') {
      console.log('Recreating database (this will drop and recreate all tables)...');
      await sequelize.sync({ force: true });
      console.log('Database recreated.');
    } else if (dbResetChoice === 'truncate') {
      console.log('Truncating all tables...');
      await truncateAllModels();
      console.log('All tables truncated.');
    } else {
      console.log('Skipping database reset.');
    }
  }

  // Compute dynamic enrollment window: today - 5 days .. today + 25 days
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 5);
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + 25);
  function fmtDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const DEFAULT_ENROLL_START = fmtDate(startDate);
  const DEFAULT_ENROLL_END = fmtDate(endDate);

  // Admin user will be created in interactive flow (or via doUsers), unless --report or --dry-run

  // Prefer seeded JSON file with complete data if available
  const fs = require('fs');
  const path = require('path');
  const seedPath = path.join(__dirname, 'seed-data.json');

  if (fs.existsSync(seedPath)) {
    console.log('Found seed-data.json — loading JSON seed.');
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

      // Normalize courses_per_semester in seed degrees to ensure each semester has { count, enrollment_start, enrollment_end }
      if (Array.isArray(seed.degrees)) {
        for (const dg of seed.degrees) {
          if (!dg.courses_per_semester) dg.courses_per_semester = { '1': { count: 4 }, '2': { count: 4 } };
          for (const sem of Object.keys(dg.courses_per_semester)) {
            const entry = dg.courses_per_semester[sem];
            if (entry && typeof entry === 'object') {
              if (!('count' in entry)) entry.count = Number(entry) || 0;
              if (!entry.enrollment_start) entry.enrollment_start = DEFAULT_ENROLL_START;
              if (!entry.enrollment_end) entry.enrollment_end = DEFAULT_ENROLL_END;
            } else {
              // numeric value -> convert
              dg.courses_per_semester[sem] = { count: Number(entry || 0), enrollment_start: DEFAULT_ENROLL_START, enrollment_end: DEFAULT_ENROLL_END };
            }
          }
        }
      }

      // re-use top-level ask(question)

      // Report-only mode: print deterministic mapping and exit
      if (reportMode) {
        console.log('\nSeed report (departments → degrees → courses):\n');
        const deps = seed.departments || [];
        const degs = seed.degrees || [];
        const courses = seed.courses || [];
        for (const d of deps) {
          const code = (d.code || '').toUpperCase();
          console.log(`- ${code}: ${d.name}`);
          const dDegrees = degs.filter(x => ((x.department_code || '').toUpperCase()) === code);
          for (const dg of dDegrees) {
            const degCode = (dg.code || '').toUpperCase();
            console.log(`  - ${degCode}: ${dg.name}`);
            const degCourses = courses.filter(c => ((c.degree_code || '').toUpperCase()) === degCode);
            for (const c of degCourses) {
              console.log(`    - ${ (c.code || '').toUpperCase() }: ${c.name}`);
            }
          }
        }
        process.exit(0);
      }

      // Interactive seeding steps: [users (admin/HOD/faculty), departments, degrees, students, courses]
  const createdDepartments = {};
  const facultyByDept = {};
  const createdDegrees = {};
  const degreeAssignIndex = {};
  const courseAssignIndex = {};
  let studentsCreated = false;

  let runAll = runAllFlagGlobal || false;

      // Helper: create HODs, faculty and students for each department
      async function doUsers() {
        for (const d of seed.departments || []) {
          const code = (d.code || '').toUpperCase();
          const deptName = d.name || code;
          facultyByDept[code] = facultyByDept[code] || [];

          // Skip departments not created from seed (we create departments in the departments step only)
          if (!createdDepartments[code]) {
            console.log(`Skipping users for department ${code} — department not present in DB (create departments first).`);
            continue;
          }

          // HOD
          const hodFirst = faker.person.firstName();
          const hodLast = faker.person.lastName();
          const hodEmail = makeCleanEmail(hodFirst, hodLast);
          if (!isDryRun) {
            const existingHod = await User.findOne({ where: { email: hodEmail } });
            if (existingHod) {
              await ensurePasswordForExisting(existingHod, DEFAULT_PASSWORD);
              facultyByDept[code].push(existingHod);
            } else {
              const hod = await create(User, {
                created_at: new Date(),
                id: uuidv4(), first_name: hodFirst, last_name: hodLast, email: hodEmail,
                password: defaultHash, user_type: 'faculty', employee_id: `HOD${code}`,
                department_code: code, status: 'active', email_verified: true, is_head_of_department: true,
              });
              facultyByDept[code].push(hod);
            }
          } else {
            const hod = await create(User, {
              created_at: new Date(),
              id: uuidv4(), first_name: hodFirst, last_name: hodLast, email: hodEmail,
              password: defaultHash, user_type: 'faculty', employee_id: `HOD${code}`,
              department_code: code, status: 'active', email_verified: true, is_head_of_department: true,
            });
            facultyByDept[code].push(hod);
          }

          // Additional faculty (2)
          for (let f = 0; f < 2; f++) {
            const first = faker.person.firstName();
            const last = faker.person.lastName();
            const email = makeCleanEmail(first, last);
            if (!isDryRun) {
              const existing = await User.findOne({ where: { email } });
              if (existing) { await ensurePasswordForExisting(existing, DEFAULT_PASSWORD); facultyByDept[code].push(existing); continue; }
            }
            const faculty = await create(User, {
              created_at: new Date(),
              id: uuidv4(), first_name: first, last_name: last, email,
              password: defaultHash, user_type: 'faculty', employee_id: `EMP${code}${f + 1}`,
              department_code: code, status: 'active', email_verified: true, is_head_of_department: false,
            });
            facultyByDept[code].push(faculty);
          }

          // Students: attach to an existing degree for this department
          const seedDegreesForDept = (seed.degrees || []).filter(dd => ((dd.department_code || '').toUpperCase()) === code);
          let degreeCodeToUse = null;
          if (seedDegreesForDept.length > 0) {
            degreeCodeToUse = (seedDegreesForDept[0].code || '').toUpperCase();
            if (!createdDegrees[degreeCodeToUse] && !isDryRun) {
              const existing = await Degree.findOne({ where: { code: degreeCodeToUse } });
              if (existing) createdDegrees[degreeCodeToUse] = existing;
            }
          }
          if (!degreeCodeToUse) {
            const found = Object.values(createdDegrees || {}).find(dd => ((dd.department_code || dd.dataValues && dd.dataValues.department_code || '').toUpperCase()) === code);
            if (found) degreeCodeToUse = (found.code || found.dataValues && found.dataValues.code || '').toUpperCase();
          }
          if (!degreeCodeToUse) {
            console.log(`No degree found for department ${code}; skipping student creation for this department.`);
            continue;
          }

          for (let s = 0; s < 10; s++) {
            const first = faker.person.firstName();
            const last = faker.person.lastName();
            const email = `${first}.${last}.${Math.floor(Math.random() * 1000)}@myskytower.com`.replace(/\s+/g, '.').toLowerCase();
            if (!isDryRun) {
              const existing = await User.findOne({ where: { email } });
              if (existing) { await ensurePasswordForExisting(existing, DEFAULT_PASSWORD); continue; }
            }
            const student = await create(User, {
              created_at: new Date(),
              id: uuidv4(), first_name: first, last_name: last, email,
              password: defaultHash, user_type: 'student', student_id: `STU${code}${s + 1}`,
              degree_code: degreeCodeToUse, department_code: code, status: 'active', email_verified: true,
              enrolled_year: new Date().getFullYear(), current_semester: 1,
            });
            const yearStart = new Date().getFullYear();
            const academicYear = `${yearStart}-${yearStart + 1}`;
            await create(Enrollment, {
              created_at: new Date(),
              id: uuidv4(), student_id: student.id, course_codes: [], enrollment_status: 'draft', submitted_at: null,
              academic_year: academicYear, semester: 1, department_code: code,
            });
          }
        }
        studentsCreated = true;
      }

      // Combined helper: create faculty, then degrees, then students in a single step
      async function doFacultyDegreesStudents(adminUser) {
        // 1) Create faculty (HOD + additional faculty)
        for (const d of seed.departments || []) {
          const code = (d.code || '').toUpperCase();
          facultyByDept[code] = facultyByDept[code] || [];

          // Ensure department exists
          if (!createdDepartments[code]) {
            if (!isDryRun) {
              const existingDept = await Department.findOne({ where: { code } });
              if (!existingDept) {
                console.log(`Skipping faculty for ${code} — department not found in DB`);
                continue;
              }
              createdDepartments[code] = existingDept;
            } else {
              // dry-run: assume department will be created
              createdDepartments[code] = { id: uuidv4(), code, name: d.name };
            }
          }

          // HOD
          const hodFirst = faker.person.firstName();
          const hodLast = faker.person.lastName();
          const hodEmail = makeCleanEmail(hodFirst, hodLast);
          if (!isDryRun) {
            const existingHod = await User.findOne({ where: { email: hodEmail } });
            if (existingHod) {
              await ensurePasswordForExisting(existingHod, DEFAULT_PASSWORD);
              facultyByDept[code].push(existingHod);
            } else {
              const hod = await create(User, {
                created_at: new Date(),
                id: uuidv4(), first_name: hodFirst, last_name: hodLast, email: hodEmail,
                password: defaultHash, user_type: 'faculty', employee_id: `HOD${code}`,
                department_code: code, status: 'active', email_verified: true, is_head_of_department: true,
              });
              facultyByDept[code].push(hod);
            }
          } else {
            const hod = await create(User, {
              created_at: new Date(),
              id: uuidv4(), first_name: hodFirst, last_name: hodLast, email: hodEmail,
              password: defaultHash, user_type: 'faculty', employee_id: `HOD${code}`,
              department_code: code, status: 'active', email_verified: true, is_head_of_department: true,
            });
            facultyByDept[code].push(hod);
          }

          // Additional faculty (2)
          for (let f = 0; f < 2; f++) {
            const first = faker.person.firstName();
            const last = faker.person.lastName();
            const email = makeCleanEmail(first, last);
            if (!isDryRun) {
              const existing = await User.findOne({ where: { email } });
              if (existing) { await ensurePasswordForExisting(existing, DEFAULT_PASSWORD); facultyByDept[code].push(existing); continue; }
            }
            const faculty = await create(User, {
              created_at: new Date(),
              id: uuidv4(), first_name: first, last_name: last, email,
              password: defaultHash, user_type: 'faculty', employee_id: `EMP${code}${f + 1}`,
              department_code: code, status: 'active', email_verified: true, is_head_of_department: false,
            });
            facultyByDept[code].push(faculty);
          }
        }

        // 2) Create degrees (now that faculty exists to be used as created_by)
        await doDegrees(adminUser);

        // 3) Create students for each department (students reference degree_code which now exists)
        for (const d of seed.departments || []) {
          const code = (d.code || '').toUpperCase();
          const deptName = d.name || code;

          // Find degrees created for this department
          const degreesForDept = Object.values(createdDegrees || {}).filter(dd => ((dd.department_code || dd.dataValues && dd.dataValues.department_code || '').toUpperCase()) === code);
          // If none, create a generic degree placeholder
          let degreeCodeToUse = null;
          if (degreesForDept.length === 0) {
            const fallbackCode = `${code}GEN`;
            const fallback = await create(Degree, {
              created_at: new Date(),
              id: uuidv4(), name: `Generic ${deptName} Program`, code: fallbackCode, department_code: code,
              description: `Auto-created placeholder degree for ${deptName}`, duration_years: 1, status: 'active', created_by: null,
            });
            createdDegrees[(fallback.code || fallbackCode).toUpperCase()] = fallback;
            degreeCodeToUse = (fallback.code || fallbackCode).toUpperCase();
          } else {
            degreeCodeToUse = (degreesForDept[0].code || degreesForDept[0].dataValues && degreesForDept[0].dataValues.code || '').toUpperCase();
          }

          for (let s = 0; s < 10; s++) {
            const first = faker.person.firstName();
            const last = faker.person.lastName();
            const email = `${first}.${last}.${Math.floor(Math.random() * 1000)}@myskytower.com`.replace(/\s+/g, '.').toLowerCase();
            if (!isDryRun) {
              const existing = await User.findOne({ where: { email } });
              if (existing) { await ensurePasswordForExisting(existing, DEFAULT_PASSWORD); continue; }
            }
            const student = await create(User, {
              created_at: new Date(),
              id: uuidv4(), first_name: first, last_name: last, email,
              password: defaultHash, user_type: 'student', student_id: `STU${code}${s + 1}`,
              degree_code: degreeCodeToUse, department_code: code, status: 'active', email_verified: true,
              enrolled_year: new Date().getFullYear(), current_semester: 1,
            });
            // Create an enrollment record linking the student to their department/semester (no courses yet)
            const yearStart = new Date().getFullYear();
            const academicYear = `${yearStart}-${yearStart + 1}`;
            await create(Enrollment, {
              created_at: new Date(),
              id: uuidv4(), student_id: student.id, course_codes: [], enrollment_status: 'draft', submitted_at: null,
              academic_year: academicYear, semester: 1, department_code: code,
            });
          }
        }
        studentsCreated = true;
      }

      // Helper: create departments and faculty
      function makeCleanEmail(first, last) {
        return `${first}.${last}`.replace(/\s+/g, '.').replace(/[^a-zA-Z0-9.]/g, '').toLowerCase() + '@myskytower.com';
      }

      async function doDepartments() {
              for (const d of seed.departments || []) {
                const code = (d.code || '').toUpperCase();
                // Skip if already created during users step
                if (createdDepartments[code]) continue;
                // Skip if department exists in DB
                if (!isDryRun) {
                  const existing = await Department.findOne({ where: { code } });
                  if (existing) { createdDepartments[code] = existing; continue; }
                }
                const dept = await create(Department, {
                  created_at: new Date(),
                  id: d.id || uuidv4(),
                  name: d.name,
                  code,
                  description: d.description || '',
                  status: d.status || 'active',
                });
                createdDepartments[code] = dept;
              }
      }

      async function doDegrees(adminUser) {
        for (const dg of seed.degrees || []) {
            const degCodeCheck = (dg.code || '').toUpperCase();
            // Skip if we already created this degree earlier (e.g. when students were created in Step 1)
            if (createdDegrees[degCodeCheck]) {
              continue;
            }
            // If degree exists in DB already, reuse it
            if (!isDryRun) {
              const existingDeg = await Degree.findOne({ where: { code: degCodeCheck } });
              if (existingDeg) {
                createdDegrees[degCodeCheck] = existingDeg;
                continue;
              }
            }
          const deptCode = (dg.department_code || '').toUpperCase();
          const deptFaculty = (facultyByDept[deptCode] || []).slice(1);
          let assignUserId = adminUser.id;
          if (deptFaculty.length > 0) {
            degreeAssignIndex[deptCode] = degreeAssignIndex[deptCode] || 0;
            const pick = deptFaculty[degreeAssignIndex[deptCode] % deptFaculty.length];
            assignUserId = pick.id;
            degreeAssignIndex[deptCode]++;
          }
          const deg = await create(Degree, {
            created_at: new Date(),
            id: dg.id || uuidv4(),
            name: dg.name,
            code: (dg.code || '').toUpperCase(),
            description: dg.description || '',
            specializations: dg.specializations || '',
            career_prospects: dg.career_prospects || '',
            admission_requirements: dg.admission_requirements || '',
            accreditation: dg.accreditation || '',
            fees: dg.fees || '',
            entry_requirements: dg.entry_requirements || '',
            learning_outcomes: dg.learning_outcomes || '',
            assessment_methods: dg.assessment_methods || '',
            contact_information: dg.contact_information || '',
            application_deadlines: dg.application_deadlines || '',
            application_process: dg.application_process || '',
            duration_years: dg.duration_years || 2,
            department_code: deptCode,
            status: dg.status || 'active',
            prerequisites: dg.prerequisites || '',
            study_details: dg.study_details || '',
            faculty_details: dg.faculty_details || '',
            courses_per_semester: dg.courses_per_semester || {},
            created_by: assignUserId,
          });
          createdDegrees[deg.code] = deg;
        }
        // ensure degree counts divisible and generate missing courses list
      }

      async function doCourses(adminUser) {
        const allCoursesToCreate = [];
        const seedDegreesByCode = {};
        for (const dg of seed.degrees || []) seedDegreesByCode[(dg.code || '').toUpperCase()] = dg;

        for (const code of Object.keys(createdDegrees)) {
          const deg = createdDegrees[code];
          const coursesPerSemester = (seedDegreesByCode[deg.code] && seedDegreesByCode[deg.code].courses_per_semester) || deg.courses_per_semester || { '1': 4, '2': 4 };
          let expectedCourses = 0;
          for (const k of Object.keys(coursesPerSemester)) {
            const v = coursesPerSemester[k];
            if (v && typeof v === 'object' && 'count' in v) expectedCourses += Number(v.count || 0);
            else expectedCourses += Number(v || 0);
          }
          const existingSeedCourses = (seed.courses || []).filter(c => ((c.degree_code || '').toUpperCase()) === deg.code);
          let existingCount = existingSeedCourses.length;
          for (const c of existingSeedCourses) allCoursesToCreate.push(c);
          let genIndex = existingCount + 1;
          while (existingCount < expectedCourses) {
            const courseCode = `${deg.code}C${genIndex}`;
            const courseName = `${deg.name} Course ${genIndex}`;
            allCoursesToCreate.push({
              id: uuidv4(), name: courseName, code: courseCode, degree_code: deg.code, department_code: deg.department_code,
              semester: genIndex % 2 === 0 ? 2 : 1, credits: 4, description: `<p>Automatically generated course ${courseName}</p>`, status: 'active', created_by: null,
            });
            existingCount++; genIndex++;
          }
        }

        // Create courses and assign to non-HOD faculty
        for (const c of allCoursesToCreate) {
          const deptCode = (c.department_code || '').toUpperCase();
          const deptFaculty = (facultyByDept[deptCode] || []).slice(1);
          courseAssignIndex[deptCode] = courseAssignIndex[deptCode] || 0;
          const pick = deptFaculty.length ? deptFaculty[courseAssignIndex[deptCode] % deptFaculty.length] : null;
          let assignUserId = null;
          if (pick && pick.id) {
            if (isDryRun) {
              assignUserId = pick.id;
            } else {
              // verify the picked user exists in DB (avoid FK issues)
              const u = await User.findByPk(pick.id);
              assignUserId = u ? pick.id : (adminUser && adminUser.id ? adminUser.id : null);
            }
          } else {
            assignUserId = (adminUser && adminUser.id) ? adminUser.id : null;
          }
          courseAssignIndex[deptCode]++;

          // Set primary_instructor to the creator if they are a faculty from the same department
          let primaryInstructorId = null;
          if (pick && pick.id && pick.user_type === 'faculty' && pick.department_code && pick.department_code.toUpperCase() === deptCode) {
            primaryInstructorId = pick.id;
          }

          await create(Course, {
            created_at: new Date(),
            id: c.id || uuidv4(),
            name: c.name,
            code: (c.code || '').toUpperCase(),
            description: c.description || null,
            prerequisites: c.prerequisites || [],
            learning_objectives: c.learning_objectives || null,
            course_outcomes: c.course_outcomes || null,
            assessment_methods: c.assessment_methods || null,
            textbooks: c.textbooks || null,
            references: c.references || null,
            faculty_details: c.faculty_details || null,
            study_details: c.study_details || null,
            credits: c.credits || 4,
            semester: c.semester || 1,
            department_code: deptCode,
            degree_code: (c.degree_code || '').toUpperCase(),
            status: c.status || 'active',
            created_by: assignUserId,
            primary_instructor: primaryInstructorId,
            max_students: 100,
          });
        }
      }

      // Interactive orchestration (reordered):
      //  - create admin (always, first)
      //  - Step 1: departments
      //  - Step 2: degrees
      //  - Step 3: users (HODs, faculty, students)
      //  - Step 4: courses

      // Ensure admin exists first (departments, degrees and users reference created_by/assignments)
      let adminUser = null;
      if (isDryRun) {
        console.log('[dry-run] would ensure admin user exists: admin@myskytower.com');
        adminUser = { id: '00000000-0000-0000-0000-000000000000', email: 'admin@myskytower.com' };
      } else {
        adminUser = await User.findOne({ where: { email: 'admin@myskytower.com' } });
        if (adminUser) {
          await ensurePasswordForExisting(adminUser, ADMIN_PASSWORD);
        } else {
          adminUser = await create(User, {
            created_at: new Date(),
            id: uuidv4(), first_name: 'Admin', last_name: 'User', email: 'admin@myskytower.com',
            password: adminHash, user_type: 'admin', employee_id: 'ADMIN001', status: 'active', email_verified: true,
          });
        }
      }

      // Step 1: departments (create only departments present in seed)
      if (!runAll) {
        const ans = (await ask('Step 1 — Create departments from seed? (y)es/(n)o/(a)ll/(q)uit: ')).toLowerCase();
        if (ans === 'q') process.exit(0);
        if (ans === 'a') runAll = true;
        if (ans === 'y' || runAll) {
          await doDepartments();
          console.log('Departments created/ready');
        }
      } else {
        await doDepartments();
        console.log('Departments created/ready');
      }

      // Step 2: Create faculty, degrees and students in one combined step
      if (!runAll) {
        const ans = (await ask('Step 2 — Create faculty, degrees and students from seed (combined)? (y)es/(n)o/(a)ll/(q)uit: ')).toLowerCase();
        if (ans === 'q') process.exit(0);
        if (ans === 'a') runAll = true;
        if (ans === 'y' || runAll) {
          await doFacultyDegreesStudents(adminUser);
          console.log('Faculty, degrees and students created/ready');
        }
      } else {
        await doFacultyDegreesStudents(adminUser);
        console.log('Faculty, degrees and students created/ready');
      }

      // Step 4: courses
      if (!runAll) {
        const ans = (await ask('Step 4 — Create courses? (y)es/(n)o/(a)ll/(q)uit: ')).toLowerCase();
        if (ans === 'q') process.exit(0);
        if (ans === 'a') runAll = true;
        if (ans === 'y' || runAll) {
          await doCourses();
          console.log('Courses created/ready');
        }
      } else {
        await doCourses();
        console.log('Courses created/ready');
      }

      console.log('Completed JSON seeding (interactive mode).');
      process.exit(0);
    }

  console.log('No seed-data.json found. The fallback dynamic generator was removed to simplify the seeder.');
  console.log('Please provide backend/scripts/seed-data.json with departments, degrees and courses, or re-enable the generator if you want automatic generation.');
  process.exit(1);
}

if (require.main === module) {
  seedTestData();
}
