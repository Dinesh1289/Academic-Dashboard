import { studentService } from "@/lib/services/student.service";
import { StudentsClient } from "./StudentsClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function StudentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const q = params.q ?? undefined;

  let result = {
    data: [] as Awaited<ReturnType<typeof studentService.listStudents>>["data"],
    total: 0,
  };
  let error: string | null = null;

  try {
    result = await studentService.listStudents({ page, perPage: 20, q });
  } catch {
    error = "Failed to load students";
  }

  return (
    <StudentsClient
      initialData={result.data}
      initialTotal={result.total}
      initialPage={page}
      initialQ={q ?? ""}
      error={error}
    />
  );
}
