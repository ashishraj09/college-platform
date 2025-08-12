import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Paper,
  Alert
} from '@mui/material';
import { coursesAPI, degreesAPI } from '../../services/api';

interface DebugData {
  courses: any[];
  degrees: any[];
  error: string | null;
  loading: boolean;
}

const DataDebugger: React.FC = () => {
  const [data, setData] = useState<DebugData>({
    courses: [],
    degrees: [],
    error: null,
    loading: false
  });

  const fetchData = async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [coursesResponse, degreesResponse] = await Promise.all([
        coursesAPI.getFacultyCourses(),
        degreesAPI.getFacultyDegrees(),
      ]);
      
      setData({
        courses: coursesResponse.data || [],
        degrees: degreesResponse.data.all || [],
        error: null,
        loading: false
      });
    } catch (error) {
      console.error('Debug fetch error:', error);
      setData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusCounts = () => {
    const statusCounts = {
      draft: 0,
      submitted: 0,
      pending_approval: 0,
      approved: 0,
      active: 0
    };

    data.courses.forEach(course => {
      if (statusCounts.hasOwnProperty(course.status)) {
        statusCounts[course.status as keyof typeof statusCounts]++;
      }
    });

    return statusCounts;
  };

  const statusCounts = getStatusCounts();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Faculty Data Debug Dashboard
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={fetchData} 
        disabled={data.loading}
        sx={{ mb: 3 }}
      >
        {data.loading ? 'Loading...' : 'Refresh Data'}
      </Button>

      {data.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error: {data.error}
        </Alert>
      )}

      {/* Status Overview Cards */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Course Status Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { key: 'draft', label: 'Draft', color: 'default' },
            { key: 'submitted', label: 'Submitted', color: 'warning' },
            { key: 'pending_approval', label: 'Pending Approval', color: 'info' },
            { key: 'approved', label: 'Approved', color: 'success' },
            { key: 'active', label: 'Active', color: 'success' }
          ].map(({ key, label, color }) => (
            <Card key={key} sx={{ textAlign: 'center', p: 2, minWidth: 150 }}>
              <CardContent>
                <Typography variant="h4">
                  {statusCounts[key as keyof typeof statusCounts]}
                </Typography>
                <Chip 
                  label={label}
                  color={color as any}
                  size="small"
                />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>

      {/* Raw Data Debug */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Courses ({data.courses.length})
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                <pre style={{ fontSize: '12px' }}>
                  {JSON.stringify(data.courses, null, 2)}
                </pre>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Degrees ({data.degrees.length})
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                <pre style={{ fontSize: '12px' }}>
                  {JSON.stringify(data.degrees, null, 2)}
                </pre>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default DataDebugger;