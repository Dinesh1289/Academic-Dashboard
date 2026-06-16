"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CourseSummary } from "@/types";
import { DataTable, Pagination, SearchBar, StatusBadge, ErrorState } from "@/components/shared";

// =============================================================================
// CoursesClient
// =============================================================================

interface CoursesClientProps {
  initialData: CourseSummary[];
  initialTotal: number;
  initialPage: number;
  initialQ: string;
  error: string | null;
}

export function CoursesClient({
  initialData,
  initialTotal,
  initialPage,
  initialQ,
  error: initialError,
}: CoursesClientProps) {
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

  const fetchCourses = useCallback(
    async (nextPage: number, nextQ: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          per_page: String(perPage),
          ...(nextQ ? { q: nextQ } : {}),
        });
        const res = await fetch(`/api/courses?${params}`);
        const json = await res.json() as {
          data: CourseSummary[];
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
    [perPage],
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (q !== initialQ) {
        setPage(1);
        void fetchCourses(1, q);
        const params = new URLSearchParams(searchParams.toString());
        if (q) params.set("q", q); else params.delete("q");
        params.set("page", "1");
        router.push(`/courses?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    void fetchCourses(nextPage, q);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`/courses?${params.toString()}`);
  }

  const columns = [
    {
      key: "name" as const,
      header: "Course Name",
      render: (row: CourseSummary) => (
        <span className="font-medium text-slate-900">{row.name}</span>
      ),
    },
    {
      key: "total_active_batches" as const,
      header: "Active Batches",
      render: (row: CourseSummary) => (
        <span className="font-medium text-slate-700">
          {row.total_active_batches}
          <span className="text-slate-400 font-normal"> / {row.total_batches}</span>
        </span>
      ),
    },
    {
      key: "total_students" as const,
      header: "Total Students",
      render: (row: CourseSummary) => (
        <span>{(row.total_students ?? 0).toLocaleString()}</span>
      ),
    },
    {
      key: "is_active" as const,
      header: "Status",
      render: (row: CourseSummary) => (
        <StatusBadge status={row.is_active ? "active" : "inactive"} />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Courses</h2>
          <p className="text-slate-500 text-sm mt-0.5">{total} courses total</p>
        </div>
      </div>

      {/* Search */}
      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Search courses…"
        className="max-w-sm"
      />

      {/* Error */}
      {error && <ErrorState message={error} onRetry={() => void fetchCourses(page, q)} />}

      {/* Table */}
      {!error && (
        <>
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            emptyMessage="No courses found"
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
