import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Button
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import EventIcon from '@mui/icons-material/Event';
import { CourseWithEnrollmentStatus } from '../../services/enrollmentApi';

interface CourseCardProps {
  course: CourseWithEnrollmentStatus;
  onViewTimeline?: (courseId: string) => void;
  onShowTimeline?: (course: any) => void; // Added to match usage in MyDegreeTab
  onEditEnrollment?: (course: any) => Promise<void>; // Added to match usage in MyDegreeTab
  isSelected?: boolean;
  onToggleSelect?: (courseId: string) => void;
  showSelectButton?: boolean;
  showTimelineButton?: boolean;
  isLoading?: boolean; // Added to match usage in MyDegreeTab
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onViewTimeline,
  onShowTimeline,
  onEditEnrollment,
  isSelected = false,
  onToggleSelect,
  showSelectButton = false,
  showTimelineButton = true,
  isLoading = false
}) => {
  // Use the appropriate function handler
  const handleTimelineClick = () => {
    if (onShowTimeline) {
      onShowTimeline(course);
    } else if (onViewTimeline) {
      onViewTimeline(course.id);
    }
  };
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 2, 
        border: isSelected ? '2px solid #4caf50' : '1px solid #e0e0e0',
        backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.08)' : 'white' 
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: '1 1 auto' }}>
            <Box display="flex" alignItems="center" mb={1}>
              <SchoolIcon sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                {course.code}: {course.name}
              </Typography>
            </Box>
            
            <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
              <Chip 
                size="small" 
                label={`${course.credits} Credits`} 
                color="primary" 
                variant="outlined"
              />
              
              {course.status && (
                <Chip 
                  size="small" 
                  label={course.status} 
                  color={
                    course.status === 'APPROVED' ? 'success' : 
                    course.status === 'PENDING' ? 'warning' : 
                    course.status === 'REJECTED' ? 'error' : 'default'
                  }
                />
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', md: 'flex-end' }, mt: { xs: 2, md: 0 } }}>
            <Box sx={{ flexGrow: 1 }}>
              {course.semester && (
                <Box display="flex" alignItems="center" mb={1}>
                  <EventIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="body2">
                    Semester {course.semester}
                  </Typography>
                </Box>
              )}
            </Box>
            
            <Box display="flex" gap={1} mt={2}>
              {showTimelineButton && (onViewTimeline || onShowTimeline) && (
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={handleTimelineClick}
                >
                  View Timeline
                </Button>
              )}
              
              {onEditEnrollment && (
                <Button 
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => onEditEnrollment(course)}
                  disabled={isLoading}
                >
                  Edit
                </Button>
              )}
              
              {showSelectButton && onToggleSelect && (
                <Button 
                  size="small" 
                  variant={isSelected ? "contained" : "outlined"} 
                  color={isSelected ? "success" : "primary"}
                  onClick={() => onToggleSelect(course.id)}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CourseCard;