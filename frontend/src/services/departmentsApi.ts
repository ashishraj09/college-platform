const API_BASE_URL = 'http://localhost:3001/api';

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
    const response = await fetch(`${API_BASE_URL}/departments`);
    if (!response.ok) {
      throw new Error('Failed to fetch departments');
    }
    return response.json();
  }

  async getDepartment(id: string): Promise<{ department: Department }> {
    const response = await fetch(`${API_BASE_URL}/departments/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch department');
    }
    return response.json();
  }

  async getDepartmentDegrees(departmentId: string): Promise<{ degrees: Degree[] }> {
    const response = await fetch(`${API_BASE_URL}/departments/${departmentId}/degrees`);
    if (!response.ok) {
      throw new Error('Failed to fetch department degrees');
    }
    return response.json();
  }
}

export const departmentsAPI = new DepartmentsAPI();
export default new DepartmentsAPI();
