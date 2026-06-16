"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MentorListItem } from "@/types";
import { DataTable, Pagination, SearchBar, StatusBadge, ErrorState } from "@/components/shared";

// =============================================================================
// MentorsClient
// =============================================================================

interface MentorsClientProps {
  initialData: MentorListItem[];
  initialTotal: number;
  initialPage: number;
  initialQ: string;
  error: string | null;
}

export function MentorsClient({
  initialData,
  initialTotal,
  initialPage,
  initialQ,
  error: initialError,
}: MentorsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [q, setQ] = useState(initialQ);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const fetchMentors = useCallback(
    async (nextPage: number, nextQ: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          per_page: String(perPage),
          ...(nextQ ? { q: nextQ } : {}),
        });
        const res = await fetch(`/api/mentors?${params}`);

        if (res.status === 403) {
          router.push("/dashboard?error=access_denied");
          return;
        }

        const json = await res.json() as {
          data: MentorListItem[];
          meta: { total: number };
          error: string | null;
        };
        if (json.error) throw new Error(json.error);
        setData(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    },
    [perPage, router],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (q !== initialQ) {
        setPage(1);
        void fetchMentors(1, q);
        const params = new URLSearchParams(searchParams.toString());
        if (q) params.set("q", q); else params.delete("q");
        router.push(`/mentors?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    void fetchMentors(nextPage, q);
  }

  const columns = [
    {
      key: "full_name" as const,
      header: "Mentor Name",
      render: (row: MentorListItem) => (
        <div>
          <p className="font-medium text-slate-900">{row.full_name}</p>
          {row.email && (
            <p className="text-xs text-slate-400 mt-0.5">{row.email}</p>
          )}
        </div>
      ),
    },
    {
      key: "courses_assigned" as const,
      header: "Courses Assigned",
      render: (row: MentorListItem) => (
        <div className="flex flex-wrap gap-1">
          {row.courses_assigned.length > 0 ? (
            row.courses_assigned.map((c) => (
              <span
                key={c}
                className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full"
              >
                {c}
              </span>
            ))
          ) : (
            <span className="text-slate-400 text-sm">—</span>
          )}
        </div>
      ),
    },
    {
      key: "batches_assigned" as const,
      header: "Batches Assigned",
      render: (row: MentorListItem) => (
        <div className="flex flex-wrap gap-1">
          {row.batches_assigned.length > 0 ? (
            row.batches_assigned.slice(0, 3).map((b) => (
              <span
                key={b}
                className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
              >
                {b}
              </span>
            ))
          ) : (
            <span className="text-slate-400 text-sm">—</span>
          )}
          {row.batches_assigned.length > 3 && (
            <span className="text-xs text-slate-400">
              +{row.batches_assigned.length - 3} more
            </span>
          )}
        </div>
      ),
    },
    {
      key: "is_active" as const,
      header: "Status",
      render: (row: MentorListItem) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mentors</h2>
          <p className="text-slate-500 text-sm mt-0.5">{total} mentors total</p>
        </div>
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Search mentors…"
        className="max-w-sm"
      />

      {error && (
        <ErrorState message={error} onRetry={() => void fetchMentors(page, q)} />
      )}

      {!error && (
        <>
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            emptyMessage="No mentors found"
            keyExtractor={(row) => row.id}
          />
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              perPage={perPage}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
