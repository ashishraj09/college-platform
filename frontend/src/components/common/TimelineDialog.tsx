import React from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
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
					{events.length === 0 ? (
						<Typography variant="body2" color="text.secondary">No timeline events found.</Typography>
					) : (
						events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map(event => (
							<ListItem key={event.id} alignItems="flex-start">
								<ListItemIcon>{getIcon(event)}</ListItemIcon>
								<ListItemText
									primary={event.type === 'message' ? event.message : event.action}
									secondary={
										<>
											<Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
												<Typography variant="caption">
													{event.user?.name || event.user?.id || 'System'}
												</Typography>
												<Typography variant="caption">{new Date(event.timestamp).toLocaleString()}</Typography>
											</Box>
											{event.description && (
												<Typography variant="body2" color="text.secondary">{event.description}</Typography>
											)}
										</>
									}
								/>
							</ListItem>
						))
					)}
				</List>
			</DialogContent>
		</Dialog>
);

export default TimelineDialog;
