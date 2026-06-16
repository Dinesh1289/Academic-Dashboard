import { BaseRepository } from "./base";
import type { DbUser, UserRole } from "@/types";

// =============================================================================
// UserRepository
// =============================================================================

export class UserRepository extends BaseRepository {
  async findBySupabaseUid(supabaseUid: string): Promise<DbUser | null> {
    const { data, error } = await this.db
      .from("users")
      .select("*")
      .eq("supabase_uid", supabaseUid)
      .eq("is_active", true)
      .single();

    if (error) return null;
    return data as DbUser;
  }

  async findByEmail(email: string): Promise<DbUser | null> {
    const { data, error } = await this.db
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) return null;
    return data as DbUser;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", id);
  }

  async createUser(params: {
    supabaseUid: string;
    email: string;
    fullName: string;
    role: UserRole;
  }): Promise<DbUser> {
    const { data, error } = await this.db
      .from("users")
      .insert({
        supabase_uid: params.supabaseUid,
        email: params.email,
        full_name: params.fullName,
        role: params.role,
      })
      .select()
      .single();

    if (error) this.handleError(error, "UserRepository.createUser");
    return data as DbUser;
  }

  async findAll(): Promise<DbUser[]> {
    const { data, error } = await this.db
      .from("users")
      .select("*")
      .order("full_name");

    if (error) this.handleError(error, "UserRepository.findAll");
    return (data ?? []) as DbUser[];
  }
}

export const userRepository = new UserRepository();
