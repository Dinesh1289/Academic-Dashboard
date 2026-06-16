import { courseService } from "@/lib/services/course.service";
import { CoursesClient } from "./CoursesClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function CoursesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const q = params.q ?? undefined;

  let result = { data: [] as Awaited<ReturnType<typeof courseService.listCourses>>["data"], total: 0 };
  let error: string | null = null;

  try {
    result = await courseService.listCourses({ page, perPage: 20, q });
  } catch {
    error = "Failed to load courses";
  }

  return (
    <CoursesClient
      initialData={result.data}
      initialTotal={result.total}
      initialPage={page}
      initialQ={q ?? ""}
      error={error}
    />
  );
}
