import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  IconButton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useRouter } from 'next/router';
import EnrollmentApprovalsTab from '../../components/hod/EnrollmentApprovalsTab';

const EnrollmentApprovalPage: React.FC = () => {
  const router = useRouter();

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            onClick={() => router.push('/hod')}
            sx={{ ml: { xs: 0, sm: 0, md: 0 }, mr: 4, p: 0 }}
            aria-label="Back to dashboard"
          >
            <ArrowBackIcon sx={{ fontSize: 36, color: '#1565c0', fontWeight: 900 }} />
          </IconButton>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h4" component="h1" align="center">
              Student Enrollment Approval
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" align="center">
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
