import React from 'react';
import { Paper, Typography, Box, Card, CardContent, Badge } from '@mui/material';

export interface StatusConfig {
  key: string;
  label: string;
  icon: React.ReactElement;
  color: string;
}

interface StatusOverviewProps {
  items: any[];
  statusConfig: StatusConfig[];
  title: React.ReactNode;
}

const StatusOverview: React.FC<StatusOverviewProps> = ({ items, statusConfig, title }) => {
  // Use the count property from items directly
  const statusCounts: Record<string, number> = {};
  statusConfig.forEach(cfg => {
    const found = items.find(item => item.status === cfg.key);
    statusCounts[cfg.key] = found ? found.count : 0;
  });
  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        {statusConfig.map(({ key, label, icon, color }) => (
          <Card key={key} sx={{ textAlign: 'center', minWidth: 180, p: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <Badge badgeContent={statusCounts[key]} color={color as any}>
                  {icon}
                </Badge>
              </Box>
              <Typography variant="h4" component="div">
                {statusCounts[key]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Paper>
  );
};

export default StatusOverview;
