import React, { useState } from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';
import CreateDegreeDialog from '../components/faculty/CreateDegreeDialog';
import { useAuth } from '../contexts/AuthContext';

const CreateDegreePage: React.FC = () => {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create New Degree Program
        </Typography>
        <Paper sx={{ p: 3, mt: 2 }}>
          <CreateDegreeDialog
            open={open}
            onClose={() => { setOpen(false); router.push('/degrees'); }}
            onSuccess={() => { setOpen(false); router.push('/degrees'); }}
            mode="create"
          />
        </Paper>
      </Box>
    </Container>
  );
};

export default CreateDegreePage;
