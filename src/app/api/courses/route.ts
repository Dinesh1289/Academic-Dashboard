import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/validators/rbac";
import { courseService } from "@/lib/services/course.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);
    const q = searchParams.get("q") ?? undefined;

    const { data, total } = await courseService.listCourses({ page, perPage, q });
    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({
      data,
      meta: { total, page, per_page: perPage, total_pages: totalPages },
      error: null,
    });
  } catch (error) {
    console.error("[API] GET /courses:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch courses" },
      { status: 500 },
    );
  }
}
