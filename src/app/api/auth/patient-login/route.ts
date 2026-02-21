import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import type { Patient } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pin_code } = body;

    if (!phone || !pin_code) {
      return NextResponse.json(
        { error: "電話番号とPINコードは必須です" },
        { status: 400 }
      );
    }

    try {
      const supabase = await createClient();

      // Find patient by phone and pin_code
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("phone", phone)
        .eq("pin_code", pin_code)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "電話番号またはPINコードが正しくありません" },
          { status: 401 }
        );
      }

      const patient = data as unknown as Patient;

      return NextResponse.json({
        success: true,
        patient: {
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
          birth_date: patient.birth_date,
        },
      });
    } catch {
      // Supabase not configured - use mock response
      if (phone === "090-1234-5678" && pin_code === "1234") {
        return NextResponse.json({
          success: true,
          patient: {
            id: "mock-patient-1",
            name: "テスト患者",
            phone: "090-1234-5678",
            birth_date: "1990-01-01",
          },
        });
      }

      return NextResponse.json(
        { error: "電話番号またはPINコードが正しくありません" },
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
