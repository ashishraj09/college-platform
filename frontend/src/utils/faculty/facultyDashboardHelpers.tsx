import React from 'react';
import { Button, Chip } from '@mui/material';
import { Edit as EditIcon, Send as SendIcon, Delete as DeleteIcon, Visibility as VisibilityIcon, Publish as PublishIcon, CheckCircle as ApproveIcon } from '@mui/icons-material';

export type EntityType = 'course' | 'degree';
export interface Entity {
  id: string;
  name: string;
  code: string;
  version_code?: string;
  overview?: string;
  credits?: number;
  semester?: number;
  status: string;
  is_elective?: boolean;
  rejection_reason?: string;
  version: number;
  hasNewPendingVersion?: boolean; // optional flag used to disable edit when a newer version exists
  department?: { name: string; code: string };
  degree?: { name: string; code: string };
  entityType: EntityType;
  [key: string]: any;
}

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'draft':
      return <Chip icon={<EditIcon />} label="Draft" color="default" size="small" />;
    case 'pending_approval':
      return <Chip icon={<SendIcon />} label="Pending" color="info" size="small" />;
    case 'approved':
      return <Chip icon={<ApproveIcon />} label="Approved" color="success" size="small" />;
    case 'active':
      return <Chip icon={<PublishIcon />} label="Active" color="success" size="small" />;
    default:
      return <Chip label={status} size="small" />;
  }
};

export const getAvailableEntityActions = (entity: Entity, type: EntityType, isHOD: boolean = false) => {
  const actions: any[] = [];
  // Always include View first so it's available on all statuses (draft, pending, approved, active)
  actions.push({ action: 'view', label: `View ${type}`, icon: <VisibilityIcon />, disabled: false });

  switch (entity.status) {
    case 'draft':
      actions.push(
        { action: 'edit', label: `Edit ${type}`, icon: <EditIcon />, disabled: false },
        { action: 'submit', label: 'Submit for Approval', icon: <SendIcon />, disabled: false },
        { action: 'delete', label: `Delete ${type}`, icon: <DeleteIcon />, disabled: false }
      );
      break;
    case 'pending_approval':
    case 'submitted':
      actions.push(
        { action: 'edit', label: `Edit ${type}`, icon: <EditIcon />, disabled: (type === 'course' && entity.hasNewPendingVersion === true) || (type === 'degree' && entity.hasNewPendingVersion === true) }
      );
      if (isHOD && entity.status === 'pending_approval') {
        actions.push({ action: 'approve', label: `Approve ${type}`, icon: <ApproveIcon />, disabled: false });
      }
      break;
    case 'approved':
      actions.push(
        { action: 'edit', label: `Edit ${type}`, icon: <EditIcon />, disabled: (type === 'course' && entity.hasNewPendingVersion === true) || (type === 'degree' && entity.hasNewPendingVersion === true) },
        { action: 'publish', label: 'Publish', icon: <PublishIcon />, disabled: false }
      );
      break;
    case 'active':
      actions.push({ action: 'edit', label: `Edit ${type}`, icon: <EditIcon />, disabled: (type === 'course' && entity.hasNewPendingVersion === true) || (type === 'degree' && entity.hasNewPendingVersion === true) });
      break;
    default:
      // Only View for unknown statuses
      break;
  }
  return actions;
};

export const handleEntityAction = async (
  action: string,
  entity: Entity,
  type: EntityType,
  api: any,
  user: any,
  setDialogOpen: (open: boolean) => void,
  setEntityToEdit: (entity: Entity | null) => void,
  enqueueSnackbar: (msg: string, opts?: any) => void,
  navigate: (url: string) => void,
  loadData: () => void
) => {

  // Map correct API methods for each entity type
  const submitFn = type === 'course' ? api.submitCourse : api.submitDegree;
  const approveFn = type === 'course' ? api.approveCourse : api.approveDegree;
  const publishFn = type === 'course' ? api.publishCourse : api.publishDegree;
  const deleteFn = type === 'course' ? api.deleteCourse : api.deleteDegree;

  switch (action) {
    case 'edit':
      setEntityToEdit(entity);
      setDialogOpen(true);
      break;
    case 'submit':
      await submitFn(entity.id, user?.id, user?.department?.id);
      enqueueSnackbar(`${type.charAt(0).toUpperCase() + type.slice(1)} submitted for approval!`, { variant: 'success' });
      loadData();
      break;
    case 'approve':
      await approveFn(entity.id);
      enqueueSnackbar(`${type.charAt(0).toUpperCase() + type.slice(1)} approved!`, { variant: 'success' });
      loadData();
      break;
    case 'publish':
      await publishFn(entity.id, user?.id, user?.department?.id);
      enqueueSnackbar(`${type.charAt(0).toUpperCase() + type.slice(1)} published!`, { variant: 'success' });
      loadData();
      break;
    case 'delete':
      await deleteFn(entity.id, user?.id, user?.department?.id);
      enqueueSnackbar(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted!`, { variant: 'success' });
      loadData();
      break;
    default:
      break;
  }
};
