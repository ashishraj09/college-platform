import api from './api';

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}


export interface Degree {
  id: string;
  name: string;
  code: string;
  description: string;
  duration_years: number;
  department_id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

class DepartmentsAPI {
  async getAllDepartments(): Promise<{ departments: Department[] }> {
    const response = await api.get('/departments');
    return response.data;
  }

  async getDepartment(id: string): Promise<{ department: Department }> {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  }

  async getDepartmentDegrees(departmentId: string): Promise<{ degrees: Degree[] }> {
    const response = await api.get(`/departments/${departmentId}/degrees`);
    return response.data;
  }
  
  async getAllDegrees(): Promise<{ degrees: Degree[] }> {
    const response = await api.get('/degrees');
    return response.data;
  }
}

export const departmentsAPI = new DepartmentsAPI();
export default new DepartmentsAPI();
