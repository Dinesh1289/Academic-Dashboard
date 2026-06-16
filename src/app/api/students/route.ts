import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/validators/rbac";
import { studentService } from "@/lib/services/student.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);
    const q = searchParams.get("q") ?? undefined;
    const batchId = searchParams.get("batch_id") ?? undefined;
    const courseId = searchParams.get("course_id") ?? undefined;

    const { data, total } = await studentService.listStudents({
      page,
      perPage,
      q,
      batchId,
      courseId,
    });

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        per_page: perPage,
        total_pages: Math.ceil(total / perPage),
      },
      error: null,
    });
  } catch (error) {
    console.error("[API] GET /students:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}
