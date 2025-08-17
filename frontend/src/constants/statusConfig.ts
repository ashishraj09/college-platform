import DraftsIcon from '@mui/icons-material/Drafts';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export const STATUS_CONFIG = [
  { key: 'draft', label: 'Draft', icon: DraftsIcon, color: 'default', iconColor: '#616161' },
  { key: 'pending_approval', label: 'Pending Approval', icon: PendingActionsIcon, color: 'info', iconColor: '#0288d1' },
  { key: 'approved', label: 'Approved', icon: CheckCircleIcon, color: 'success', iconColor: '#2e7d32' },
  { key: 'active', label: 'Active', icon: PlayArrowIcon, color: 'success', iconColor: '#388e3c' }
];
