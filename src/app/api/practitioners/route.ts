import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import type { Practitioner, PractitionerInsert } from "@/types/database";

const mockPractitioners: Practitioner[] = [
  { id: "pr1", name: "山田先生", photo_url: null, bio: "骨盤矯正の専門家。20年の経験。", specialties: ["骨盤矯正", "腰痛治療"], is_active: true, created_at: new Date().toISOString() },
  { id: "pr2", name: "鈴木先生", photo_url: null, bio: "猫背矯正とスポーツ障害を専門。", specialties: ["猫背矯正", "スポーツ障害"], is_active: true, created_at: new Date().toISOString() },
  { id: "pr3", name: "佐藤先生", photo_url: null, bio: "全身調整のスペシャリスト。", specialties: ["全身調整"], is_active: true, created_at: new Date().toISOString() },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get("menu_id");

    try {
      const supabase = await createClient();

      if (menuId) {
        // Filter by menu_id via practitioner_menus join
        const { data: practitionerMenus, error: pmError } = await supabase
          .from("practitioner_menus")
          .select("practitioner_id")
          .eq("menu_id", menuId);

        if (pmError) throw pmError;

        const practitionerIds = ((practitionerMenus || []) as unknown as { practitioner_id: string }[]).map(
          (pm) => pm.practitioner_id
        );

        if (practitionerIds.length === 0) {
          return NextResponse.json({ data: [] });
        }

        const { data, error } = await supabase
          .from("practitioners")
          .select("*")
          .in("id", practitionerIds)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;

        return NextResponse.json({ data: data || [] });
      } else {
        const { data, error } = await supabase
          .from("practitioners")
          .select("*")
          .order("name");

        if (error) throw error;

        return NextResponse.json({ data: data || [] });
      }
    } catch {
      // Fallback to mock data
      return NextResponse.json({ data: mockPractitioners });
    }
  } catch {
    return NextResponse.json(
      { error: "施術者一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, photo_url, bio, specialties, is_active } = body;

    if (!name) {
      return NextResponse.json(
        { error: "名前は必須です" },
        { status: 400 }
      );
    }

    try {
      const supabase = await createClient();

      const insertData: PractitionerInsert = {
        name,
        photo_url: photo_url || null,
        bio: bio || null,
        specialties: specialties || [],
        is_active: is_active !== undefined ? is_active : true,
      };

      const { data, error } = await supabase
        .from("practitioners")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ data }, { status: 201 });
    } catch {
      // Mock fallback
      const mockNew: Practitioner = {
        id: `mock-${Date.now()}`,
        name,
        photo_url: photo_url || null,
        bio: bio || null,
        specialties: specialties || [],
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
      };

      return NextResponse.json({ data: mockNew }, { status: 201 });
    }
  } catch {
    return NextResponse.json(
      { error: "施術者の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
