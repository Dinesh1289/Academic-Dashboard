"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StudentListItem } from "@/types";
import { DataTable, Pagination, SearchBar, StatusBadge, ErrorState } from "@/components/shared";

// =============================================================================
// StudentsClient
// =============================================================================

interface StudentsClientProps {
  initialData: StudentListItem[];
  initialTotal: number;
  initialPage: number;
  initialQ: string;
  error: string | null;
}

export function StudentsClient({
  initialData,
  initialTotal,
  initialPage,
  initialQ,
  error: initialError,
}: StudentsClientProps) {
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

  const fetchStudents = useCallback(
    async (nextPage: number, nextQ: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          per_page: String(perPage),
          ...(nextQ ? { q: nextQ } : {}),
        });
        const res = await fetch(`/api/students?${params}`);
        const json = await res.json() as {
          data: StudentListItem[];
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
        void fetchStudents(1, q);
        const params = new URLSearchParams(searchParams.toString());
        if (q) params.set("q", q); else params.delete("q");
        params.set("page", "1");
        router.push(`/students?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    void fetchStudents(nextPage, q);
  }

  const columns = [
    {
      key: "student_name" as const,
      header: "Student Name",
      render: (row: StudentListItem) => (
        <div>
          <p className="font-medium text-slate-900">{row.student_name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{row.email}</p>
        </div>
      ),
    },
    {
      key: "email" as const,
      header: "Email",
      className: "hidden md:table-cell",
      render: (row: StudentListItem) => (
        <span className="text-slate-600">{row.email}</span>
      ),
    },
    {
      key: "contact_number" as const,
      header: "Contact",
      className: "hidden lg:table-cell",
      render: (row: StudentListItem) => (
        <span className="text-slate-600">{row.contact_number ?? "—"}</span>
      ),
    },
    {
      key: "current_course_name" as const,
      header: "Course",
      render: (row: StudentListItem) => (
        <span className="text-slate-700">{row.current_course_name ?? "—"}</span>
      ),
    },
    {
      key: "current_batch_name" as const,
      header: "Batch",
      render: (row: StudentListItem) => (
        <span className="text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded-full">
          {row.current_batch_name ?? "—"}
        </span>
      ),
    },
    {
      key: "status" as const,
      header: "Status",
      render: (row: StudentListItem) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Students</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {total.toLocaleString()} students total
          </p>
        </div>
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Search by name or email…"
        className="max-w-sm"
      />

      {error && (
        <ErrorState message={error} onRetry={() => void fetchStudents(page, q)} />
      )}

      {!error && (
        <>
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            emptyMessage="No students found"
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
