import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import CreateDegreeDialog from '../../components/faculty/CreateDegreeDialog';
import StatusOverview from '../../components/StatusOverview';
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
  TablePagination,
  CircularProgress,
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
import { useRouter } from 'next/router';
import { coursesAPI, degreesAPI } from '../../services/api';
import { usersAPI } from '../../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';
import CreateCourseDialog from '../../components/faculty/CreateCourseDialog';
import EditEntityConfirmationDialog from '../../components/faculty/EditEntityConfirmationDialog';
import SubmitForApprovalDialog from '../../components/common/SubmitForApprovalDialog';
import LoadingButton from '../../components/common/LoadingButton';
import {
  getAvailableEntityActions,
  EntityType,
  Entity,
} from '../../utils/faculty/facultyDashboardHelpers';
import TimelineIcon from '@mui/icons-material/Timeline';
import TimelineDialog, { TimelineEvent } from '../../components/common/TimelineDialog';
import { timelineAPI } from '../../services/api';

const FacultyDashboard: React.FC = () => {
  // Helper to reload stats after entity actions
  const reloadStats = async () => {
  // console.log('[DEBUG] reloadStats called');
    const statsRes = await usersAPI.getStats();
    if (statsRes.error) {
      enqueueSnackbar('Error loading stats', { variant: 'error' });
      return;
    }
    setStats(statsRes);
    setCourseStats(statsRes.courses || {});
    setDegreeStats(statsRes.degrees || {});
  };
  // Stats state
  const [courseStats, setCourseStats] = useState<any>(null);
  const [degreeStats, setDegreeStats] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  // Pagination state for degrees
  const [degreesPagination, setDegreesPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  // Pagination state for courses
  const [coursesPagination, setCoursesPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
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
  const [loading, setLoading] = useState(true); // Initial page load only
  const [coursesLoading, setCoursesLoading] = useState(false); // Loading courses when switching tabs
  const [degreesLoading, setDegreesLoading] = useState(false); // Loading degrees when switching tabs
  const [mainTab, setMainTab] = useState(0); // 0: Courses, 1: Degrees
  const [courseTab, setCourseTab] = useState(0);
  const [degreeTab, setDegreeTab] = useState(0);
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const router = useRouter();
  const isHOD = user?.is_head_of_department === true;

  const [editEntityDialogOpen, setEditEntityDialogOpen] = useState(false);
  const [entityToEdit, setEntityToEdit] = useState<Entity | null>(null);
  const [editEntityLoading, setEditEntityLoading] = useState(false);
  const [submitCourseDialogOpen, setSubmitCourseDialogOpen] = useState(false);
  const [courseToSubmit, setCourseToSubmit] = useState<Entity | null>(null);
  const [submitDegreeDialogOpen, setSubmitDegreeDialogOpen] = useState(false);
  const [degreeToSubmit, setDegreeToSubmit] = useState<Entity | null>(null);
  // Publish confirmation dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [entityToPublish, setEntityToPublish] = useState<Entity | null>(null);
  const [publishType, setPublishType] = useState<EntityType | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  // Add create dialogs
  const [createCourseDialogOpen, setCreateCourseDialogOpen] = useState(false);
  const [createDegreeDialogOpen, setCreateDegreeDialogOpen] = useState(false);
  const [degreeDialogMode, setDegreeDialogMode] = useState<'create' | 'edit'>('create');
  const [degreeDialogData, setDegreeDialogData] = useState<any>(null);

  const [coursePage, setCoursePage] = useState(1);
  const [courseTotalPages, setCourseTotalPages] = useState(1);
  const [degreePage, setDegreePage] = useState(1);
  const [degreeTotalPages, setDegreeTotalPages] = useState(1);

// Load stats only once on mount/user change
useEffect(() => {
  // Only run if user is defined and has an id (or a unique property)
  if (!user || !user.id) return;
  let didRun = false;
  const loadStats = async () => {
    if (didRun) return;
    didRun = true;
    setLoading(true); // Only for initial page load
    try {
      console.log('📊 [STATS] Loading stats (should only happen once on mount)...');
      const statsRes = await usersAPI.getStats();
      console.log('📊 [STATS] Stats API response:', statsRes);
      console.log('   Courses:', statsRes.courses);
      console.log('   Degrees:', statsRes.degrees);
      setStats(statsRes);
      setCourseStats(statsRes.courses || {});
      setDegreeStats(statsRes.degrees || {});
      console.log('✅ [STATS] Loaded successfully - this provides counts for ALL statuses in one call');
    } catch (err) {
      console.error('❌ [STATS] Error loading stats:', err);
      enqueueSnackbar('Error loading stats', { variant: 'error' });
    } finally {
      setLoading(false); // Initial load complete
    }
  };
  loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user && user.id]);

// Centralized function to fetch entities (courses or degrees) with status
const fetchEntities = async (
  entityType: 'degree' | 'course',
  page: number,
  limit: number,
  statusKey: string | undefined,
  caller = ''
) => {

    console.log(`[DEBUG] fetchEntities called from: ${caller}`);
    console.log(`[DEBUG] entityType: ${entityType}, page: ${page}, limit: ${limit}, status: ${statusKey}`);

  if (entityType === 'degree') {
    setDegreesLoading(true);
    try {
      const res = await degreesAPI.getDegrees({ page, limit, status: statusKey || 'draft' });

        console.log('[DEBUG] degreesAPI.getDegrees response:', res);

      if (res.error) {
        enqueueSnackbar(res.error, { variant: 'error' });
        setDegrees([]);
        return;
      }
      setDegrees(res.degrees || []);
      setDegreesPagination(prev => ({
        ...prev,
        total: res.pagination?.total || 0,
        pages: res.pagination?.pages || 1,
      }));
    } catch (err) {
      enqueueSnackbar('Error loading degrees', { variant: 'error' });
      setDegrees([]);
    } finally {
      setDegreesLoading(false);
    }
  } else if (entityType === 'course') {
    setCoursesLoading(true);
    try {
      const res = await coursesAPI.getCourses({ page, limit, status: statusKey || 'draft' });

        console.log('[DEBUG] coursesAPI.getCourses response:', res);

      if (res.error) {
        enqueueSnackbar(res.error, { variant: 'error' });
        setCourses([]);
        return;
      }
      setCourses(res.courses || []);
      setCoursesPagination(prev => ({
        ...prev,
        total: res.pagination?.total || 0,
        pages: res.pagination?.pages || 1,
      }));
    } catch (err) {
      enqueueSnackbar('Error loading courses', { variant: 'error' });
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  }
};

// Load courses only when coursesPagination or courseTab changes
useEffect(() => {
  const tabConfigs = [
    { key: 'draft' },
    { key: 'pending_approval' },
    { key: 'approved' },
    { key: 'active' },
  ];
  const statusFilter = tabConfigs[courseTab]?.key;
  fetchEntities('course', coursesPagination.page, coursesPagination.limit, statusFilter, 'courses useEffect');
}, [coursesPagination.page, coursesPagination.limit, courseTab]);

// Load degrees only when degreesPagination or degreeTab changes
useEffect(() => {
  const tabConfigs = [
    { key: 'draft' },
    { key: 'pending_approval' },
    { key: 'approved' },
    { key: 'active' },
  ];
  const statusFilter = tabConfigs[degreeTab]?.key;
  fetchEntities('degree', degreesPagination.page, degreesPagination.limit, statusFilter, 'degrees useEffect');
}, [degreesPagination.page, degreesPagination.limit, degreeTab]);

  // Handlers for TablePagination (Degrees)
  const handleDegreesPageChange = (newPage: number) => {
    setDegreesPagination(prev => ({ ...prev, page: newPage }));
  };
  const handleDegreesRowsPerPageChange = (newLimit: number) => {
    setDegreesPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Handlers for TablePagination (Courses)
  const handleCoursesPageChange = (newPage: number) => {
    setCoursesPagination(prev => ({ ...prev, page: newPage }));
  };
  const handleCoursesRowsPerPageChange = (newLimit: number) => {
    setCoursesPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

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
              Code: {item.code}{item.version > 1 ? ` (v${item.version})` : ''} {item.credits ? ` • ${item.credits} Credits • Semester ${item.semester}` : item.duration_years ? ` • ${item.duration_years} Years` : ''}
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
      // Prevent creating a new version if one already exists in draft, pending, or approved state
      if ((type === 'course' || type === 'degree') && entity.hasNewPendingVersion === true) {
        const entityTypeName = type === 'course' ? 'course' : 'degree';
        enqueueSnackbar(
          `Cannot create a new version of this ${entityTypeName}. A newer version already exists in draft, pending approval, or approved state. Please complete or delete the existing version first.`,
          { variant: 'warning' }
        );
        return;
      }
      setEntityToEdit({ ...entity, entityType: type });
      setEditEntityDialogOpen(true);
      return;
    }
    if (action === 'publish') {
      // Show confirmation dialog before publishing
      setEntityToPublish({ ...entity, entityType: type });
      setPublishType(type);
      setPublishDialogOpen(true);
      return;
    }
    if (action === 'view') {
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
      return;
    }
    if (action === 'delete') {
      setEntityToDelete(entity);
      setDeleteType(type);
      setDeleteError(''); // Clear any previous errors
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
        let data;
        if (entityToEdit.entityType === "course") {
          data = await coursesAPI.createCourseVersion(entityToEdit.id);
        } else {
          data = await degreesAPI.createDegreeVersion(entityToEdit.id);
        }

        // Check if response contains an error
        if (data.error) {
          enqueueSnackbar(data.error, { variant: "error" });
          setEditEntityLoading(false);
          setEditEntityDialogOpen(false);
          return;
        }

        enqueueSnackbar(
          `New version created successfully. You can now edit the draft.`,
          { variant: "success" }
        );
        setEditEntityDialogOpen(false);

        // Switch to Draft tab to show the new version, let useEffect handle fetching
        if (entityToEdit.entityType === "course") {
          setCourseTab(0); // 0 = Draft tab
        } else {
          setDegreeTab(0); // 0 = Draft tab
        }
        await reloadStats();
      } else {
        // For drafts or pending approval, open the edit dialog/modal and only update after user confirms
        if (updatedEntity) {
          let updateResult;
          if (entityToEdit.entityType === "course") {
            updateResult = await coursesAPI.updateCourse(entityToEdit.id, updatedEntity);
          } else {
            updateResult = await degreesAPI.updateDegree(entityToEdit.id, updatedEntity);
          }
          
          // Check if response contains an error
          if (updateResult.error) {
            enqueueSnackbar(updateResult.error, { variant: "error" });
            setEditEntityLoading(false);
            setEditEntityDialogOpen(false);
            return;
          }
          
          enqueueSnackbar("Entity updated successfully!", { variant: "success" });
          setEditEntityDialogOpen(false);
          // Always reload both entity lists and stats after edit
          await fetchEntities(
            'course',
            coursesPagination.page,
            coursesPagination.limit,
            courseTabsConfig[courseTab]?.key,
            'entity edit (course)'
          );
          await fetchEntities(
            'degree',
            degreesPagination.page,
            degreesPagination.limit,
            degreeTabsConfig[degreeTab]?.key,
            'entity edit (degree)'
          );
          await reloadStats();
                if (deleteType === 'course') {
                  await fetchEntities(
                    'course',
                    coursesPagination.page,
                    coursesPagination.limit,
                    courseTabsConfig[courseTab]?.key,
                    'delete (course)'
                  );
                } else {
                  await fetchEntities(
                    'degree',
                    degreesPagination.page,
                    degreesPagination.limit,
                    degreeTabsConfig[degreeTab]?.key,
                    'delete (degree)'
                  );
                }
                await reloadStats();
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

  // Handle publish confirmation
  const handlePublishConfirm = async () => {
    if (!entityToPublish || !publishType) return;

    setPublishLoading(true);
    try {
      if (publishType === 'course') {
        const result = await coursesAPI.publishCourse(entityToPublish.id);
        if (result.error) {
          enqueueSnackbar(result.error, { variant: 'error' });
          setPublishLoading(false);
          return;
        }
        enqueueSnackbar('Course published and is now active!', { variant: 'success' });
      } else {
        const result = await degreesAPI.publishDegree(entityToPublish.id);
        if (result.error) {
          enqueueSnackbar(result.error, { variant: 'error' });
          setPublishLoading(false);
          return;
        }
        enqueueSnackbar('Degree published and is now active!', { variant: 'success' });
      }
      
      // Get current status filters from tabs
      const tabConfigs = [
        { key: 'draft' },
        { key: 'pending_approval' },
        { key: 'approved' },
        { key: 'active' },
      ];
      const courseStatusFilter = tabConfigs[courseTab]?.key;
      const degreeStatusFilter = tabConfigs[degreeTab]?.key;
      
      // Reload data and stats
      await fetchEntities('course', coursesPagination.page, coursesPagination.limit, courseStatusFilter, 'publish confirm (course)');
      await fetchEntities('degree', degreesPagination.page, degreesPagination.limit, degreeStatusFilter, 'publish confirm (degree)');
      await reloadStats();
      
      // Close dialog
      setPublishDialogOpen(false);
      setEntityToPublish(null);
      setPublishType(null);
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
    setPublishLoading(false);
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading dashboard...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we fetch your degrees and courses
        </Typography>
      </Box>
    );
  }

  // Status configs for tabs and overview
  const STATUS_CONFIG = [
    { key: 'draft', label: 'Draft', color: 'default', icon: <DraftIcon style={{ fontSize: 40, color: '#616161' }} /> },
    { key: 'pending_approval', label: 'Pending Approval', color: 'info', icon: <PendingIcon style={{ fontSize: 40, color: '#0288d1' }} /> },
    { key: 'approved', label: 'Approved', color: 'success', icon: <ApproveIcon style={{ fontSize: 40, color: '#2e7d32' }} /> },
    { key: 'active', label: 'Active', color: 'success', icon: <ActiveIcon style={{ fontSize: 40, color: '#388e3c' }} /> },
  ];

  const courseTabsConfig = [
  { key: 'draft', label: 'Draft', color: 'default', icon: <DraftIcon style={{ fontSize: 24, color: '#616161' }} />, count: stats?.courses?.draft ?? 0 },
  { key: 'pending_approval', label: 'Pending Approval', color: 'info', icon: <PendingIcon style={{ fontSize: 24, color: '#0288d1' }} />, count: stats?.courses?.pending_approval ?? 0 },
  { key: 'approved', label: 'Approved', color: 'success', icon: <ApproveIcon style={{ fontSize: 24, color: '#2e7d32' }} />, count: stats?.courses?.approved ?? 0 },
  { key: 'active', label: 'Active', color: 'success', icon: <ActiveIcon style={{ fontSize: 24, color: '#388e3c' }} />, count: stats?.courses?.active ?? 0 },
  ];
  const degreeTabsConfig = [
  { key: 'draft', label: 'Draft', color: 'default', icon: <DraftIcon style={{ fontSize: 24, color: '#616161' }} />, count: stats?.degrees?.draft ?? 0 },
  { key: 'pending_approval', label: 'Pending Approval', color: 'info', icon: <PendingIcon style={{ fontSize: 24, color: '#0288d1' }} />, count: stats?.degrees?.pending_approval ?? 0 },
  { key: 'approved', label: 'Approved', color: 'success', icon: <ApproveIcon style={{ fontSize: 24, color: '#2e7d32' }} />, count: stats?.degrees?.approved ?? 0 },
  { key: 'active', label: 'Active', color: 'success', icon: <ActiveIcon style={{ fontSize: 24, color: '#388e3c' }} />, count: stats?.degrees?.active ?? 0 },
  ];

  // Entity card renderer
  const FacultyItemCard = ({ item, actions, onAction }: { item: any; actions: any[]; onAction: (action: string, item: any) => void }) => (
    <Card key={item.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', mb: 2, boxShadow: 3 }}>
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>{item.name}</Typography>
        </Box>
        <Typography variant="subtitle2" color="primary" sx={{ mb: 0.5, fontWeight: 500 }}>
          Code: {item.code}{item.version ? ` (v${item.version})` : ''} {item.credits ? ` • ${item.credits} Credits • Semester ${item.semester}` : item.duration_years ? ` • ${item.duration_years} Years` : ''}
        </Typography>
        {item.is_elective && (
          <Chip label="Elective" variant="outlined" size="small" sx={{ mb: 1 }} />
        )}
        {item.department && (
          <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
            Dept: {item.department.name}
          </Typography>
        )}
        {item.degree && (
          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
            Degree: {item.degree.name}
          </Typography>
        )}
        <Box sx={{ mb: 2 }}>
          {/* Truncate long descriptions to a few lines with an ellipsis */}
          <Box
            component="div"
            sx={{
              color: '#616161',
              fontSize: '1rem',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.overview || item.description || '') }}
          />
        </Box>
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
      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ borderTop: '1px solid', borderColor: 'grey.200', pt: 1.5, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          {actions.map((action, index) => (
            <Button
              key={index}
              size="small"
              startIcon={action.icon}
              onClick={() => {
                onAction(action.action, item);
              }}
              sx={{ minWidth: 0, flex: 1, fontWeight: 500 }}
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
            sx={{ minWidth: 0, flex: 1, fontWeight: 500 }}
          >
            Timeline
          </Button>
        </Box>
      </Box>
    </Card>
  );

  return (
    <Container maxWidth="xl">
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to delete this {deleteType}? This action cannot be undone.
          </Typography>
          {entityToDelete?.status !== 'active' && (
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              Draft, pending approval, and approved {deleteType}s can be deleted if no active version exists.
            </Alert>
          )}
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
                  const result = await coursesAPI.deleteCourse(entityToDelete.id);
                  // Check if response contains an error
                  if (result.error) {
                    enqueueSnackbar(result.error, { variant: 'error' });
                    setDeleteLoading(false);
                    setDeleteDialogOpen(false);
                    return;
                  }
                  enqueueSnackbar('Course deleted successfully!', { variant: 'success' });
                  // Reload courses after deletion
                  await fetchEntities(
                    'course',
                    coursesPagination.page,
                    coursesPagination.limit,
                    courseTabsConfig[courseTab]?.key,
                    'delete dialog (course)'
                  );
                } else {
                  const result = await degreesAPI.deleteDegree(entityToDelete.id);
                  // Check if response contains an error
                  if (result.error) {
                    enqueueSnackbar(result.error, { variant: 'error' });
                    setDeleteLoading(false);
                    setDeleteDialogOpen(false);
                    return;
                  }
                  enqueueSnackbar('Degree deleted successfully!', { variant: 'success' });
                  // Reload degrees after deletion
                  await fetchEntities(
                    'degree',
                    degreesPagination.page,
                    degreesPagination.limit,
                    degreeTabsConfig[degreeTab]?.key,
                    'delete dialog (degree)'
                  );
                }
                // Reload stats after deletion
                await reloadStats();
                setDeleteDialogOpen(false);
                setEntityToDelete(null);
                setDeleteType(null);
                setDeleteError('');
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
                enqueueSnackbar(errorMsg, { variant: 'error' });
                setDeleteDialogOpen(false);
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
            onClick={() => router.push('/hod')}
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
            onClick={() => {
              setEntityToEdit(null);
              setCreateCourseDialogOpen(true);
            }}
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
          {/* Debug: print data passed to StatusOverview for courses */}
          {(() => {
            const items = courseTabsConfig.map(tab => ({ status: tab.key, count: tab.count }));
            return null;
          })()}
          <StatusOverview
            items={courseTabsConfig.map(tab => ({ status: tab.key, count: tab.count }))}
            statusConfig={STATUS_CONFIG}
            title={<span>Course Status Overview</span>}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              My Courses
            </Typography>
          </Box>
          <Tabs value={courseTab} onChange={(_, v) => {
            setCourseTab(v);
            setCoursesPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 when changing tabs
          }} variant="fullWidth" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            {courseTabsConfig.map((tab, index) => (
              <Tab key={tab.key} icon={tab.icon} iconPosition="start" label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{tab.label}<Chip label={stats?.courses?.[tab.key] ?? 0} size="small" color={tab.color as any} sx={{ ml: 1 }} /></Box>} />
            ))}
          </Tabs>
          {courseTabsConfig[courseTab].count === 0 ? (
            <Alert severity="info">No courses in {courseTabsConfig[courseTab].label.toLowerCase()} status.</Alert>
          ) : coursesLoading ? (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress size={50} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Loading courses...
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
                {courses.map(course => (
                  <FacultyItemCard
                    key={course.id}
                    item={{ ...course, entityType: 'course' }}
                    actions={getAvailableEntityActions(course, 'course', isHOD)}
                    onAction={(action, item) => handleAction(action, item, 'course')}
                  />
                ))}
              </Box>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <TablePagination
                  component="div"
                  count={coursesPagination?.total || 0}
                  page={(coursesPagination?.page || 1) - 1}
                  onPageChange={(e, newPage) => handleCoursesPageChange(newPage + 1)}
                  rowsPerPage={coursesPagination?.limit || 20}
                  onRowsPerPageChange={e => handleCoursesRowsPerPageChange(parseInt(e.target.value, 10))}
                  rowsPerPageOptions={[10, 20, 50]}
                />
              </Box>
            </>
          )}
        </>
      )}
      {/* Degrees Tab */}
      {mainTab === 1 && (
        <>
          {/* Debug: print data passed to StatusOverview for degrees */}
          {(() => {
            const items = degreeTabsConfig.map(tab => ({ status: tab.key, count: tab.count }));
            return null;
          })()}
          <StatusOverview
            items={degreeTabsConfig.map(tab => ({ status: tab.key, count: tab.count }))}
            statusConfig={STATUS_CONFIG}
            title={<span>Degree Status Overview</span>}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              My Degrees
            </Typography>
          </Box>
          <Tabs value={degreeTab} onChange={(_, v) => {
            setDegreeTab(v);
            setDegreesPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 when changing tabs
          }} variant="fullWidth" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            {degreeTabsConfig.map((tab, index) => (
              <Tab key={tab.key} icon={tab.icon} iconPosition="start" label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{tab.label}<Chip label={stats?.degrees?.[tab.key] ?? 0} size="small" color={tab.color as any} sx={{ ml: 1 }} /></Box>} />
            ))}
          </Tabs>
          {degreeTabsConfig[degreeTab].count === 0 ? (
            <Alert severity="info">No degrees in {degreeTabsConfig[degreeTab].label.toLowerCase()} status.</Alert>
          ) : degreesLoading ? (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress size={50} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Loading degrees...
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
                {degrees
                  .filter(degree => degree.status === degreeTabsConfig[degreeTab]?.key)
                  .map(degree => (
                  <FacultyItemCard
                    key={degree.id}
                    item={{ ...degree, entityType: 'degree' }}
                    actions={getAvailableEntityActions(degree, 'degree', isHOD)}
                    onAction={(action, item) => handleAction(action, item, 'degree')}
                  />
                ))}
              </Box>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <TablePagination
                  component="div"
                  count={degreesPagination?.total || 0}
                  page={(degreesPagination?.page || 1) - 1}
                  onPageChange={(e, newPage) => handleDegreesPageChange(newPage + 1)}
                  rowsPerPage={degreesPagination?.limit || 10}
                  onRowsPerPageChange={e => handleDegreesRowsPerPageChange(parseInt(e.target.value, 10))}
                  rowsPerPageOptions={[10, 20, 50]}
                />
              </Box>
            </>
          )}
        </>
      )}
      {/* Create Course Dialog */}
      <CreateCourseDialog
        open={createCourseDialogOpen}
        onClose={() => setCreateCourseDialogOpen(false)}
        onSuccess={() => setCreateCourseDialogOpen(false)}
        mode={createCourseDialogOpen && (!entityToEdit || entityToEdit.entityType !== 'course' || entityToEdit.status !== 'draft') ? 'create' : 'edit'}
        course={createCourseDialogOpen && entityToEdit && entityToEdit.entityType === 'course' && entityToEdit.status === 'draft' ? entityToEdit : undefined}
      />
      {/* Generic Edit Entity Confirmation Dialog */}
      <EditEntityConfirmationDialog
        open={editEntityDialogOpen}
        onClose={() => setEditEntityDialogOpen(false)}
        onConfirm={handleEditEntityConfirm}
        entity={entityToEdit}
        loading={editEntityLoading}
      />
      {/* Create/Edit Degree Dialog (unified) */}
      <CreateDegreeDialog
        open={createDegreeDialogOpen}
        onClose={() => setCreateDegreeDialogOpen(false)}
        onSuccess={() => {
          setCreateDegreeDialogOpen(false);
          // Reload degrees only
          const reloadDegrees = async () => {
            await fetchEntities(
              'degree',
              degreesPagination.page,
              degreesPagination.limit,
              degreeTabsConfig[degreeTab]?.key,
              'create degree dialog'
            );
            await reloadStats();
          };
          reloadDegrees();
        }}
        mode={degreeDialogMode}
        degree={degreeDialogData}
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
          
          const result = await coursesAPI.submitCourseForApproval(
            courseToSubmit.id,
            courseApprovalMessage
          );
          
          if (result.error) {
            enqueueSnackbar(result.error, { variant: 'error' });
            setSubmitCourseError(result.error);
            setSubmittingCourse(false);
            return;
          }
          
          enqueueSnackbar('Course submitted for approval!', { variant: 'success' });
          setSubmitCourseDialogOpen(false);
          setCourseApprovalMessage('');
          
          // Reload courses only
          await fetchEntities(
            'course',
            coursesPagination.page,
            coursesPagination.limit,
            courseTabsConfig[courseTab]?.key,
            'submit dialog (course)'
          );
          await reloadStats();
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
          
          const result = await degreesAPI.submitDegreeForApproval(
            degreeToSubmit.id,
            degreeApprovalMessage
          );
          
          if (result.error) {
            enqueueSnackbar(result.error, { variant: 'error' });
            setSubmitDegreeError(result.error);
            setSubmittingDegree(false);
            return;
          }
          
          enqueueSnackbar('Degree submitted for approval!', { variant: 'success' });
          setSubmitDegreeDialogOpen(false);
          setDegreeApprovalMessage('');
          
          // Reload degrees only
          await fetchEntities(
            'degree',
            degreesPagination.page,
            degreesPagination.limit,
            degreeTabsConfig[degreeTab]?.key,
            'submit dialog (degree)'
          );
          await reloadStats();
          setSubmittingDegree(false);
        }}
      />

      {/* Publish Confirmation Dialog */}
      <Dialog
        open={publishDialogOpen}
        onClose={() => !publishLoading && setPublishDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Publish</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Publishing will make this {publishType} active and visible to all users. This action cannot be undone.
          </Alert>
          {entityToPublish && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Title:</strong> {entityToPublish.title || entityToPublish.name}
              </Typography>
              {entityToPublish.code && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Code:</strong> {entityToPublish.code}
                </Typography>
              )}
              {entityToPublish.version && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Version:</strong> {entityToPublish.version}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPublishDialogOpen(false);
              setEntityToPublish(null);
              setPublishType(null);
            }}
            disabled={publishLoading}
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handlePublishConfirm}
            variant="contained"
            color="primary"
            loading={publishLoading}
          >
            Publish
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FacultyDashboard;
