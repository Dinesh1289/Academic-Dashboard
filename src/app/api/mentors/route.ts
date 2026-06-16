import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/validators/rbac";
import { mentorService } from "@/lib/services/mentor.service";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(["admin", "academic_team"]);
  if (isAuthError(auth)) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);
    const q = searchParams.get("q") ?? undefined;

    const { data, total } = await mentorService.listMentors({ page, perPage, q });

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
    console.error("[API] GET /mentors:", error);
    return NextResponse.json(
      { data: null, error: "Failed to fetch mentors" },
      { status: 500 },
    );
  }
}
