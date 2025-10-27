import VisibilityIcon from '@mui/icons-material/Visibility';
import CollaboratorManager from '../../components/common/CollaboratorManager';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tab,
  Tabs,
  IconButton,
  Chip,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import GroupIcon from '@mui/icons-material/Group';
import SchoolIcon from '@mui/icons-material/School';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/router';
import { degreesAPI } from '../../services/api';
import { coursesAPI } from '../../services/api';
import { enrollmentsAPI } from '../../services/api';
import { CourseWithEnrollmentStatus as Course } from '../../services/types';



const statusOptions = ['all', 'active', 'approved', 'pending approval', 'draft', 'archived'];
const enrollmentStatusOptions = ['all', 'approved', 'pending approval', 'draft'];

function a11yProps(index: number) {
  return {
    id: `department-tab-${index}`,
    'aria-controls': `department-tabpanel-${index}`,
  };
}

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`department-tabpanel-${index}`}
      aria-labelledby={`department-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const DepartmentManagementPage = () => {
  // Collaborator dialog state (must be inside component)
  const [collabDialogOpen, setCollabDialogOpen] = useState(false);
  const [collabDialogType, setCollabDialogType] = useState<'degree' | 'course' | null>(null);
  const [collabDialogItem, setCollabDialogItem] = useState<any>(null);
  const [collabAddEmail, setCollabAddEmail] = useState('');
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);

  // Open dialog handler
  const openCollaborationDialog = (item: any, type: 'degree' | 'course') => {
    setCollabDialogItem(item);
    setCollabDialogType(type);
    setCollabDialogOpen(true);
    setCollabAddEmail('');
    setCollabError(null);
  };

  const closeCollaborationDialog = () => {
    setCollabDialogOpen(false);
    setCollabDialogItem(null);
    setCollabDialogType(null);
    setCollabAddEmail('');
    setCollabError(null);
  };

  // View entity handler (opens in new tab or navigates)
  const viewEntity = (entity: any, type: 'degree' | 'course') => {
    const url = `/${type}/${entity.id}`;
    try {
      if (typeof window !== 'undefined' && window.open) {
        window.open(url, '_blank');
      } else {
        router.push(url);
      }
    } catch (err) {
      router.push(url);
    }
  };

  const router = useRouter();
  const [currentTab, setCurrentTab] = useState(0);
  const [degrees, setDegrees] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [degreesStatusFilter, setDegreesStatusFilter] = useState('active');
  const [coursesStatusFilter, setCoursesStatusFilter] = useState('active');
  const [enrollmentsStatusFilter, setEnrollmentsStatusFilter] = useState('all');
  const [degreesPage, setDegreesPage] = useState(0);
  const [degreesRowsPerPage, setDegreesRowsPerPage] = useState(10);
  const [coursesPage, setCoursesPage] = useState(0);
  const [coursesRowsPerPage, setCoursesRowsPerPage] = useState(10);
  const [enrollmentsPage, setEnrollmentsPage] = useState(0);
  const [enrollmentsRowsPerPage, setEnrollmentsRowsPerPage] = useState(10);
  const currentYear = new Date().getFullYear().toString();
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [degreeFilter, setDegreeFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [loadingDegrees, setLoadingDegrees] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  // State for student name filter and course popup
  const [studentNameFilter, setStudentNameFilter] = useState('');
  const [coursePopupOpen, setCoursePopupOpen] = useState(false);
  const [popupCourses, setPopupCourses] = useState<any[]>([]);
  const [popupStudent, setPopupStudent] = useState<string>('');

  // Map UI status labels to backend status codes
  const mapStatusToBackend = (status: string) => {
    if (!status || status === 'all') return undefined;
    const s = status.toLowerCase();
    if (s === 'pending approval') return 'pending_approval';
    // keep other common mappings stable
    if (s === 'archived') return 'archived';
    if (s === 'active') return 'active';
    if (s === 'approved') return 'approved';
    if (s === 'draft') return 'draft';
    return status;
  };

  // Fetch degrees with filters and pagination
  useEffect(() => {
    setLoadingDegrees(true);
    degreesAPI.getDegrees({
      status: mapStatusToBackend(degreesStatusFilter),
      page: degreesPage + 1,
      pageSize: degreesRowsPerPage
    })
      .then((res: any) => setDegrees(res.degrees || []))
      .finally(() => setLoadingDegrees(false));
  }, [degreesStatusFilter, degreesPage, degreesRowsPerPage]);

  // Fetch courses with filters and pagination
  useEffect(() => {
    setLoadingCourses(true);
    coursesAPI.getCourses({
      status: mapStatusToBackend(coursesStatusFilter),
      page: coursesPage + 1,
      pageSize: coursesRowsPerPage
    })
      .then((res: any) => setCourses(res.courses || []))
      .finally(() => setLoadingCourses(false));
  }, [coursesStatusFilter, coursesPage, coursesRowsPerPage]);

  // Fetch enrollments with filters and pagination
  useEffect(() => {
    const handler = setTimeout(() => {
      setLoadingEnrollments(true);
      enrollmentsAPI.getEnrollments({
        status: mapStatusToBackend(enrollmentsStatusFilter),
        year: yearFilter !== 'all' ? yearFilter : undefined,
        degree: degreeFilter !== 'all' ? degreeFilter : undefined,
        course: courseFilter !== 'all' ? courseFilter : undefined,
        semester: semesterFilter !== 'all' ? semesterFilter : undefined,
        page: enrollmentsPage + 1,
        pageSize: enrollmentsRowsPerPage,
        search: studentNameFilter && studentNameFilter.trim() !== '' ? studentNameFilter.trim() : undefined
      })
        .then((data: any) => {
          let arr = [];
          if (Array.isArray(data)) arr = data;
          else if (data && Array.isArray(data.enrollments)) arr = data.enrollments;
          setEnrollments(arr);
        })
        .finally(() => setLoadingEnrollments(false));
    }, 400);
    return () => clearTimeout(handler);
  }, [enrollmentsStatusFilter, yearFilter, degreeFilter, courseFilter, semesterFilter, enrollmentsPage, enrollmentsRowsPerPage, studentNameFilter]);

  // Dummy filter helpers (replace with your actual logic)
  const filterByStatus = (items: any[], status: string) => {
    if (status === 'all') return items;
    return items.filter(item => item.status === status);
  };

  // Enrollment filter helpers
  const safeEnrollments = Array.isArray(enrollments) ? enrollments : [];
  const years = useMemo(() => Array.from(new Set(safeEnrollments.map(e => (e.createdAt ? new Date(e.createdAt).getFullYear() : '')))).filter(Boolean), [safeEnrollments]);
  const degreesForEnroll = useMemo(() => Array.from(new Set(safeEnrollments.map(e => e.course?.degree?.name).filter(Boolean))), [safeEnrollments]);
  const coursesForEnroll = useMemo(() => Array.from(new Set(safeEnrollments.map(e => e.course?.name).filter(Boolean))), [safeEnrollments]);
  const semesters = useMemo(() => Array.from(new Set(safeEnrollments.map(e => e.semester).filter(Boolean))), [safeEnrollments]);
  const filteredEnrollments = useMemo(() => safeEnrollments.filter(e => {
    if (yearFilter !== 'all' && new Date(e.createdAt!).getFullYear().toString() !== yearFilter) return false;
    if (degreeFilter !== 'all' && e.student?.degree?.name !== degreeFilter) return false;
    if (semesterFilter !== 'all' && String(e.semester) !== semesterFilter) return false;
    if (studentNameFilter && !(e.student?.first_name + ' ' + e.student?.last_name).toLowerCase().includes(studentNameFilter.toLowerCase())) return false;
    return true;
  }), [safeEnrollments, yearFilter, degreeFilter, semesterFilter, studentNameFilter]);

  return (
  <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 2 }, minHeight: '100vh' }}>
      <Box sx={{ py: { xs: 2, sm: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h4" component="h1" align="center" fontSize={{ xs: 22, sm: 32 }}>
              Department Management
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" align="center" fontSize={{ xs: 14, sm: 18 }}>
              Manage degrees, courses, and enrollments for your department
            </Typography>
          </Box>
        </Box>
        <Paper elevation={2} sx={{ width: '100%', overflowX: 'auto' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} aria-label="Department management tabs" sx={{ px: 2 }} variant="scrollable" scrollButtons="auto">
              <Tab icon={<SchoolIcon />} label="Degrees" {...a11yProps(0)} sx={{ minHeight: 48, fontSize: { xs: 12, sm: 16 } }} />
              <Tab icon={<BusinessIcon />} label="Courses" {...a11yProps(1)} sx={{ minHeight: 48, fontSize: { xs: 12, sm: 16 } }} />
              <Tab icon={<GroupIcon />} label="Enrollments" {...a11yProps(2)} sx={{ minHeight: 48, fontSize: { xs: 12, sm: 16 } }} />
            </Tabs>
          </Box>
          {/* Degrees Tab */}
          <TabPanel value={currentTab} index={0}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
                <Typography>Status Filter:</Typography>
                <select value={degreesStatusFilter} onChange={e => setDegreesStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px' }}>
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
              </Box>
              {loadingDegrees ? (
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" py={8}>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">Loading degrees...</Typography>
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Creator</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filterByStatus(degrees, degreesStatusFilter)
                        .slice(degreesPage * degreesRowsPerPage, degreesPage * degreesRowsPerPage + degreesRowsPerPage)
                        .map(degree => {
                          const fullDegree = degrees.find(d => d.id === degree.id) || degree;
                          return (
                            <TableRow key={degree.id}>
                              <TableCell>{degree.name}</TableCell>
                              <TableCell>{degree.code}</TableCell>
                              <TableCell>
                                {degree.creator ? `${degree.creator.first_name} ${degree.creator.last_name}` : '-'}
                                {Array.isArray(degree.collaborators) && degree.collaborators.length > 0 && (
                                  <Tooltip title="This degree has collaborators">
                                    <GroupIcon color="primary" fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
                                  </Tooltip>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={
                                    degree.status === 'pending_approval' ? 'Pending Approval'
                                    : degree.status === 'active' ? 'Active'
                                    : degree.status === 'approved' ? 'Approved'
                                    : degree.status === 'draft' ? 'Draft'
                                    : degree.status === 'archived' ? 'Archived'
                                    : degree.status ? degree.status.charAt(0).toUpperCase() + degree.status.slice(1) : ''
                                  }
                                  size="small"
                                  color={
                                    degree.status?.toLowerCase() === 'approved' ? 'success'
                                    : degree.status?.toLowerCase() === 'active' ? 'success'
                                    : degree.status?.toLowerCase() === 'pending approval' ? 'warning'
                                    : degree.status?.toLowerCase() === 'draft' ? 'default'
                                    : degree.status?.toLowerCase() === 'archived' ? 'default'
                                    : 'default'
                                  }
                                  sx={
                                    degree.status?.toLowerCase() === 'draft' ? { bgcolor: '#bdbdbd', color: '#fff' }
                                    : degree.status?.toLowerCase() === 'archived' ? { bgcolor: '#bdbdbd', color: '#fff' }
                                    : {}
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Tooltip title="Collaborate">
                                  <IconButton onClick={() => openCollaborationDialog(fullDegree, 'degree')}>
                                    <GroupIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="View">
                                  <IconButton onClick={() => viewEntity(fullDegree, 'degree')}>
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={filterByStatus(degrees, degreesStatusFilter).length}
                    page={degreesPage}
                    onPageChange={(_, newPage) => setDegreesPage(newPage)}
                    rowsPerPage={degreesRowsPerPage}
                    onRowsPerPageChange={e => { setDegreesRowsPerPage(parseInt(e.target.value, 10)); setDegreesPage(0); }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                  />
                </TableContainer>
              )}
            </Box>
          </TabPanel>
          {/* Courses Tab */}
          <TabPanel value={currentTab} index={1}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
                <Typography>Status Filter:</Typography>
                <select value={coursesStatusFilter} onChange={e => setCoursesStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: '4px' }}>
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
              </Box>
              {loadingCourses ? (
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" py={8}>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">Loading courses...</Typography>
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Creator</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filterByStatus(courses, coursesStatusFilter)
                        .slice(coursesPage * coursesRowsPerPage, coursesPage * coursesRowsPerPage + coursesRowsPerPage)
                        .map(course => (
                          <TableRow key={course.id}>
                            <TableCell>{course.name}</TableCell>
                            <TableCell>{course.code}</TableCell>
                            <TableCell>
                              {course.creator ? `${course.creator.first_name} ${course.creator.last_name}` : '-'}
                              {Array.isArray(course.collaborators) && course.collaborators.length > 0 && (
                                <Tooltip title="This course has collaborators">
                                  <GroupIcon color="primary" fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={
                                  course.status === 'pending_approval' ? 'Pending Approval'
                                  : course.status === 'active' ? 'Active'
                                  : course.status === 'approved' ? 'Approved'
                                  : course.status === 'draft' ? 'Draft'
                                  : course.status === 'archived' ? 'Archived'
                                  : course.status ? course.status.charAt(0).toUpperCase() + course.status.slice(1) : ''
                                }
                                size="small"
                                color={
                                  course.status?.toLowerCase() === 'approved' ? 'success'
                                  : course.status?.toLowerCase() === 'active' ? 'success'
                                  : course.status?.toLowerCase() === 'pending approval' ? 'warning'
                                  : course.status?.toLowerCase() === 'draft' ? 'default'
                                  : course.status?.toLowerCase() === 'archived' ? 'default'
                                  : 'default'
                                }
                                sx={
                                  course.status?.toLowerCase() === 'draft' ? { bgcolor: '#bdbdbd', color: '#fff' }
                                  : course.status?.toLowerCase() === 'archived' ? { bgcolor: '#bdbdbd', color: '#fff' }
                                  : {}
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Collaborate">
                                <IconButton onClick={() => openCollaborationDialog(course, 'course')}>
                                  <GroupIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View">
                                <IconButton onClick={() => viewEntity(course, 'course')}>
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={filterByStatus(courses, coursesStatusFilter).length}
                    page={coursesPage}
                    onPageChange={(_, newPage) => setCoursesPage(newPage)}
                    rowsPerPage={coursesRowsPerPage}
                    onRowsPerPageChange={e => { setCoursesRowsPerPage(parseInt(e.target.value, 10)); setCoursesPage(0); }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                  />
                </TableContainer>
              )}
            </Box>
          </TabPanel>
          {/* Enrollments Tab */}
          <TabPanel value={currentTab} index={2}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
                <Typography>Status:</Typography>
                <Typography>Student Name:</Typography>
                <TextField
                  size="small"
                  value={studentNameFilter}
                  onChange={e => { setStudentNameFilter(e.target.value); setEnrollmentsPage(0); }}
                  placeholder="Search student name"
                  sx={{ minWidth: 180 }}
                />
                <select value={enrollmentsStatusFilter} onChange={e => { setEnrollmentsStatusFilter(e.target.value); setEnrollmentsPage(0); }} style={{ padding: '8px', borderRadius: '4px' }}>
                  {enrollmentStatusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
                <Typography>Year:</Typography>
                <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setEnrollmentsPage(0); }} style={{ padding: '8px', borderRadius: '4px' }}>
                  <option value="all">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <Typography>Degree:</Typography>
                <select value={degreeFilter} onChange={e => { setDegreeFilter(e.target.value); setEnrollmentsPage(0); }} style={{ padding: '8px', borderRadius: '4px' }}>
                  <option value="all">All Degrees</option>
                  {degreesForEnroll.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <Typography>Course:</Typography>
                <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setEnrollmentsPage(0); }} style={{ padding: '8px', borderRadius: '4px' }}>
                  <option value="all">All Courses</option>
                  {coursesForEnroll.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Typography>Semester:</Typography>
                <select value={semesterFilter} onChange={e => { setSemesterFilter(e.target.value); setEnrollmentsPage(0); }} style={{ padding: '8px', borderRadius: '4px' }}>
                  <option value="all">All Semesters</option>
                  {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Box>
              {loadingEnrollments ? (
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" py={8}>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">Loading enrollments...</Typography>
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Degree</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Semester</TableCell>
                        <TableCell>Year</TableCell>
                        <TableCell>Created At</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredEnrollments
                        .slice(enrollmentsPage * enrollmentsRowsPerPage, enrollmentsPage * enrollmentsRowsPerPage + enrollmentsRowsPerPage)
                        .map(enr => (
                          <TableRow key={enr.id}>
                            <TableCell>{enr.student ? `${enr.student.first_name} ${enr.student.last_name}` : enr.student_id}</TableCell>
                            <TableCell>{enr.student?.degree?.name || ''}</TableCell>
                            <TableCell>
                              <Chip
                                label={
                                  enr.enrollment_status === 'pending_approval' ? 'Pending Approval'
                                  : enr.enrollment_status === 'approved' ? 'Approved'
                                  : enr.enrollment_status === 'draft' ? 'Draft'
                                  : enr.enrollment_status === 'active' ? 'Active'
                                  : enr.enrollment_status === 'archived' ? 'Archived'
                                  : enr.enrollment_status ? enr.enrollment_status.charAt(0).toUpperCase() + enr.enrollment_status.slice(1) : ''
                                }
                                size="small"
                                color={
                                  enr.enrollment_status?.toLowerCase() === 'approved' ? 'success'
                                  : enr.enrollment_status?.toLowerCase() === 'pending approval' ? 'warning'
                                  : enr.enrollment_status?.toLowerCase() === 'draft' ? 'default'
                                  : 'default'
                                }
                                sx={
                                  enr.enrollment_status?.toLowerCase() === 'draft' ? { bgcolor: '#bdbdbd', color: '#fff' }
                                  : {}
                                }
                              />
                            </TableCell>
                            <TableCell>{enr.semester}</TableCell>
                            <TableCell>{enr.createdAt ? new Date(enr.createdAt).getFullYear() : ''}</TableCell>
                            <TableCell>{enr.createdAt ? new Date(enr.createdAt).toLocaleString() : ''}</TableCell>
                            <TableCell>
                              <Tooltip title="View Enrolled Courses">
                                <IconButton onClick={() => {
                                  setPopupCourses(enr.courses || []);
                                  setPopupStudent(enr.student ? `${enr.student.first_name} ${enr.student.last_name}` : enr.student_id);
                                  setCoursePopupOpen(true);
                                }}>
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                              {/* Enrolled Courses Popup */}
                              <Dialog
                                open={coursePopupOpen}
                                onClose={() => setCoursePopupOpen(false)}
                                hideBackdrop
                                maxWidth="sm"
                                fullWidth
                                PaperProps={{ elevation: 8, sx: { boxShadow: 1 } }}
                              >
                                <DialogTitle>Enrolled Courses for {popupStudent}</DialogTitle>
                                <DialogContent>
                                  {popupCourses.length === 0 ? (
                                    <Typography>No courses enrolled.</Typography>
                                  ) : (
                                    <List>
                                      {popupCourses.map((c, idx) => (
                                        <ListItem key={c.id || idx}>
                                          <ListItemText primary={c.name} secondary={c.code} />
                                        </ListItem>
                                      ))}
                                    </List>
                                  )}
                                </DialogContent>
                                <DialogActions>
                                  <Button onClick={() => setCoursePopupOpen(false)}>Close</Button>
                                </DialogActions>
                              </Dialog>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={filteredEnrollments.length}
                    page={enrollmentsPage}
                    onPageChange={(_, newPage) => setEnrollmentsPage(newPage)}
                    rowsPerPage={enrollmentsRowsPerPage}
                    onRowsPerPageChange={e => { setEnrollmentsRowsPerPage(parseInt(e.target.value, 10)); setEnrollmentsPage(0); }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                  />
                </TableContainer>
              )}
            </Box>
          </TabPanel>
        </Paper>
        {/* Collaborator Management Dialog (always mounted at root) */}
        <Dialog
          key={collabDialogType + '-' + (collabDialogItem?.id || '')}
          open={collabDialogOpen}
          onClose={closeCollaborationDialog}
          hideBackdrop
          maxWidth="sm"
          fullWidth
          PaperProps={{ elevation: 8, sx: { boxShadow: 1} }}
        >
          <DialogTitle>
            Manage {collabDialogType === 'degree' ? 'Degree' : 'Course'} Collaborators
          </DialogTitle>
          <DialogContent>
            <div>Collaborator management for: <b>{collabDialogItem?.name}</b></div>
            {collabDialogOpen && collabDialogItem && collabDialogType && (
              <CollaboratorManager
                key={collabDialogType + '-' + (collabDialogItem?.id || '')}
                entity={collabDialogItem}
                entityType={collabDialogType}
                onClose={closeCollaborationDialog}
                onCollaboratorsChanged={(newCollaborators: any[]) => {
                  if (collabDialogType === 'degree') {
                    setDegrees(prev => prev.map(d => d.id === collabDialogItem.id ? { ...d, collaborators: newCollaborators } : d));
                  } else if (collabDialogType === 'course') {
                    setCourses(prev => prev.map(c => c.id === collabDialogItem.id ? { ...c, collaborators: newCollaborators } : c));
                  }
                }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCollaborationDialog}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );

};

export default DepartmentManagementPage;
