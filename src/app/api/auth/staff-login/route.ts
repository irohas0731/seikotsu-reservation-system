import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import type { Staff } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login_id, password } = body;

    if (!login_id || !password) {
      return NextResponse.json(
        { error: "ログインIDとパスワードは必須です" },
        { status: 400 }
      );
    }

    try {
      const supabase = await createClient();

      // Find staff by login_id
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("login_id", login_id)
        .single();

      if (error || !data) {
        throw new Error("Supabase query failed");
      }

      const staff = data as unknown as Staff;

      // Simple password check (in production, use bcrypt comparison)
      // For now, we compare against password_hash directly
      // In a real app: await bcrypt.compare(password, staff.password_hash)
      if (staff.password_hash !== password) {
        return NextResponse.json(
          { error: "ログインIDまたはパスワードが正しくありません" },
          { status: 401 }
        );
      }

      // Generate a simple session token
      const sessionToken = `staff_${staff.id}_${Date.now()}`;

      // Set session cookie
      const cookieStore = await cookies();
      cookieStore.set("admin_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return NextResponse.json({
        success: true,
        session_token: sessionToken,
        staff: {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          login_id: staff.login_id,
        },
      });
    } catch {
      // Supabase not configured - use mock response for development
      if (login_id === "admin" && password === "admin") {
        const sessionToken = `staff_mock_${Date.now()}`;

        const cookieStore = await cookies();
        cookieStore.set("admin_session", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
        });

        return NextResponse.json({
          success: true,
          session_token: sessionToken,
          staff: {
            id: "mock-staff-1",
            name: "管理者",
            role: "admin",
            login_id: "admin",
          },
        });
      }

      return NextResponse.json(
        { error: "ログインIDまたはパスワードが正しくありません" },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "リクエストの処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
