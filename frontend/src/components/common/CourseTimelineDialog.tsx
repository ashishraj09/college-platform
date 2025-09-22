import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface CourseTimelineDialogProps {
  open: boolean;
  onClose: () => void;
  courseId?: string | null;
  course?: any; // Added to match usage in MyDegreeTab
  courseTimeline?: { 
    date: string;
    status: string;
    message?: string;
  }[];
  courseName?: string;
}

const CourseTimelineDialog: React.FC<CourseTimelineDialogProps> = ({
  open,
  onClose,
  courseId,
  course,
  courseTimeline = [],
  courseName = 'Course'
}) => {
  // Use courseId from either the direct prop or from the course object
  const effectiveCourseId = courseId || (course && course.id);
  const effectiveCourseName = courseName || (course && course.name) || 'Course';
  
  if (!effectiveCourseId && !course) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6">
          Timeline for {effectiveCourseName}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {courseTimeline.length === 0 ? (
          <Box py={3} textAlign="center">
            <AccessTimeIcon fontSize="large" sx={{ mb: 2, color: 'text.secondary' }} />
            <Typography variant="body1" color="text.secondary">
              No timeline events available for this course
            </Typography>
          </Box>
        ) : (
          <Timeline position="alternate">
            {courseTimeline.map((event, index) => (
              <TimelineItem key={index}>
                <TimelineOppositeContent color="text.secondary">
                  {new Date(event.date).toLocaleDateString()}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot 
                    color={
                      event.status === 'APPROVED' ? 'success' :
                      event.status === 'PENDING' ? 'warning' :
                      event.status === 'REJECTED' ? 'error' : 'grey'
                    }
                  >
                    {event.status === 'APPROVED' ? <CheckCircleIcon /> :
                     event.status === 'PENDING' ? <PendingIcon /> :
                     event.status === 'REJECTED' ? <CancelIcon /> : 
                     <EventIcon />}
                  </TimelineDot>
                  {index < courseTimeline.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="h6" component="span">
                    {event.status}
                  </Typography>
                  {event.message && (
                    <Typography variant="body2">{event.message}</Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CourseTimelineDialog;