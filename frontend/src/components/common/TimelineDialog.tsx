import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import CommentIcon from '@mui/icons-material/Comment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';

// Timeline event type
export type TimelineEvent = {
	id: string;
	type: 'audit' | 'message';
	action?: string;
	message?: string;
	user?: { id: string; name: string };
	timestamp: string;
	description?: string;
};

interface TimelineDialogProps {
	open: boolean;
	onClose: () => void;
	events: TimelineEvent[];
	entityName: string;
}

const getIcon = (event: TimelineEvent) => {
	if (event.type === 'message') return <CommentIcon color="info" />;
	switch (event.action) {
		case 'create': return <CheckCircleIcon color="success" />;
		case 'delete': return <DeleteIcon color="error" />;
		case 'approve': return <CheckCircleIcon color="primary" />;
		case 'submit': return <TimelineIcon color="info" />;
		default: return <PersonIcon color="disabled" />;
	}
};

const TimelineDialog: React.FC<TimelineDialogProps> = ({ open, onClose, events, entityName }) => (
	<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
		<DialogTitle>Timeline for {entityName}</DialogTitle>
		<DialogContent>
			<List>
				{(() => {
					let allEvents: TimelineEvent[] = [];
					if (Array.isArray(events)) {
						allEvents = events;
					} else if (events && typeof events === 'object') {
						const e: any = events;
						if (Array.isArray(e.audit)) allEvents = allEvents.concat(e.audit);
						if (Array.isArray(e.messages)) allEvents = allEvents.concat(e.messages);
					}
					if (!allEvents || allEvents.length === 0) {
						return <Typography variant="body2" color="text.secondary">No timeline events found.</Typography>;
					}
					return allEvents
						.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
						.map(event => (
							<ListItem key={event.id} alignItems="flex-start">
								<ListItemIcon>{getIcon(event)}</ListItemIcon>
								<ListItemText
									primary={event.type === 'message' ? event.message : event.description}
									secondary={
										<>
											<Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
												<Typography variant="caption">
													{event.user?.name || event.user?.id || 'System'}
												</Typography>
												<Typography variant="caption">{new Date(event.timestamp).toLocaleString()}</Typography>
											</Box>
										</>
									}
								/>
							</ListItem>
						));
				})()}
			</List>
		</DialogContent>
		   <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: 3, pb: 2, pt: 0 }}>
			   <Button
				   onClick={onClose}
				   sx={{
					   fontWeight: 400,
					   fontSize: 16,
					   color: '#1976d2',
					   textTransform: 'uppercase',
					   boxShadow: 'none',
					   background: 'none',
					   minWidth: 0,
					   p: 0,
					   '&:hover': { background: 'none', textDecoration: 'underline' }
				   }}
				   disableRipple
				   disableElevation
				   variant="text"
			   >
				   CLOSE
			   </Button>
		   </Box>
	</Dialog>
);

export default TimelineDialog;
