import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, List, ListItem, ListItemText, IconButton, CircularProgress as MuiCircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { collaboratorsAPI } from '../../services/collaboratorsApi';
import { usersAPI } from '../../services/api';
import LoadingButton from '../../components/common/LoadingButton';
import { useSnackbar } from 'notistack';

const CollaboratorManager: React.FC<{
  entity: any;
  entityType: 'course' | 'degree' | null;
  onClose: () => void;
  onCollaboratorsChanged?: (collaborators: any[]) => void;
}> = ({ entity, entityType, onClose, onCollaboratorsChanged }) => {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (!entity || !entity.id || !entityType) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        let collabRes, usersRes;
        if (entityType === 'course') {
          collabRes = await collaboratorsAPI.getCourseCollaborators(entity.id);
        } else {
          collabRes = await collaboratorsAPI.getDegreeCollaborators(entity.id);
        }
        // Filter out HOD and creator from collaborators
        const creatorId = entity.creator?.id || entity.created_by;
        const filteredCollaborators = (collabRes.collaborators || []).filter((u: any) => {
          if (u.id === creatorId) return false;
          if (u.is_head_of_department) return false;
          return true;
        });
        setCollaborators(filteredCollaborators);
        usersRes = await usersAPI.getUsers({ department_code: entity.department?.code, user_type: 'faculty', status: 'active' });
        const excludeIds = new Set([
          ...(collabRes.collaborators || []).map((u: any) => u.id),
          entity.creator?.id
        ]);
        setEligibleUsers((usersRes.users || []).filter((u: any) => !excludeIds.has(u.id) && !u.is_head_of_department));
      } catch (err) {
        enqueueSnackbar('Failed to load collaborators or users', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [entity, entityType]);

  const handleAdd = async () => {
    if (!selectedUser || !entity || !entityType) return;
    setAddLoading(true);
    try {
      if (entityType === 'course') {
        await collaboratorsAPI.addCourseCollaborator(entity.id, selectedUser.id);
      } else {
        await collaboratorsAPI.addDegreeCollaborator(entity.id, selectedUser.id);
      }
      enqueueSnackbar('Collaborator added', { variant: 'success' });
      setSelectedUser(null);
      let updatedCollaborators = [];
      if (entityType === 'course') {
        const res = await collaboratorsAPI.getCourseCollaborators(entity.id);
        updatedCollaborators = res.collaborators || [];
        setCollaborators(updatedCollaborators);
      } else {
        const res = await collaboratorsAPI.getDegreeCollaborators(entity.id);
        updatedCollaborators = res.collaborators || [];
        setCollaborators(updatedCollaborators);
      }
      if (onCollaboratorsChanged) {
        // Filter out HOD and creator as in the table logic
        const creatorId = entity.creator?.id || entity.created_by;
        const filtered = (updatedCollaborators || []).filter((u: any) => {
          if (u.id === creatorId) return false;
          if (u.is_head_of_department) return false;
          return true;
        });
        onCollaboratorsChanged(filtered);
      }
      setEligibleUsers(eligibleUsers.filter((u) => u.id !== selectedUser.id));
    } catch (err) {
      enqueueSnackbar('Failed to add collaborator', { variant: 'error' });
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!entity || !entityType) return;
    setRemoveLoadingId(userId);
    try {
      if (entityType === 'course') {
        await collaboratorsAPI.removeCourseCollaborator(entity.id, userId);
      } else {
        await collaboratorsAPI.removeDegreeCollaborator(entity.id, userId);
      }
      enqueueSnackbar('Collaborator removed', { variant: 'success' });
      let updatedCollaborators = [];
      if (entityType === 'course') {
        const res = await collaboratorsAPI.getCourseCollaborators(entity.id);
        updatedCollaborators = res.collaborators || [];
        setCollaborators(updatedCollaborators);
      } else {
        const res = await collaboratorsAPI.getDegreeCollaborators(entity.id);
        updatedCollaborators = res.collaborators || [];
        setCollaborators(updatedCollaborators);
      }
      if (onCollaboratorsChanged) {
        // Filter out HOD and creator as in the table logic
        const creatorId = entity.creator?.id || entity.created_by;
        const filtered = (updatedCollaborators || []).filter((u: any) => {
          if (u.id === creatorId) return false;
          if (u.is_head_of_department) return false;
          return true;
        });
        onCollaboratorsChanged(filtered);
      }
      const removedUser = collaborators.find((u) => u.id === userId);
      if (removedUser) setEligibleUsers([...eligibleUsers, removedUser]);
    } catch (err) {
      enqueueSnackbar('Failed to remove collaborator', { variant: 'error' });
    } finally {
      setRemoveLoadingId(null);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      {loading ? (
        <MuiCircularProgress size={32} />
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>Current Collaborators:</div>
          <List dense>
            {collaborators.length === 0 && <ListItem><ListItemText primary="No collaborators yet." /></ListItem>}
            {collaborators.map((user) => (
              <ListItem key={user.id} secondaryAction={
                <IconButton edge="end" aria-label="remove" onClick={() => handleRemove(user.id)} disabled={removeLoadingId === user.id}>
                  {removeLoadingId === user.id ? <MuiCircularProgress size={20} /> : <DeleteIcon />}
                </IconButton>
              }>
                <ListItemText primary={`${user.first_name} ${user.last_name}`} secondary={user.email} />
              </ListItem>
            ))}
          </List>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center' }}>
            <Autocomplete
              options={eligibleUsers}
              getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.email})`}
              value={selectedUser}
              onChange={(_, value) => setSelectedUser(value)}
              style={{ flex: 1, marginRight: 16 }}
              renderInput={(params) => <TextField {...params} label="Add Collaborator" variant="outlined" size="small" />}
              disabled={addLoading || eligibleUsers.length === 0}
            />
            <LoadingButton
              onClick={handleAdd}
              loading={addLoading}
              disabled={!selectedUser}
              variant="contained"
              size="small"
            >
              Add
            </LoadingButton>
          </div>
        </>
      )}
    </div>
  );
};

export default CollaboratorManager;
