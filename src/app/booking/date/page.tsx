"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  format,
  addDays,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
  startOfDay,
  startOfMonth,
  endOfMonth,
  getDay,
  isSameDay,
  getDaysInMonth,
} from "date-fns";
import { ja } from "date-fns/locale";
import { useBooking } from "@/lib/booking-store";
import { StepIndicator } from "@/components/step-indicator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 空き状況の型
// ---------------------------------------------------------------------------
type Availability = "available" | "few" | "full" | "past" | "holiday" | "outside";

interface DayInfo {
  date: Date;
  dateStr: string;
  availability: Availability;
  dayOfWeek: number;
  isCurrentMonth: boolean;
}

// ---------------------------------------------------------------------------
// モック空き状況を生成
// ---------------------------------------------------------------------------
function generateMockAvailability(days: Date[]): Map<string, Availability> {
  const map = new Map<string, Availability>();
  const today = startOfDay(new Date());

  days.forEach((day) => {
    const key = format(day, "yyyy-MM-dd");
    if (isBefore(day, today) && !isSameDay(day, today)) {
      map.set(key, "past");
    } else {
      const dow = getDay(day);
      if (dow === 0) {
        map.set(key, "holiday");
      } else {
        const hash = day.getDate() % 5;
        if (hash === 0) map.set(key, "full");
        else if (hash === 1) map.set(key, "few");
        else map.set(key, "available");
      }
    }
  });

  return map;
}

