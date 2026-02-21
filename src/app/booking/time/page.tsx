"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { format, parse } from "date-fns";
import { ja } from "date-fns/locale";
import { useBooking } from "@/lib/booking-store";
import { StepIndicator } from "@/components/step-indicator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 時間帯のスロット型
// ---------------------------------------------------------------------------
interface TimeSlot {
  time: string; // "09:00" 形式
  available: boolean;
}

// ---------------------------------------------------------------------------
// モック時間スロットを生成
// ---------------------------------------------------------------------------
function generateMockTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startHour = 9;
  const endHour = 18;

  for (let hour = startHour; hour < endHour; hour++) {
    for (const minute of [0, 30]) {
      const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const hash = (hour * 60 + minute) % 7;
      slots.push({
        time,
        available: hash !== 0 && hash !== 3,
      });
    }
  }
  return slots;
}

export default function TimeSelectionPage() {
  const router = useRouter();
  const { state, setTime } = useBooking();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const isOmakase = state.selectedPractitioner === null;

  // 必須情報チェック
  useEffect(() => {
    if (!state.selectedMenu) {
      router.replace("/booking/menu");
    } else if (!state.selectedDate) {
      router.replace("/booking/date");
    }
  }, [state.selectedMenu, state.selectedDate, router]);

  // 日付フォーマット
  const formattedDate = useMemo(() => {
    if (!state.selectedDate) return "";
    const dateObj = parse(state.selectedDate, "yyyy-MM-dd", new Date());
    return format(dateObj, "M月d日（E）", { locale: ja });
  }, [state.selectedDate]);

  // タイムスロットの取得
  useEffect(() => {
    if (!state.selectedDate || !state.selectedMenu) return;

    async function fetchTimeSlots() {
      try {
        const { supabase } = await import("@/lib/supabase-browser");

        const query = supabase
          .from("reservations")
          .select("start_time, end_time, practitioner_id")
          .eq("date", state.selectedDate!)
          .eq("status", "reserved");

        if (!isOmakase && state.selectedPractitioner) {
          query.eq("practitioner_id", state.selectedPractitioner.id);
        }

        const { data, error } = await query;

        if (error || !data) {
          setSlots(generateMockTimeSlots());
        } else {
          const allSlots = generateMockTimeSlots();
          const bookedTimes = new Set(data.map((r) => r.start_time.slice(0, 5)));

          const updatedSlots = allSlots.map((slot) => ({
            ...slot,
            available: !bookedTimes.has(slot.time),
          }));

          setSlots(updatedSlots);
        }
      } catch {
        setSlots(generateMockTimeSlots());
      } finally {
        setLoading(false);
      }
    }
    fetchTimeSlots();
  }, [state.selectedDate, state.selectedMenu, state.selectedPractitioner, isOmakase]);

  function handleSelectTime(time: string) {
    setTime(time);
    router.push("/booking/confirm");
  }

  if (!state.selectedMenu || !state.selectedDate) return null;

  // 午前 / 午後に分ける
  const morningSlots = slots.filter((s) => {
    const hour = parseInt(s.time.split(":")[0], 10);
    return hour < 12;
  });
  const afternoonSlots = slots.filter((s) => {
    const hour = parseInt(s.time.split(":")[0], 10);
    return hour >= 12;
  });

  return (
    <div className="flex flex-col flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* 戻るボタン */}
      <Link
        href="/booking/date"
        className="inline-flex items-center gap-1 text-lg text-blue-600 font-medium mb-4 hover:text-blue-800 transition-colors min-h-[48px]"
      >
        <ChevronLeft className="w-6 h-6" />
        日にち選択に戻る
      </Link>

      {/* ステップインジケータ */}
      <div className="mb-6">
        <StepIndicator currentStep={4} />
      </div>

      {/* 選択済み情報 */}
      <div className="mb-4 px-4 py-3 bg-blue-50 rounded-xl space-y-1">
        <p className="text-base text-blue-800">
          <span className="font-bold">メニュー：</span>
          {state.selectedMenu.name}
        </p>
        <p className="text-base text-blue-800">
          <span className="font-bold">施術者：</span>
          {isOmakase ? "おまかせ" : state.selectedPractitioner?.name}
        </p>
        <p className="text-base text-blue-800">
          <span className="font-bold">日にち：</span>
          {formattedDate}
        </p>
      </div>

      {/* 見出し */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        時間を選んでください
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        ご希望の時間をタップしてください
      </p>

      {/* ローディング */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-lg text-gray-600">空き時間を確認中...</span>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* 午前 */}
          {morningSlots.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">午前</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {morningSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && handleSelectTime(slot.time)}
                    disabled={!slot.available}
                    className={cn(
                      "flex flex-col items-center justify-center py-4 px-3 rounded-xl text-center transition-all min-h-[64px] min-w-[48px]",
                      slot.available
                        ? "bg-white border-2 border-green-300 text-gray-900 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-sm"
                        : "bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <span className="text-xl font-bold">{slot.time}</span>
                    <span
                      className={cn(
                        "text-base font-bold mt-1",
                        slot.available ? "text-green-600" : "text-red-400"
                      )}
                    >
                      {slot.available ? "\u25CB" : "\u00D7"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 午後 */}
          {afternoonSlots.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-700 mb-3">午後</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {afternoonSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && handleSelectTime(slot.time)}
                    disabled={!slot.available}
                    className={cn(
                      "flex flex-col items-center justify-center py-4 px-3 rounded-xl text-center transition-all min-h-[64px] min-w-[48px]",
                      slot.available
                        ? "bg-white border-2 border-green-300 text-gray-900 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-sm"
                        : "bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <span className="text-xl font-bold">{slot.time}</span>
                    <span
                      className={cn(
                        "text-base font-bold mt-1",
                        slot.available ? "text-green-600" : "text-red-400"
                      )}
                    >
                      {slot.available ? "\u25CB" : "\u00D7"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* スロットが全くない場合 */}
          {slots.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">
                この日は空きがありません
              </p>
              <p className="text-lg text-gray-400 mt-2">
                別の日をお選びください
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
