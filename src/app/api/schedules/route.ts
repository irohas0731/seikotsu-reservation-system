import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import type { DayOfWeek, Schedule } from "@/types/database";

// Generate time slots in 30-min intervals between start and end
function generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number = 30): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const practitionerId = searchParams.get("practitioner_id");
    const date = searchParams.get("date");
    const menuDuration = parseInt(searchParams.get("duration") || "30", 10);

    if (!practitionerId || !date) {
      return NextResponse.json(
        { error: "practitioner_id と date は必須です" },
        { status: 400 }
      );
    }

    // Calculate day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dateObj = new Date(date + "T00:00:00");
    const dayOfWeek = dateObj.getDay() as DayOfWeek;

    try {
      const supabase = await createClient();

      // 1. Check for specific date override (holiday)
      const { data: specificData } = await supabase
        .from("schedules")
        .select("*")
        .eq("practitioner_id", practitionerId)
        .eq("specific_date", date);

      const specificSchedules = (specificData || []) as unknown as Schedule[];

      // If there's a specific holiday for this date, return no slots
      const holidayOverride = specificSchedules.find((s) => s.is_holiday);
      if (holidayOverride) {
        return NextResponse.json({
          data: {
            date,
            practitioner_id: practitionerId,
            available_slots: [],
            is_holiday: true,
          },
        });
      }

      // If there's a specific date schedule (non-holiday), use that
      const specificSchedule = specificSchedules.find((s) => !s.is_holiday && s.is_available);

      // 2. Check regular day-of-week schedule
      const { data: regularData } = await supabase
        .from("schedules")
        .select("*")
        .eq("practitioner_id", practitionerId)
        .eq("day_of_week", dayOfWeek)
        .is("specific_date", null);

      const regularSchedules = (regularData || []) as unknown as Schedule[];

      const schedule = specificSchedule || regularSchedules[0];

      if (!schedule || !schedule.is_available) {
        return NextResponse.json({
          data: {
            date,
            practitioner_id: practitionerId,
            available_slots: [],
            is_holiday: false,
            is_day_off: true,
          },
        });
      }

      // 3. Generate all possible time slots
      const allSlots = generateTimeSlots(schedule.start_time, schedule.end_time);

      // 4. Get existing reservations for this practitioner on this date
      const { data: reservationData } = await supabase
        .from("reservations")
        .select("start_time, end_time")
        .eq("practitioner_id", practitionerId)
        .eq("date", date)
        .neq("status", "cancelled");

      const existingReservations = (reservationData || []) as unknown as { start_time: string; end_time: string }[];

      // 5. Filter out slots that conflict with existing reservations
      const bookedSlots = new Set<string>();
      for (const res of existingReservations) {
        const resSlots = generateTimeSlots(res.start_time, res.end_time);
        resSlots.forEach((s) => bookedSlots.add(s));
      }

      // 6. Also filter out slots where the menu wouldn't fit before end of day
      const availableSlots = allSlots.filter((slot) => {
        if (bookedSlots.has(slot)) return false;

        const [slotH, slotM] = slot.split(":").map(Number);
        const slotMinutes = slotH * 60 + slotM;
        const menuEndMinutes = slotMinutes + menuDuration;

        // Must fit within work hours
        const [endH, endM] = schedule.end_time.split(":").map(Number);
        const workEndMinutes = endH * 60 + endM;
        if (menuEndMinutes > workEndMinutes) return false;

        // Check all slots the menu would occupy
        for (let m = slotMinutes; m < menuEndMinutes; m += 30) {
          const h = Math.floor(m / 60);
          const min = m % 60;
          const checkSlot = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
          if (bookedSlots.has(checkSlot)) return false;
        }

        return true;
      });

      return NextResponse.json({
        data: {
          date,
          practitioner_id: practitionerId,
          available_slots: availableSlots,
          work_start: schedule.start_time,
          work_end: schedule.end_time,
        },
      });
    } catch {
      // Fallback mock response
      const allSlots = generateTimeSlots("09:00", "18:00");
      const bookedSlots = new Set(["10:00", "10:30", "14:00"]);

      const availableSlots = allSlots.filter((slot) => {
        if (bookedSlots.has(slot)) return false;

        const [slotH, slotM] = slot.split(":").map(Number);
        const slotMinutes = slotH * 60 + slotM;
        const menuEndMinutes = slotMinutes + menuDuration;

        if (menuEndMinutes > 18 * 60) return false;

        for (let m = slotMinutes; m < menuEndMinutes; m += 30) {
          const h = Math.floor(m / 60);
          const min = m % 60;
          const checkSlot = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
          if (bookedSlots.has(checkSlot)) return false;
        }

        return true;
      });

      return NextResponse.json({
        data: {
          date,
          practitioner_id: practitionerId,
          available_slots: availableSlots,
          work_start: "09:00",
          work_end: "18:00",
        },
      });
    }
  } catch {
    return NextResponse.json(
      { error: "スケジュールの取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
