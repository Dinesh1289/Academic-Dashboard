import { serverEnv } from "@/lib/validators/env";
import type {
  EdminglePaginatedResponse,
  EdmingleCourse,
  EdmingleMentor,
  EdmingleBatch,
  EdmingleStudent,
  EdmingleEnrollment,
  EdmingleAttendance,
  EdmingleAssessment,
  EdmingleFeedback,
} from "@/types/edmingle";

// =============================================================================
// Edmingle API Client
// Handles: auth headers, pagination, retry with exponential backoff, timeouts
// =============================================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30_000;
const PAGE_SIZE = 100;

export class EdmingleError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly module?: string,
  ) {
    super(message);
    this.name = "EdmingleError";
  }
}

// ─── Sleep helper ──────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core fetch with timeout ───────────────────────────────────────────────
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Retry with exponential backoff ───────────────────────────────────────
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delayMs: number = BASE_DELAY_MS,
  module?: string,
): Promise<T> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on auth errors or if we've exhausted retries
      if (error instanceof EdmingleError && error.status === 401) {
        throw error;
      }
      if (attempt === retries) break;

      const delay = delayMs * Math.pow(2, attempt);
      console.warn(
        `[Edmingle] ${module ?? "unknown"} attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms…`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

// =============================================================================
// EdmingleClient class
// =============================================================================

export class EdmingleClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor() {
    this.baseUrl = serverEnv.EDMINGLE_BASE_URL;
    this.headers = {
      apikey: serverEnv.EDMINGLE_API_KEY,
      ORGID: serverEnv.EDMINGLE_ORG_ID,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  // ─── Generic GET with retry ──────────────────────────────────────────────
  private async get<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
    module?: string,
  ): Promise<T> {
    return retryWithBackoff(async () => {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.set(key, String(value));
      });

      const response = await fetchWithTimeout(url.toString(), {
        method: "GET",
        headers: this.headers,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : BASE_DELAY_MS * 2;
        await sleep(waitMs);
        throw new EdmingleError("Rate limited", 429, module);
      }

      if (response.status === 401) {
        throw new EdmingleError("Edmingle authentication failed — check EDMINGLE_API_KEY and EDMINGLE_ORG_ID", 401, module);
      }

      if (!response.ok) {
        throw new EdmingleError(
          `Edmingle API error: ${response.status} ${response.statusText}`,
          response.status,
          module,
        );
      }

      return response.json() as Promise<T>;
    }, MAX_RETRIES, BASE_DELAY_MS, module);
  }

  // ─── Paginated fetch — yields all records across all pages ──────────────
  async *getPaginated<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
    module?: string,
  ): AsyncGenerator<T[], void, unknown> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.get<EdminglePaginatedResponse<T>>(
        endpoint,
        { ...params, page, limit: PAGE_SIZE },
        module,
      );

      // Handle different API response shapes
      const records = Array.isArray(response)
        ? (response as T[])
        : (response.data ?? []);

      if (records.length === 0) {
        hasMore = false;
        break;
      }

      yield records;

      // Check if more pages exist
      hasMore =
        (response as EdminglePaginatedResponse<T>).has_more === true ||
        records.length === PAGE_SIZE;
      page++;
    }
  }

  // ─── Module-specific fetch methods ───────────────────────────────────────

  async *getCourses(updatedSince?: string): AsyncGenerator<EdmingleCourse[]> {
    yield* this.getPaginated<EdmingleCourse>(
      "/courses",
      updatedSince ? { updated_since: updatedSince } : {},
      "courses",
    );
  }

  async *getMentors(updatedSince?: string): AsyncGenerator<EdmingleMentor[]> {
    yield* this.getPaginated<EdmingleMentor>(
      "/users",
      { role: "mentor", ...(updatedSince ? { updated_since: updatedSince } : {}) },
      "mentors",
    );
  }

  async *getBatches(updatedSince?: string): AsyncGenerator<EdmingleBatch[]> {
    yield* this.getPaginated<EdmingleBatch>(
      "/batches",
      updatedSince ? { updated_since: updatedSince } : {},
      "batches",
    );
  }

  async *getStudents(updatedSince?: string): AsyncGenerator<EdmingleStudent[]> {
    yield* this.getPaginated<EdmingleStudent>(
      "/users",
      { role: "student", ...(updatedSince ? { updated_since: updatedSince } : {}) },
      "students",
    );
  }

  async *getEnrollments(updatedSince?: string): AsyncGenerator<EdmingleEnrollment[]> {
    yield* this.getPaginated<EdmingleEnrollment>(
      "/enrollments",
      updatedSince ? { updated_since: updatedSince } : {},
      "enrollments",
    );
  }

  async *getAttendance(updatedSince?: string): AsyncGenerator<EdmingleAttendance[]> {
    yield* this.getPaginated<EdmingleAttendance>(
      "/attendance",
      updatedSince ? { updated_since: updatedSince } : {},
      "attendance",
    );
  }

  async *getAssessments(updatedSince?: string): AsyncGenerator<EdmingleAssessment[]> {
    yield* this.getPaginated<EdmingleAssessment>(
      "/assessments",
      updatedSince ? { updated_since: updatedSince } : {},
      "assessments",
    );
  }

  async *getFeedback(updatedSince?: string): AsyncGenerator<EdmingleFeedback[]> {
    yield* this.getPaginated<EdmingleFeedback>(
      "/feedback",
      updatedSince ? { updated_since: updatedSince } : {},
      "feedback",
    );
  }
}

// Singleton instance
let edmingleClient: EdmingleClient | null = null;

export function getEdmingleClient(): EdmingleClient {
  if (!edmingleClient) {
    edmingleClient = new EdmingleClient();
  }
  return edmingleClient;
}
