import React from 'react';
import { Card, CardContent, CardActions, Box, Typography, Chip, Alert, Button } from '@mui/material';
import { Business as DepartmentIcon, School as SchoolIcon } from '@mui/icons-material';

interface FacultyItemCardProps {
  item: any;
  actions: any[];
  onAction: (action: string, item: any) => void;
}

const FacultyItemCard: React.FC<FacultyItemCardProps> = ({ item, actions, onAction }) => (
  <Card key={item.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', mb: 2 }}>
    <CardContent sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" component="h2">
          {item.name}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Code: {item.code}{item.version > 1 ? ` (v${item.version})` : ''} {item.credits ? ` • ${item.credits} Credits • Semester ${item.semester}` : item.duration_years ? ` • ${item.duration_years} Years` : ''}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }} noWrap>
        {item.overview || item.description}
      </Typography>
      {item.rejection_reason && item.status === 'draft' && (
        <Alert 
          severity="error" 
          variant="outlined"
          sx={{ mb: 2, '& .MuiAlert-message': { width: '100%' }, '& .MuiAlert-icon': { alignItems: 'flex-start', mt: '2px' } }}
        >
          <Box>
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
          </Box>
        </Alert>
      )}
      {item.department && (
        <Typography variant="caption" display="block" sx={{ mb: 1 }}>
          <DepartmentIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
          {item.department.name}
        </Typography>
      )}
      {item.degree && (
        <Typography variant="caption" display="block" sx={{ mb: 2 }}>
          <SchoolIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
          {item.degree.name}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Status chip and elective chip should be passed in as props ideally, but kept as is for now */}
        {item.statusChip}
        {item.is_elective && (
          <Chip label="Elective" variant="outlined" size="small" />
        )}
      </Box>
    </CardContent>
    <CardActions sx={{ pt: 0 }}>
      {actions.map((action, index) => (
        <Button
          key={index}
          size="small"
          startIcon={action.icon}
          onClick={action.disabled ? undefined : () => onAction(action.action, item)}
          disabled={!!action.disabled}
        >
          {action.label}
        </Button>
      ))}
    </CardActions>
  </Card>
);

export default FacultyItemCard;
