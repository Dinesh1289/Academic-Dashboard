import { studentRepository } from "@/lib/repositories/student.repository";
import type { StudentListItem, PaginationParams } from "@/types";

// =============================================================================
// StudentService
// =============================================================================

export class StudentService {
  async listStudents(
    params: PaginationParams & { q?: string; batchId?: string; courseId?: string } = {},
  ): Promise<{ data: StudentListItem[]; total: number }> {
    return studentRepository.findAll(params);
  }

  async getStudent(id: string) {
    return studentRepository.findById(id);
  }
}

export const studentService = new StudentService();