// ---------------------------------------------------------------------------
// 空き状況バッジ
// ---------------------------------------------------------------------------
function AvailabilityBadge({ availability }: { availability: Availability }) {
  switch (availability) {
    case "available":
      return <span className="text-green-600 font-bold text-sm">◎</span>;
    case "few":
      return <span className="text-yellow-600 font-bold text-sm">△</span>;
    case "full":
      return <span className="text-red-500 font-bold text-sm">×</span>;
    case "holiday":
      return <span className="text-gray-400 font-bold text-sm">休</span>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 曜日の色
// ---------------------------------------------------------------------------
function getDayColor(dayOfWeek: number): string {
  if (dayOfWeek === 0) return "text-red-500";
  if (dayOfWeek === 6) return "text-blue-500";
  return "text-gray-900";
}

export default function DateSelectionPage() {
  const router = useRouter();
  const { state, setDate } = useBooking();
  const [loading, setLoading] = useState(true);
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, Availability>>(
    new Map()
  );
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  const today = useMemo(() => startOfDay(new Date()), []);
  const isOmakase = state.selectedPractitioner === null;

  // 予約可能範囲: 今日から90日先まで
  const maxDate = useMemo(() => addDays(today, 90), [today]);

  // メニュー未選択チェック
  useEffect(() => {
    if (!state.selectedMenu) {
      router.replace("/booking/menu");
    }
  }, [state.selectedMenu, router]);

  // 月の全日付を生成（前月の空白分 + 当月 + 末尾空白分）
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = getDaysInMonth(currentMonth);

    const days: DayInfo[] = [];

    // 月初の曜日分の空白
    const startDow = getDay(monthStart);
    for (let i = 0; i < startDow; i++) {
      const date = addDays(monthStart, -(startDow - i));
      days.push({
        date,
        dateStr: format(date, "yyyy-MM-dd"),
        availability: "outside",
        dayOfWeek: getDay(date),
        isCurrentMonth: false,
      });
    }

    // 当月の日付
    for (let i = 0; i < daysInMonth; i++) {
      const date = addDays(monthStart, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const isBeforeToday = isBefore(date, today) && !isSameDay(date, today);
      const isAfterMax = isAfter(date, maxDate);

      let availability: Availability;
      if (isBeforeToday || isAfterMax) {
        availability = "past";
      } else {
        availability = availabilityMap.get(dateStr) || "available";
      }

      days.push({
        date,
        dateStr,
        availability,
        dayOfWeek: getDay(date),
        isCurrentMonth: true,
      });
    }

    // 末尾の空白（7の倍数にする）
    const endDow = getDay(monthEnd);
    for (let i = 1; i <= 6 - endDow; i++) {
      const date = addDays(monthEnd, i);
      days.push({
        date,
        dateStr: format(date, "yyyy-MM-dd"),
        availability: "outside",
        dayOfWeek: getDay(date),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth, availabilityMap, today, maxDate]);

  // 前月/次月に移動できるか
  const canGoPrev = isAfter(startOfMonth(currentMonth), startOfMonth(today)) ||
    isSameDay(startOfMonth(currentMonth), startOfMonth(today)) === false
    ? isAfter(startOfMonth(currentMonth), startOfMonth(today))
    : false;
  const canGoNext = isBefore(startOfMonth(addMonths(currentMonth, 1)), startOfMonth(addDays(today, 90)));

  // 空き状況の取得（全範囲）
  useEffect(() => {
    async function fetchAvailability() {
      try {
        const { supabase } = await import("@/lib/supabase-browser");

        const startDate = format(today, "yyyy-MM-dd");
        const endDate = format(maxDate, "yyyy-MM-dd");

        const query = supabase
          .from("reservations")
          .select("date, practitioner_id, start_time")
          .gte("date", startDate)
          .lte("date", endDate)
          .eq("status", "reserved");

        const { data, error } = await query;

        if (error || !data) {
          const allDays = Array.from({ length: 90 }, (_, i) => addDays(today, i));
          setAvailabilityMap(generateMockAvailability(allDays));
        } else {
          const countByDate = new Map<string, number>();
          (data as Array<{ date: string }>).forEach((r) => {
            countByDate.set(r.date, (countByDate.get(r.date) || 0) + 1);
          });

          const map = new Map<string, Availability>();
          for (let i = 0; i < 90; i++) {
            const day = addDays(today, i);
            const key = format(day, "yyyy-MM-dd");
            if (getDay(day) === 0) {
              map.set(key, "holiday");
            } else {
              const count = countByDate.get(key) || 0;
              if (count >= 8) map.set(key, "full");
              else if (count >= 5) map.set(key, "few");
              else map.set(key, "available");
            }
          }
          setAvailabilityMap(map);
        }
      } catch {
        const allDays = Array.from({ length: 90 }, (_, i) => addDays(today, i));
        setAvailabilityMap(generateMockAvailability(allDays));
      } finally {
        setLoading(false);
      }
    }
    fetchAvailability();
  }, [today, maxDate]);

  function handleSelectDate(day: DayInfo) {
    if (
      !day.isCurrentMonth ||
      day.availability === "past" ||
      day.availability === "full" ||
      day.availability === "holiday" ||
      day.availability === "outside"
    ) {
      return;
    }
    setDate(day.dateStr);
    router.push("/booking/time");
  }

  if (!state.selectedMenu) return null;

  return (
    <div className="flex flex-col flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* 戻るボタン */}
      <Link
        href="/booking/practitioner"
        className="inline-flex items-center gap-1 text-lg text-blue-600 font-medium mb-4 hover:text-blue-800 transition-colors min-h-[48px]"
      >
        <ChevronLeft className="w-6 h-6" />
        施術者選択に戻る
      </Link>

      {/* ステップインジケータ */}
      <div className="mb-6">
        <StepIndicator currentStep={3} />
      </div>

      {/* 選択済み情報 */}
      {state.selectedMenu && (
        <div className="mb-4 px-4 py-3 bg-blue-50 rounded-xl space-y-1">
          <p className="text-base text-blue-800">
            <span className="font-bold">メニュー：</span>
            {state.selectedMenu.name}
          </p>
          <p className="text-base text-blue-800">
            <span className="font-bold">施術者：</span>
            {isOmakase ? "おまかせ" : state.selectedPractitioner?.name}
          </p>
        </div>
      )}

      {/* 見出し */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        日にちを選んでください
      </h2>
      <p className="text-lg text-gray-600 mb-4">
        ご希望の日をタップしてください
      </p>

      {/* 凡例 */}
      <div className="flex items-center gap-4 mb-4 text-base flex-wrap">
        <span className="inline-flex items-center gap-1">
          <span className="text-green-600 font-bold">◎</span> 空きあり
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-yellow-600 font-bold">△</span> 残りわずか
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-red-500 font-bold">×</span> 満員
        </span>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-lg text-gray-600">空き状況を確認中...</span>
        </div>
      )}

      {/* カレンダー */}
      {!loading && (
        <>
          {/* 月切り替えヘッダー */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-gray-200 px-2 py-2">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              disabled={!canGoPrev}
              className={cn(
                "inline-flex items-center gap-1 py-3 px-4 text-lg font-medium rounded-xl transition-colors min-h-[48px]",
                canGoPrev
                  ? "text-blue-600 hover:bg-blue-50 active:bg-blue-100"
                  : "text-gray-300 cursor-not-allowed"
              )}
              aria-label="前の月"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="hidden sm:inline">前の月</span>
            </button>

            {/* 現在の月表示 */}
            <h3 className="text-2xl font-bold text-gray-900">
              {format(currentMonth, "yyyy年M月", { locale: ja })}
            </h3>

            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              disabled={!canGoNext}
              className={cn(
                "inline-flex items-center gap-1 py-3 px-4 text-lg font-medium rounded-xl transition-colors min-h-[48px]",
                canGoNext
                  ? "text-blue-600 hover:bg-blue-50 active:bg-blue-100"
                  : "text-gray-300 cursor-not-allowed"
              )}
              aria-label="次の月"
            >
              <span className="hidden sm:inline">次の月</span>
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["日", "月", "火", "水", "木", "金", "土"].map((label, i) => (
              <div
                key={label}
                className={cn(
                  "text-center text-base font-bold py-2",
                  getDayColor(i)
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              // 当月以外は空白表示
              if (!day.isCurrentMonth) {
                return (
                  <div
                    key={`outside-${idx}`}
                    className="min-h-[60px]"
                  />
                );
              }

              const isDisabled =
                day.availability === "past" ||
                day.availability === "full" ||
                day.availability === "holiday" ||
                day.availability === "outside";

              return (
                <button
                  key={day.dateStr}
                  onClick={() => handleSelectDate(day)}
                  disabled={isDisabled}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all min-h-[60px]",
                    !isDisabled &&
                      "hover:bg-blue-50 active:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400",
                    isDisabled && "opacity-40 cursor-not-allowed",
                    day.availability === "available" &&
                      "bg-white border border-green-200",
                    day.availability === "few" &&
                      "bg-yellow-50 border border-yellow-200",
                    day.availability === "full" &&
                      "bg-gray-100 border border-gray-200",
                    day.availability === "holiday" &&
                      "bg-gray-50 border border-gray-200",
                    day.availability === "past" && "bg-gray-50"
                  )}
                  aria-label={`${format(day.date, "M月d日(E)", { locale: ja })} ${
                    day.availability === "available"
                      ? "空きあり"
                      : day.availability === "few"
                        ? "残りわずか"
                        : day.availability === "full"
                          ? "満員"
                          : day.availability === "holiday"
                            ? "休診"
                            : "過去"
                  }`}
                >
                  <span
                    className={cn(
                      "text-lg font-bold leading-tight",
                      getDayColor(day.dayOfWeek),
                      isDisabled && "text-gray-400"
                    )}
                  >
                    {format(day.date, "d")}
                  </span>
                  <AvailabilityBadge availability={day.availability} />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
