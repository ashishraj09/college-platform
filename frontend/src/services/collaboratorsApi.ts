// src/services/collaboratorsApi.ts
import api from './api';

export const collaboratorsAPI = {
  // Get collaborators for a course
  getCourseCollaborators: async (courseId: string) => {
    return (await api.get(`/collaborators/course/${courseId}`)).data;
  },
  // Add a collaborator to a course
  addCourseCollaborator: async (courseId: string, userId: string) => {
    return (await api.post(`/collaborators/course/${courseId}/add`, { userId })).data;
  },
  // Remove a collaborator from a course
  removeCourseCollaborator: async (courseId: string, userId: string) => {
    return (await api.post(`/collaborators/course/${courseId}/remove`, { userId })).data;
  },
  // Get collaborators for a degree
  getDegreeCollaborators: async (degreeId: string) => {
    return (await api.get(`/collaborators/degree/${degreeId}`)).data;
  },
  // Add a collaborator to a degree
  addDegreeCollaborator: async (degreeId: string, userId: string) => {
    return (await api.post(`/collaborators/degree/${degreeId}/add`, { userId })).data;
  },
  // Remove a collaborator from a degree
  removeDegreeCollaborator: async (degreeId: string, userId: string) => {
    return (await api.post(`/collaborators/degree/${degreeId}/remove`, { userId })).data;
  },
};

export default collaboratorsAPI;
