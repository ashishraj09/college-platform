import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  IconButton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import EnrollmentApprovalsTab from '../../components/hod/EnrollmentApprovalsTab';

const EnrollmentApprovalPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            onClick={() => navigate('/hod')}
            sx={{ mr: 2 }}
            aria-label="Back to dashboard"
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              Student Enrollment Approval
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Review and approve student course enrollment requests for the current semester
            </Typography>
          </Box>
        </Box>

        <Paper elevation={2} sx={{ p: 0 }}>
          <EnrollmentApprovalsTab />
        </Paper>
      </Box>
    </Container>
  );
};

export default EnrollmentApprovalPage;
