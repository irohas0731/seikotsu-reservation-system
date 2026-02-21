import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import type { ReservationWithDetails, ReservationInsert } from "@/types/database";

// Mock data for development
const mockReservations: ReservationWithDetails[] = [
  {
    id: "1",
    patient_id: "p1",
    practitioner_id: "pr1",
    menu_id: "m1",
    date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "09:30",
    status: "reserved",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    patient: { id: "p1", name: "田中太郎", phone: "090-1234-5678", birth_date: "1985-03-15", pin_code: "1234", line_user_id: null, memo: null, created_at: new Date().toISOString() },
    practitioner: { id: "pr1", name: "山田先生", photo_url: null, bio: null, specialties: ["骨盤矯正"], is_active: true, created_at: new Date().toISOString() },
    menu: { id: "m1", name: "骨盤矯正", description: null, duration_minutes: 30, price_estimate: 5000, icon: null, sort_order: 1, is_published: true },
  },
  {
    id: "2",
    patient_id: "p2",
    practitioner_id: "pr1",
    menu_id: "m2",
    date: new Date().toISOString().split("T")[0],
    start_time: "10:00",
    end_time: "11:00",
    status: "visited",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    patient: { id: "p2", name: "佐藤花子", phone: "090-2345-6789", birth_date: "1990-07-20", pin_code: "5678", line_user_id: null, memo: null, created_at: new Date().toISOString() },
    practitioner: { id: "pr1", name: "山田先生", photo_url: null, bio: null, specialties: ["骨盤矯正"], is_active: true, created_at: new Date().toISOString() },
    menu: { id: "m2", name: "全身調整", description: null, duration_minutes: 60, price_estimate: 8000, icon: null, sort_order: 2, is_published: true },
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const practitionerId = searchParams.get("practitioner_id");
    const patientId = searchParams.get("patient_id");
    const status = searchParams.get("status");

    try {
      const supabase = await createClient();

      let query = supabase
        .from("reservations")
        .select(`
          *,
          patient:patients(*),
          practitioner:practitioners(*),
          menu:menus(*)
        `)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      // Filter by specific date
      if (date) {
        query = query.eq("date", date);
      }

      // Filter by date range
      if (dateFrom) {
        query = query.gte("date", dateFrom);
      }
      if (dateTo) {
        query = query.lte("date", dateTo);
      }

      // Filter by practitioner
      if (practitionerId) {
        query = query.eq("practitioner_id", practitionerId);
      }

      // Filter by patient
      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      // Filter by status
      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return NextResponse.json({ data });
    } catch {
      // Fallback to mock data
      let filtered = [...mockReservations];

      if (date) {
        filtered = filtered.filter((r) => r.date === date);
      }
      if (dateFrom) {
        filtered = filtered.filter((r) => r.date >= dateFrom);
      }
      if (dateTo) {
        filtered = filtered.filter((r) => r.date <= dateTo);
      }
      if (practitionerId) {
        filtered = filtered.filter((r) => r.practitioner_id === practitionerId);
      }
      if (patientId) {
        filtered = filtered.filter((r) => r.patient_id === patientId);
      }
      if (status) {
        filtered = filtered.filter((r) => r.status === status);
      }

      return NextResponse.json({ data: filtered });
    }
  } catch {
    return NextResponse.json(
      { error: "予約一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patient_id, practitioner_id, menu_id, date, start_time, end_time } = body;

    if (!patient_id || !practitioner_id || !menu_id || !date || !start_time || !end_time) {
      return NextResponse.json(
        { error: "必須項目が入力されていません" },
        { status: 400 }
      );
    }

    try {
      const supabase = await createClient();

      // Double-booking check: same practitioner + same date + overlapping time + not cancelled
      const { data: conflicts } = await supabase
        .from("reservations")
        .select("id")
        .eq("practitioner_id", practitioner_id)
        .eq("date", date)
        .neq("status", "cancelled")
        .lt("start_time", end_time)
        .gt("end_time", start_time);

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json(
          { error: "この時間帯は既に予約が入っています" },
          { status: 409 }
        );
      }

      // Create reservation
      const insertData: ReservationInsert = {
        patient_id,
        practitioner_id,
        menu_id,
        date,
        start_time,
        end_time,
        status: "reserved",
      };

      const { data, error } = await supabase
        .from("reservations")
        .insert(insertData as never)
        .select(`
          *,
          patient:patients(*),
          practitioner:practitioners(*),
          menu:menus(*)
        `)
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({ data }, { status: 201 });
    } catch {
      // Fallback mock response
      const mockNewReservation = {
        id: `mock-${Date.now()}`,
        patient_id,
        practitioner_id,
        menu_id,
        date,
        start_time,
        end_time,
        status: "reserved" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return NextResponse.json({ data: mockNewReservation }, { status: 201 });
    }
  } catch {
    return NextResponse.json(
      { error: "予約の作成中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
