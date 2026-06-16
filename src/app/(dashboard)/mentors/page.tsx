import { mentorService } from "@/lib/services/mentor.service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userRepository } from "@/lib/repositories/user.repository";
import { redirect } from "next/navigation";
import { MentorsClient } from "./MentorsClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function MentorsPage({ searchParams }: Props) {
  // RBAC: support_team cannot access mentors
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await userRepository.findBySupabaseUid(user.id);
  if (!dbUser || dbUser.role === "support_team") redirect("/dashboard?error=access_denied");

  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const q = params.q ?? undefined;

  let result = {
    data: [] as Awaited<ReturnType<typeof mentorService.listMentors>>["data"],
    total: 0,
  };
  let error: string | null = null;

  try {
    result = await mentorService.listMentors({ page, perPage: 20, q });
  } catch {
    error = "Failed to load mentors";
  }

  return (
    <MentorsClient
      initialData={result.data}
      initialTotal={result.total}
      initialPage={page}
      initialQ={q ?? ""}
      error={error}
    />
  );
}
