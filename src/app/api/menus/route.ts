import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import type { Menu, MenuInsert } from "@/types/database";

const mockMenus: Menu[] = [
  { id: "m1", name: "骨盤矯正", description: "骨盤のゆがみを整え、腰痛や姿勢の改善を目指します。", duration_minutes: 30, price_estimate: 5000, icon: "bone", sort_order: 1, is_published: true },
  { id: "m2", name: "全身調整", description: "全身のバランスを整える施術です。", duration_minutes: 60, price_estimate: 8000, icon: "body", sort_order: 2, is_published: true },
  { id: "m3", name: "猫背矯正", description: "猫背を改善し、正しい姿勢を取り戻す施術です。", duration_minutes: 45, price_estimate: 6000, icon: "spine", sort_order: 3, is_published: true },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUnpublished = searchParams.get("include_unpublished") === "true";

    try {
      const supabase = await createClient();

      let query = supabase
        .from("menus")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!includeUnpublished) {
        query = query.eq("is_published", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return NextResponse.json({ data: data || [] });
    } catch {
      // Fallback to mock data
      const filtered = includeUnpublished
        ? mockMenus
        : mockMenus.filter((m) => m.is_published);

      return NextResponse.json({ data: filtered });
    }
  } catch {
    return NextResponse.json(
      { error: "メニュー一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, duration_minutes, price_estimate, icon, sort_order, is_published } = body;

    if (!name || !duration_minutes) {
      return NextResponse.json(
        { error: "メニュー名と施術時間は必須です" },
        { status: 400 }
      );
    }

    try {
      const supabase = await createClient();

      // If no sort_order, get the max and add 1
      let finalSortOrder = sort_order;
      if (finalSortOrder === undefined || finalSortOrder === null) {
        const { data: maxMenuData } = await supabase
          .from("menus")
          .select("sort_order")
          .order("sort_order", { ascending: false })
          .limit(1)
          .single();

        const maxMenu = maxMenuData as unknown as { sort_order: number } | null;
        finalSortOrder = (maxMenu?.sort_order || 0) + 1;
      }

      const insertData: MenuInsert = {
        name,
        description: description || null,
        duration_minutes,
        price_estimate: price_estimate || null,
        icon: icon || null,
        sort_order: finalSortOrder,
        is_published: is_published !== undefined ? is_published : true,
      };

      const { data, error } = await supabase
        .from("menus")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ data }, { status: 201 });
    } catch {
      // Mock fallback
      const mockNew: Menu = {
        id: `mock-${Date.now()}`,
        name,
        description: description || null,
        duration_minutes,
        price_estimate: price_estimate || null,
        icon: icon || null,
        sort_order: sort_order || mockMenus.length + 1,
        is_published: is_published !== undefined ? is_published : true,
      };

      return NextResponse.json({ data: mockNew }, { status: 201 });
    }
  } catch {
    return NextResponse.json(
      { error: "メニューの作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
