import React, { useState } from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import DegreeDialog from '../components/common/DegreeDialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const CreateDegreePage: React.FC = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create New Degree Program
        </Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          <DegreeDialog
            open={open}
            onClose={() => { setOpen(false); navigate('/degrees'); }}
            onSuccess={() => { setOpen(false); navigate('/degrees'); }}
            initialData={{ userDepartmentId: user?.department?.id, userDepartmentName: user?.department?.name }}
            mode="create"
          />
        </Paper>
      </Box>
    </Container>
  );
};

export default CreateDegreePage;
