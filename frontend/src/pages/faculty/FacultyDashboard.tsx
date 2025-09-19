import React, { useState, useEffect } from 'react';
import api from '../../services/api';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import EditEntityConfirmationDialog from '../../components/faculty/EditEntityConfirmationDialog';
import DegreeDialog from '../../components/common/DegreeDialog';
import SubmitForApprovalDialog from '../../components/common/SubmitForApprovalDialog';
import {
  getAvailableEntityActions,
  handleEntityAction,
  getStatusIcon,
  EntityType,
  Entity,
} from './facultyDashboardHelpers';
import TimelineIcon from '@mui/icons-material/Timeline';
import TimelineDialog, { TimelineEvent } from '../../components/common/TimelineDialog';
import { timelineAPI } from '../../services/api';

const FacultyDashboard: React.FC = () => {
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<Entity | null>(null);
  const [deleteType, setDeleteType] = useState<EntityType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string>('');
  // Approval message state for dialogs
  const [courseApprovalMessage, setCourseApprovalMessage] = useState('');
  const [degreeApprovalMessage, setDegreeApprovalMessage] = useState('');
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const [submittingDegree, setSubmittingDegree] = useState(false);
  const [submitCourseError, setSubmitCourseError] = useState('');
  const [submitDegreeError, setSubmitDegreeError] = useState('');
  // Timeline dialog state
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineEntityName, setTimelineEntityName] = useState('');
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

  const [editEntityDialogOpen, setEditEntityDialogOpen] = useState(false);
  const [entityToEdit, setEntityToEdit] = useState<Entity | null>(null);
  const [editEntityLoading, setEditEntityLoading] = useState(false);
  const [submitCourseDialogOpen, setSubmitCourseDialogOpen] = useState(false);
  const [courseToSubmit, setCourseToSubmit] = useState<Entity | null>(null);
  const [submitDegreeDialogOpen, setSubmitDegreeDialogOpen] = useState(false);
  const [degreeToSubmit, setDegreeToSubmit] = useState<Entity | null>(null);
  // Add create dialogs
  const [createCourseDialogOpen, setCreateCourseDialogOpen] = useState(false);
  const [createDegreeDialogOpen, setCreateDegreeDialogOpen] = useState(false);
  const [degreeDialogMode, setDegreeDialogMode] = useState<'create' | 'edit'>('create');
  const [degreeDialogData, setDegreeDialogData] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesData, degreesData] = await Promise.all([
        coursesAPI.getFacultyCourses(user?.department?.id, user?.id),
        degreesAPI.getFacultyDegrees(user?.department?.id, user?.id),
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
  useEffect(() => {
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
      // Inline StatusOverview component
      const StatusOverview: React.FC<{ items: any[]; statusConfig: any[]; title: React.ReactNode }> = ({ items, statusConfig, title }) => {
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

      // Inline FacultyItemCard component
      const FacultyItemCard: React.FC<{ item: any; actions: any[]; onAction: (action: string, item: any) => void }> = ({ item, actions, onAction }) => (
        <Card key={item.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', mb: 2 }}>
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" component="h2">{item.name}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip label={item.status} color="primary" size="small" />
            </Box>
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
          </CardContent>
          <CardActions sx={{ pt: 0 }}>
            {actions.map((action, index) => (
              <Button key={index} size="small" startIcon={action.icon} onClick={() => onAction(action.action, item)}>
                {action.label}
              </Button>
            ))}
            <Button
              size="small"
              startIcon={<TimelineIcon />}
              onClick={async () => {
                // Timeline logic here
              }}
            >
              Timeline
            </Button>
          </CardActions>
        </Card>
      );
      if (type === 'course' && entity.status === 'draft') {
        setCreateCourseDialogOpen(true);
        setEntityToEdit({ ...entity, entityType: type });
        return;
      }
      if (type === 'degree' && entity.status === 'draft') {
        setDegreeDialogMode('edit');
        setDegreeDialogData(entity);
        setCreateDegreeDialogOpen(true);
        setEntityToEdit({ ...entity, entityType: type });
        return;
      }
      if ((type === 'course' || type === 'degree') && entity.status === 'active' && entity.hasDraftVersion === true) {
        enqueueSnackbar(`Cannot edit active ${type} while a draft exists.`, { variant: 'warning' });
        return;
      }
      setEntityToEdit({ ...entity, entityType: type });
      setEditEntityDialogOpen(true);
      return;
    }
    if (action === 'publish') {
      try {
        if (type === 'course') {
          await coursesAPI.publishCourse(entity.id);
          enqueueSnackbar('Course published and is now active!', { variant: 'success' });
        } else {
          await degreesAPI.publishDegree(entity.id);
          enqueueSnackbar('Degree published and is now active!', { variant: 'success' });
        }
        await loadData();
      } catch (err) {
        let errorMsg = 'Failed to publish';
        if (typeof err === 'object' && err !== null) {
          if ('message' in err && typeof (err as any).message === 'string') {
            errorMsg = (err as any).message;
          }
          if ('response' in err && (err as any).response?.data?.error) {
            errorMsg = (err as any).response.data.error;
          }
        }
        enqueueSnackbar(errorMsg, { variant: 'error' });
      }
      return;
    }
    if (action === 'view') {
      if (type === 'course') {
        navigate(`/faculty/course/${entity.id}`);
      }
      // Add degree view navigation if available
      return;
    }
    if (action === 'delete') {
      setEntityToDelete(entity);
      setDeleteType(type);
      setDeleteDialogOpen(true);
      return;
    }
    // Add other actions as needed
  };

  const handleEditEntityConfirm = async (updatedEntity?: any) => {
    if (!entityToEdit) return;
    setEditEntityLoading(true);
    try {
      // If approved or active, create a new version
      if (["approved", "active"].includes(entityToEdit.status)) {
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
        const apiPath = entityToEdit.entityType === "course"
          ? `${API_BASE_URL}/courses/${entityToEdit.id}/create-version`
          : `${API_BASE_URL}/degrees/${entityToEdit.id}/create-version`;

        const response = await api.post(apiPath);
        const data = response.data;
        enqueueSnackbar(
          `New version created successfully. You can now edit the draft.`,
          { variant: "success" }
        );
        setEditEntityDialogOpen(false);
        await loadData();
      } else {
        // For drafts or pending approval, open the edit dialog/modal and only update after user confirms
        if (updatedEntity) {
          if (entityToEdit.entityType === "course") {
            await coursesAPI.updateCourse(entityToEdit.id, updatedEntity);
          } else {
            await degreesAPI.updateDegree(entityToEdit.id, updatedEntity);
          }
          enqueueSnackbar("Entity updated successfully!", { variant: "success" });
          setEditEntityDialogOpen(false);
          await loadData();
        }
        // Otherwise, just open the edit dialog/modal (handled elsewhere)
      }
    } catch (err) {
      let errorMsg = "Failed to update entity";
      if (err && typeof err === "object") {
        if ("response" in err && (err as any).response?.data?.error) {
          const backendError = (err as any).response.data.error;
          errorMsg = typeof backendError === "string" ? backendError : "An unknown error occurred";
        } else if ("message" in err && typeof (err as any).message === "string") {
          errorMsg = (err as any).message;
        } else if (err instanceof Error && err.message) {
          errorMsg = err.message;
        } else {
          console.error('FacultyDashboard error:', err);
          errorMsg = "An unknown error occurred";
        }
      } else if (typeof err === "string") {
        errorMsg = err;
      } else {
        console.error('FacultyDashboard error:', err);
        errorMsg = "An unknown error occurred";
      }
      enqueueSnackbar(errorMsg, { variant: "error" });
    }
    setEditEntityLoading(false);
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
  // Accept entityType as prop for clarity
  // ...existing code...
  // Update signature to accept entityType
  // Usage below will be updated
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
          <Button
            key={index}
            size="small"
            startIcon={action.icon}
            onClick={() => {
              onAction(action.action, item);
            }}
          >
            {action.label}
          </Button>
        ))}
          <Button
            size="small"
            startIcon={<TimelineIcon />}
            onClick={async () => {
              setTimelineEntityName(item.name || item.code || item.id);
              try {
                // Use explicit entityType prop
                const data = await timelineAPI.getTimeline(item.entityType, item.id);
                // Merge audit and messages into a single timeline array
                const auditEvents = Array.isArray(data.audit) ? data.audit.map((a: any) => ({
                  type: 'audit',
                  id: a.id,
                  action: a.action,
                  user: a.user,
                  description: a.description,
                  timestamp: a.timestamp || a.createdAt || null
                })) : [];
                const messageEvents = Array.isArray(data.messages) ? data.messages.map((m: any) => ({
                  type: 'message',
                  id: m.id,
                  message: m.message,
                  user: m.user,
                  timestamp: m.timestamp || m.createdAt || null
                })) : [];
                // Sort by timestamp descending (most recent first)
                const timeline = [...auditEvents, ...messageEvents].sort((a, b) => {
                  if (!a.timestamp || !b.timestamp) return 0;
                  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                });
                setTimelineEvents(timeline);
              } catch (err) {
                setTimelineEvents([]);
              }
              setTimelineDialogOpen(true);
            }}
          >
            Timeline
          </Button>
      </CardActions>
    </Card>
  );

  return (
    <Container maxWidth="xl">
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this {deleteType}? This action cannot be undone.
          </Typography>
          {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteLoading}
            onClick={async () => {
              if (!entityToDelete || !deleteType) return;
              setDeleteLoading(true);
              setDeleteError('');
              try {
                if (deleteType === 'course') {
                  await coursesAPI.deleteCourse(entityToDelete.id, { userId: user?.id, departmentId: user?.department?.id });
                  enqueueSnackbar('Course deleted successfully!', { variant: 'success' });
                } else {
                  await degreesAPI.deleteDegree(entityToDelete.id, { userId: user?.id, departmentId: user?.department?.id });
                  enqueueSnackbar('Degree deleted successfully!', { variant: 'success' });
                }
                setDeleteDialogOpen(false);
                setEntityToDelete(null);
                setDeleteType(null);
                await loadData();
              } catch (err) {
                let errorMsg = `Failed to delete ${deleteType}`;
                if (typeof err === 'object' && err !== null) {
                  if ('message' in err && typeof (err as any).message === 'string') {
                    errorMsg = (err as any).message;
                  }
                  if ('response' in err && (err as any).response?.data?.error) {
                    errorMsg = (err as any).response.data.error;
                  }
                }
                setDeleteError(errorMsg);
              }
              setDeleteLoading(false);
            }}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      <TimelineDialog
        open={timelineDialogOpen}
        onClose={() => setTimelineDialogOpen(false)}
  events={timelineEvents}
        entityName={timelineEntityName}
      />
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Faculty Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">Manage your courses and degrees</Typography>
        
        {/* Add HOD dashboard link if user is a Head of Department */}
        {isHOD && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/hod')}
            sx={{ mt: 2 }}
          >
            Go to HOD Dashboard
          </Button>
        )}
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
                      <FacultyItemCard
                        key={course.id}
                        item={{ ...course, entityType: 'course' }}
                        actions={getAvailableEntityActions(course, 'course', isHOD)}
                        onAction={(action, item) => handleAction(action, item, 'course')}
                      />
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
                      <FacultyItemCard
                        key={degree.id}
                        item={{ ...degree, entityType: 'degree' }}
                        actions={getAvailableEntityActions(degree, 'degree', isHOD)}
                        onAction={(action, item) => handleAction(action, item, 'degree')}
                      />
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
  mode={entityToEdit && entityToEdit.entityType === 'course' && entityToEdit.status === 'draft' ? 'edit' : 'create'}
  course={entityToEdit && entityToEdit.entityType === 'course' && entityToEdit.status === 'draft' ? entityToEdit : undefined}
      />
      {/* Generic Edit Entity Confirmation Dialog */}
      <EditEntityConfirmationDialog
        open={editEntityDialogOpen}
        onClose={() => setEditEntityDialogOpen(false)}
        onConfirm={handleEditEntityConfirm}
        entity={entityToEdit}
        loading={editEntityLoading}
      />
      {/* Create Degree Dialog (advanced) */}
      <DegreeDialog
        open={createDegreeDialogOpen}
        onClose={() => setCreateDegreeDialogOpen(false)}
        onSuccess={() => {
          setCreateDegreeDialogOpen(false);
          // Optionally reload data
        }}
        initialData={entityToEdit && entityToEdit.entityType === 'degree' && entityToEdit.status === 'draft'
          ? entityToEdit
          : {
              userDepartmentId: user?.department?.id,
              userDepartmentName: user?.department?.name
            }
        }
        mode={entityToEdit && entityToEdit.entityType === 'degree' && entityToEdit.status === 'draft' ? 'edit' : degreeDialogMode}
      />
      {/* Course Submit Dialog */}
      <SubmitForApprovalDialog
        open={submitCourseDialogOpen}
        title="Submit Course for Approval"
        messageLabel="Message to Reviewer (Optional)"
        messageRequired={false}
        messageValue={courseApprovalMessage}
        onMessageChange={setCourseApprovalMessage}
        loading={submittingCourse}
        onCancel={() => {
          setSubmitCourseDialogOpen(false);
          setCourseApprovalMessage('');
          setSubmitCourseError('');
        }}
        onSubmit={async () => {
          if (!courseToSubmit) return;
          setSubmittingCourse(true);
          setSubmitCourseError('');
          try {
            await coursesAPI.submitCourseForApproval(
              courseToSubmit.id,
              courseApprovalMessage,
              user?.id,
              user?.department?.id
            );
            enqueueSnackbar('Course submitted for approval!', { variant: 'success' });
            setSubmitCourseDialogOpen(false);
            setCourseApprovalMessage('');
            await loadData();
          } catch (err) {
            let errorMsg = 'Failed to submit for approval';
            if (typeof err === 'object' && err !== null) {
              if ('message' in err && typeof (err as any).message === 'string') {
                errorMsg = (err as any).message;
              }
              if ('response' in err && (err as any).response?.data?.error) {
                errorMsg = (err as any).response.data.error;
              }
            }
            setSubmitCourseError(errorMsg);
          }
          setSubmittingCourse(false);
        }}
      />
      {/* Degree Submit Dialog */}
      <SubmitForApprovalDialog
        open={submitDegreeDialogOpen}
        title="Submit Degree for Approval"
        messageLabel="Message to Reviewer (Optional)"
        messageRequired={false}
        messageValue={degreeApprovalMessage}
        onMessageChange={setDegreeApprovalMessage}
        loading={submittingDegree}
        onCancel={() => {
          setSubmitDegreeDialogOpen(false);
          setDegreeApprovalMessage('');
          setSubmitDegreeError('');
        }}
        onSubmit={async () => {
          if (!degreeToSubmit) return;
          setSubmittingDegree(true);
          setSubmitDegreeError('');
          try {
            await degreesAPI.submitDegreeForApproval(
              degreeToSubmit.id,
              degreeApprovalMessage,
              user?.id,
              user?.department?.id
            );
            enqueueSnackbar('Degree submitted for approval!', { variant: 'success' });
            setSubmitDegreeDialogOpen(false);
            setDegreeApprovalMessage('');
            await loadData();
          } catch (err) {
            let errorMsg = 'Failed to submit for approval';
            if (typeof err === 'object' && err !== null) {
              if ('message' in err && typeof (err as any).message === 'string') {
                errorMsg = (err as any).message;
              }
              if ('response' in err && (err as any).response?.data?.error) {
                errorMsg = (err as any).response.data.error;
              }
            }
            setSubmitDegreeError(errorMsg);
          }
          setSubmittingDegree(false);
        }}
      />
    </Container>
  );
};

export default FacultyDashboard;
