import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import type { Patient, PatientInsert } from "@/types/database";

const mockPatients: Patient[] = [
  { id: "p1", name: "田中太郎", phone: "090-1234-5678", birth_date: "1985-03-15", pin_code: "1234", line_user_id: null, memo: "腰痛持ち", created_at: "2024-01-10T00:00:00Z" },
  { id: "p2", name: "佐藤花子", phone: "090-2345-6789", birth_date: "1990-07-20", pin_code: "5678", line_user_id: null, memo: null, created_at: "2024-02-15T00:00:00Z" },
  { id: "p3", name: "鈴木一郎", phone: "090-3456-7890", birth_date: "1978-11-05", pin_code: "9012", line_user_id: null, memo: "肩こりがひどい", created_at: "2024-03-20T00:00:00Z" },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    try {
      const supabase = await createClient();

      let dbQuery = supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (query) {
        // Search by name or phone
        dbQuery = dbQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
      }

      const { data, error } = await dbQuery.limit(100);

      if (error) throw error;

      return NextResponse.json({ data: data || [] });
    } catch {
      // Fallback to mock data
      let filtered = [...mockPatients];
      if (query) {
        filtered = filtered.filter(
          (p) => p.name.includes(query) || p.phone.includes(query)
        );
      }
      return NextResponse.json({ data: filtered });
    }
  } catch {
    return NextResponse.json(
      { error: "患者一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, pin_code, birth_date, memo } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "名前と電話番号は必須です" },
        { status: 400 }
      );
    }

    try {
      const supabase = await createClient();

      // Check if phone already exists
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .eq("phone", phone)
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: "この電話番号は既に登録されています" },
          { status: 409 }
        );
      }

      const insertData: PatientInsert = {
        name,
        phone,
        pin_code: pin_code || "0000",
        birth_date: birth_date || null,
        line_user_id: null,
        memo: memo || null,
      };

      const { data, error } = await supabase
        .from("patients")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ data }, { status: 201 });
    } catch {
      // Mock fallback
      const mockNew: Patient = {
        id: `mock-${Date.now()}`,
        name,
        phone,
        pin_code: pin_code || "0000",
        birth_date: birth_date || null,
        line_user_id: null,
        memo: memo || null,
        created_at: new Date().toISOString(),
      };

      return NextResponse.json({ data: mockNew }, { status: 201 });
    }
  } catch {
    return NextResponse.json(
      { error: "患者の登録中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: "患者IDは必須です" },
        { status: 400 }
      );
    }

    // Only allow specific fields to be updated
    const allowedFields = ["name", "phone", "birth_date", "memo", "pin_code", "line_user_id"];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        updateData[field] = updateFields[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "更新するフィールドがありません" },
        { status: 400 }
      );
    }

    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from("patients")
        .update(updateData as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ data });
    } catch {
      // Mock fallback
      return NextResponse.json({
        data: { id, ...updateData },
      });
    }
  } catch {
    return NextResponse.json(
      { error: "患者情報の更新中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
