import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Grid,
  Paper,
} from '@mui/material';
import LoadingButton from '../common/LoadingButton';
import {
  School as SchoolIcon,
  Book as BookIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
} from '@mui/icons-material';

interface CourseDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  course: any | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onSubmit?: () => void;
  onPublish?: () => void;
  submitLoading?: boolean;
}

const CourseDetailsDialog: React.FC<CourseDetailsDialogProps> = ({
  open,
  onClose,
  course,
  onEdit,
  onDelete,
  onSubmit,
  onPublish,
  submitLoading = false,
}) => {
  if (!course) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'submitted': return 'warning';
      case 'rejected': return 'error';
      case 'active': return 'primary';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'submitted': return 'Submitted for Approval';
      case 'approved': return 'Approved';
      case 'active': return 'Active';
      case 'archived': return 'Archived';
      default: return status;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="course-details-title"
    >
      <DialogTitle id="course-details-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Course Details</Typography>
          <Chip
            label={getStatusText(course.status)}
            color={getStatusColor(course.status) as any}
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Basic Information */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              <BookIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Basic Information
            </Typography>
            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mb={2}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Course Name</Typography>
                <Typography variant="body1">{course.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Course Code</Typography>
                <Typography variant="body1">{course.code}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Credits</Typography>
                <Typography variant="body1">{course.credits}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">Semester</Typography>
                <Typography variant="body1">{course.semester}</Typography>
              </Box>
            </Box>
            
            {course.overview && (
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>Overview</Typography>
                <Typography variant="body2">{course.overview}</Typography>
              </Box>
            )}
          </Paper>

          <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={3}>
            {/* Department & Degree */}
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Academic Details
              </Typography>
              
              {course.department && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="textSecondary">Department</Typography>
                  <Typography variant="body2">
                    {course.department.name} ({course.department.code})
                  </Typography>
                </Box>
              )}
              
              {course.degree && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="textSecondary">Degree Program</Typography>
                  <Typography variant="body2">
                    {course.degree.name} ({course.degree.code})
                  </Typography>
                </Box>
              )}

              {course.max_students && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="textSecondary">Max Students</Typography>
                  <Typography variant="body2">{course.max_students}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" color="textSecondary">Course Type</Typography>
                <Chip
                  label={course.is_elective ? 'Elective' : 'Core'}
                  color={course.is_elective ? 'secondary' : 'primary'}
                  size="small"
                />
              </Box>
            </Paper>

            {/* Faculty Details */}
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Faculty Information
              </Typography>
              
              {course.creator && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="textSecondary">Created By</Typography>
                  <Typography variant="body2">
                    {course.creator.first_name} {course.creator.last_name}
                  </Typography>
                </Box>
              )}
              
              {course.faculty_details && course.faculty_details.instructor && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="textSecondary">Instructor</Typography>
                  <Typography variant="body2">{course.faculty_details.instructor}</Typography>
                </Box>
              )}
              
              {course.faculty_details && course.faculty_details.office_hours && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">Office Hours</Typography>
                  <Typography variant="body2">{course.faculty_details.office_hours}</Typography>
                </Box>
              )}
            </Paper>
          </Box>

          {/* Study Details */}
          {course.study_details && course.study_details.topics && (
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                <TimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Course Topics
              </Typography>
              <List dense>
                {course.study_details.topics.map((topic: string, index: number) => (
                  <ListItem key={index} disableGutters>
                    <ListItemText primary={`• ${topic}`} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* Prerequisites */}
          {course.prerequisites && course.prerequisites.length > 0 && (
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">Prerequisites</Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {course.prerequisites.map((prereq: string, index: number) => (
                  <Chip key={index} label={prereq} size="small" variant="outlined" />
                ))}
              </Box>
            </Paper>
          )}

          {/* Timestamps */}
          <Box>
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="textSecondary">
                Created: {new Date(course.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Updated: {new Date(course.updatedAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        {/* Draft status actions */}
        {course.status === 'draft' && (
          <>
            {onEdit && (
              <Button onClick={onEdit} color="primary">
                Edit Course
              </Button>
            )}
            {onSubmit && (
              <LoadingButton 
                onClick={onSubmit} 
                color="warning" 
                variant="outlined"
                loading={submitLoading}
                loadingText="Submitting..."
                disabled={submitLoading}
              >
                Submit for Approval
              </LoadingButton>
            )}
            {onDelete && (
              <Button onClick={onDelete} color="error">
                Delete Course
              </Button>
            )}
          </>
        )}
        
        {/* Submitted status actions */}
        {course.status === 'submitted' && (
          <>
            {onEdit && (
              <Button onClick={onEdit} color="primary">
                Edit Course
              </Button>
            )}
          </>
        )}
        
        {/* Approved status actions */}
        {course.status === 'approved' && (
          <>
            {onPublish && (
              <Button onClick={onPublish} color="success" variant="contained">
                Publish Course
              </Button>
            )}
            {onEdit && (
              <Button onClick={onEdit} color="primary">
                Edit Course
              </Button>
            )}
          </>
        )}
        
        {/* Active status actions */}
        {course.status === 'active' && (
          <>
            {onEdit && (
              <Button onClick={onEdit} color="primary">
                Edit Course
              </Button>
            )}
          </>
        )}
        
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CourseDetailsDialog;
