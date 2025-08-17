import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Box,
  Chip,
  Alert,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import {
  Add as AddIcon,
  School as SchoolIcon,
  MenuBook as CourseIcon,
  Drafts as DraftIcon,
  PendingActions as PendingIcon,
  CheckCircle as ApproveIcon,
  PlayArrow as ActiveIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { coursesAPI, degreesAPI } from '../../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';
import CreateCourseDialog from '../../components/faculty/CreateCourseDialog';
// import CreateDegreeDialog from '../../components/faculty/CreateDegreeDialog';
import EditCourseConfirmationDialog from '../../components/faculty/EditCourseConfirmationDialog';
import DegreeDialog from '../../components/common/DegreeDialog';
import SubmitForApprovalDialog from '../../components/common/SubmitForApprovalDialog';
import {
  getAvailableEntityActions,
  handleEntityAction,
  getStatusIcon,
  EntityType,
  Entity,
} from './facultyDashboardHelpers';

const NewFacultyDashboard: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [degrees, setDegrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState(0); // 0: Courses, 1: Degrees
  const [courseTab, setCourseTab] = useState(0);
  const [degreeTab, setDegreeTab] = useState(0);
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isHOD = user?.is_head_of_department === true;

  const [editCourseDialogOpen, setEditCourseDialogOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Entity | null>(null);
  const [editDegreeDialogOpen, setEditDegreeDialogOpen] = useState(false);
  const [degreeToEdit, setDegreeToEdit] = useState<Entity | null>(null);
  const [submitCourseDialogOpen, setSubmitCourseDialogOpen] = useState(false);
  const [courseToSubmit, setCourseToSubmit] = useState<Entity | null>(null);
  const [submitDegreeDialogOpen, setSubmitDegreeDialogOpen] = useState(false);
  const [degreeToSubmit, setDegreeToSubmit] = useState<Entity | null>(null);
  // Add create dialogs
  const [createCourseDialogOpen, setCreateCourseDialogOpen] = useState(false);
  const [createDegreeDialogOpen, setCreateDegreeDialogOpen] = useState(false);
  const [degreeDialogMode, setDegreeDialogMode] = useState<'create' | 'edit'>('create');
  const [degreeDialogData, setDegreeDialogData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [coursesData, degreesData] = await Promise.all([
          coursesAPI.getFacultyCourses(user?.department?.id, user?.id),
          degreesAPI.getFacultyDegrees(user?.department?.id),
        ]);
        setCourses(coursesData?.all || []);
        setDegrees(degreesData?.all || []);
      } catch (err) {
        enqueueSnackbar('Error loading data', { variant: 'error' });
        setCourses([]);
        setDegrees([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleAction = async (
    action: string,
    entity: Entity,
    type: EntityType
  ) => {
    if (action === 'submit') {
      if (type === 'course') {
        setCourseToSubmit(entity);
        setSubmitCourseDialogOpen(true);
      } else {
        setDegreeToSubmit(entity);
        setSubmitDegreeDialogOpen(true);
      }
      return;
    }
    if (action === 'edit') {
      if (type === 'course') {
        setCourseToEdit(entity);
        setEditCourseDialogOpen(true);
      } else {
        setDegreeToEdit(entity);
        setEditDegreeDialogOpen(true);
      }
      return;
    }
    // Add navigation for view
    if (action === 'view') {
      if (type === 'course') {
        navigate(`/faculty/course/${entity.id}`);
      }
      // Add degree view navigation if available
      return;
    }
    // Add other actions as needed
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  // Status configs for tabs and overview
  const STATUS_CONFIG = [
    { key: 'draft', label: 'Draft', color: 'default', icon: <DraftIcon style={{ fontSize: 40, color: '#616161' }} /> },
    { key: 'pending_approval', label: 'Pending Approval', color: 'info', icon: <PendingIcon style={{ fontSize: 40, color: '#0288d1' }} /> },
    { key: 'approved', label: 'Approved', color: 'success', icon: <ApproveIcon style={{ fontSize: 40, color: '#2e7d32' }} /> },
    { key: 'active', label: 'Active', color: 'success', icon: <ActiveIcon style={{ fontSize: 40, color: '#388e3c' }} /> },
  ];

  // Tab configs for courses and degrees
  const courseTabsConfig = [
    { key: 'draft', label: 'Draft', color: 'default', icon: <DraftIcon style={{ fontSize: 24, color: '#616161' }} />, entities: courses.filter(c => c.status === 'draft') },
    { key: 'pending_approval', label: 'Pending Approval', color: 'info', icon: <PendingIcon style={{ fontSize: 24, color: '#0288d1' }} />, entities: courses.filter(c => c.status === 'pending_approval' || c.status === 'submitted') },
    { key: 'approved', label: 'Approved', color: 'success', icon: <ApproveIcon style={{ fontSize: 24, color: '#2e7d32' }} />, entities: courses.filter(c => c.status === 'approved') },
    { key: 'active', label: 'Active', color: 'success', icon: <ActiveIcon style={{ fontSize: 24, color: '#388e3c' }} />, entities: courses.filter(c => c.status === 'active') },
  ];
  const degreeTabsConfig = [
    { key: 'draft', label: 'Draft', color: 'default', icon: <DraftIcon style={{ fontSize: 24, color: '#616161' }} />, entities: degrees.filter(d => d.status === 'draft') },
    { key: 'pending_approval', label: 'Pending Approval', color: 'info', icon: <PendingIcon style={{ fontSize: 24, color: '#0288d1' }} />, entities: degrees.filter(d => d.status === 'pending_approval' || d.status === 'submitted') },
    { key: 'approved', label: 'Approved', color: 'success', icon: <ApproveIcon style={{ fontSize: 24, color: '#2e7d32' }} />, entities: degrees.filter(d => d.status === 'approved') },
    { key: 'active', label: 'Active', color: 'success', icon: <ActiveIcon style={{ fontSize: 24, color: '#388e3c' }} />, entities: degrees.filter(d => d.status === 'active') },
  ];

  // Status overview component
  const StatusOverview = ({ items, statusConfig, title }: { items: any[]; statusConfig: any[]; title: React.ReactNode }) => {
    const getStatusCounts = () => {
      const counts: Record<string, number> = {};
      statusConfig.forEach(cfg => { counts[cfg.key] = 0; });
      items.forEach(item => {
        if (counts.hasOwnProperty(item.status)) {
          counts[item.status]++;
        }
      });
      return counts;
    };
    const statusCounts = getStatusCounts();
    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        {statusConfig.map(({ key, label, color, icon }) => (
          <Card key={key} sx={{ textAlign: 'center', minWidth: 180, p: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                {icon}
              </Box>
              <Typography variant="h4">{statusCounts[key]}</Typography>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  // Entity card renderer
  const FacultyItemCard = ({ item, actions, onAction }: { item: any; actions: any[]; onAction: (action: string, item: any) => void }) => (
    <Card key={item.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', mb: 2 }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" component="h2">{item.name}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {/* ...existing code... */}
        </Box>
        {/* ...existing code... */}
        {item.department && (
          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
            Dept: {item.department.name}
          </Typography>
        )}
        {item.degree && (
          <Typography variant="caption" display="block" sx={{ mb: 2 }}>
            Degree: {item.degree.name}
          </Typography>
        )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {item.is_elective && <Chip label="Elective" variant="outlined" size="small" />}
          </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {(item.version_code || item.code) + (item.credits ? ` • ${item.credits} Credits • Semester ${item.semester}` : item.duration_years ? ` • ${item.duration_years} Years` : '')}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }} noWrap>{item.overview || item.description}</Typography>
        {item.rejection_reason && item.status === 'draft' && (
          <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'error.main' }}>
              📋 Requires Revision
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.5, color: 'error.dark' }}>
              {item.rejection_reason}
            </Typography>
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'error.light' }}>
              <Typography variant="caption" sx={{ color: 'error.main', fontStyle: 'italic' }}>
                💡 Please address the feedback above and resubmit for approval.
              </Typography>
            </Box>
          </Alert>
        )}
          {/* ...existing code... */}
      </CardContent>
      <CardActions sx={{ pt: 0 }}>
        {actions.map((action, index) => (
          <Button key={index} size="small" startIcon={action.icon} onClick={() => onAction(action.action, item)}>
            {action.label}
          </Button>
        ))}
      </CardActions>
    </Card>
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Faculty Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">Manage your courses and degrees</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<SchoolIcon />}
          onClick={() => {
            setDegreeDialogMode('create');
            setDegreeDialogData(null);
            setCreateDegreeDialogOpen(true);
          }}
        >
          Create Degree
        </Button>
        <Button
          variant="contained"
          startIcon={<CourseIcon />}
          onClick={() => setCreateCourseDialogOpen(true)}
        >
          Create New Course
        </Button>
      </Box>
      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 3 }}>
        <Tab label="Courses" />
        <Tab label="Degrees" />
      </Tabs>
      {/* Courses Tab */}
      {mainTab === 0 && (
        <>
          <StatusOverview items={courses} statusConfig={STATUS_CONFIG} title={<span>Course Status Overview</span>} />
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              My Courses ({courses.length})
            </Typography>
          </Box>
          <Tabs value={courseTab} onChange={(_, v) => setCourseTab(v)} variant="fullWidth" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            {courseTabsConfig.map((tab, index) => (
              <Tab key={tab.key} icon={tab.icon} iconPosition="start" label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{tab.label}<Chip label={tab.entities.length} size="small" color={tab.color as any} sx={{ ml: 1 }} /></Box>} />
            ))}
          </Tabs>
          {courseTabsConfig.map((tab, index) => (
            <Box key={tab.key} role="tabpanel" hidden={courseTab !== index} sx={{ mt: 2 }}>
              {courseTab === index && (
                tab.entities.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 2 }}>No courses in {tab.label.toLowerCase()} status.</Alert>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
                    {tab.entities.map(course => (
                      <FacultyItemCard item={course} actions={getAvailableEntityActions(course, 'course', isHOD)} onAction={(action, item) => handleAction(action, item, 'course')} />
                    ))}
                  </Box>
                )
              )}
            </Box>
          ))}
        </>
      )}
      {/* Degrees Tab */}
      {mainTab === 1 && (
        <>
          <StatusOverview items={degrees} statusConfig={STATUS_CONFIG} title={<span>Degree Status Overview</span>} />
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              My Degrees ({degrees.length})
            </Typography>
          </Box>
          <Tabs value={degreeTab} onChange={(_, v) => setDegreeTab(v)} variant="fullWidth" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            {degreeTabsConfig.map((tab, index) => (
              <Tab key={tab.key} icon={tab.icon} iconPosition="start" label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{tab.label}<Chip label={tab.entities.length} size="small" color={tab.color as any} sx={{ ml: 1 }} /></Box>} />
            ))}
          </Tabs>
          {degreeTabsConfig.map((tab, index) => (
            <Box key={tab.key} role="tabpanel" hidden={degreeTab !== index} sx={{ mt: 2 }}>
              {degreeTab === index && (
                tab.entities.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 2 }}>No degrees in {tab.label.toLowerCase()} status.</Alert>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
                    {tab.entities.map(degree => (
                      <FacultyItemCard item={degree} actions={getAvailableEntityActions(degree, 'degree', isHOD)} onAction={(action, item) => handleAction(action, item, 'degree')} />
                    ))}
                  </Box>
                )
              )}
            </Box>
          ))}
        </>
      )}
      {/* Create Course Dialog */}
      <CreateCourseDialog
        open={createCourseDialogOpen}
        onClose={() => setCreateCourseDialogOpen(false)}
        onSuccess={() => setCreateCourseDialogOpen(false)}
        mode="create"
      />
      {/* Edit Course Dialog */}
      <CreateCourseDialog
        open={editCourseDialogOpen}
        onClose={() => setEditCourseDialogOpen(false)}
        onSuccess={() => setEditCourseDialogOpen(false)}
        course={courseToEdit}
        mode="edit"
      />
      {/* Create Degree Dialog (advanced) */}
      <DegreeDialog
        open={createDegreeDialogOpen}
        onClose={() => setCreateDegreeDialogOpen(false)}
        onSuccess={() => {
          setCreateDegreeDialogOpen(false);
          // Optionally reload data
        }}
        initialData={{
          userDepartmentId: user?.department?.id,
          userDepartmentName: user?.department?.name
        }}
        mode={degreeDialogMode}
      />
      {/* Edit Degree Dialog */}
      <DegreeDialog
        open={editDegreeDialogOpen}
        onClose={() => setEditDegreeDialogOpen(false)}
        onSuccess={() => setEditDegreeDialogOpen(false)}
        initialData={degreeToEdit ? {
          ...degreeToEdit,
          userDepartmentId: user?.department?.id,
          userDepartmentName: user?.department?.name
        } : undefined}
        mode="edit"
      />
      {/* Course Submit Dialog */}
      <SubmitForApprovalDialog
        open={submitCourseDialogOpen}
        title="Submit Course for Approval"
        messageLabel="Message to Reviewer (Optional)"
        messageRequired={false}
        messageValue={''}
        onMessageChange={() => {}}
        loading={false}
        onCancel={() => setSubmitCourseDialogOpen(false)}
        onSubmit={() => setSubmitCourseDialogOpen(false)}
      />
      {/* Degree Submit Dialog */}
      <SubmitForApprovalDialog
        open={submitDegreeDialogOpen}
        title="Submit Degree for Approval"
        messageLabel="Message to Reviewer (Optional)"
        messageRequired={false}
        messageValue={''}
        onMessageChange={() => {}}
        loading={false}
        onCancel={() => setSubmitDegreeDialogOpen(false)}
        onSubmit={() => setSubmitDegreeDialogOpen(false)}
      />
    </Container>
  );
};

export default NewFacultyDashboard;
