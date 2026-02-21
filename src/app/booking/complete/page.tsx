"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Home, MessageCircle } from "lucide-react";
import { format, parse, addMinutes } from "date-fns";
import { ja } from "date-fns/locale";
import { useBooking } from "@/lib/booking-store";
import { Separator } from "@/components/ui/separator";

export default function CompletePage() {
  const router = useRouter();
  const { state, reset } = useBooking();

  const isOmakase = state.selectedPractitioner === null;

  // 予約情報がない場合はトップへ
  useEffect(() => {
    if (!state.selectedMenu || !state.selectedDate || !state.selectedTime) {
      router.replace("/");
    }
  }, [state.selectedMenu, state.selectedDate, state.selectedTime, router]);

  // 10秒後に自動的にトップへ
  useEffect(() => {
    const timer = setTimeout(() => {
      reset();
      router.push("/");
    }, 10000);
    return () => clearTimeout(timer);
  }, [router, reset]);

  // フォーマット済み日時
  const formattedDate = useMemo(() => {
    if (!state.selectedDate) return "";
    const dateObj = parse(state.selectedDate, "yyyy-MM-dd", new Date());
    return format(dateObj, "yyyy年M月d日（E）", { locale: ja });
  }, [state.selectedDate]);

  const formattedEndTime = useMemo(() => {
    if (!state.selectedTime || !state.selectedMenu) return "";
    const [h, m] = state.selectedTime.split(":").map(Number);
    const startDate = new Date(2000, 0, 1, h, m);
    const endDate = addMinutes(startDate, state.selectedMenu.duration_minutes);
    return format(endDate, "HH:mm");
  }, [state.selectedTime, state.selectedMenu]);

  if (!state.selectedMenu || !state.selectedDate || !state.selectedTime) return null;

  return (
    <div className="flex flex-col items-center flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
      {/* 成功アイコン */}
      <div className="flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6">
        <CheckCircle className="w-16 h-16 text-green-600" />
      </div>

      {/* メッセージ */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
        予約できました！
      </h1>
      <p className="text-lg text-gray-600 text-center mb-8">
        ご来院をお待ちしております
      </p>

      {/* 予約内容 */}
      <div className="w-full bg-white rounded-2xl border-2 border-gray-200 p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">ご予約内容</h2>

        <div className="space-y-3">
          <div>
            <span className="text-base text-gray-500 block">メニュー</span>
            <span className="text-xl font-bold text-gray-900">
              {state.selectedMenu.name}
            </span>
          </div>

          <Separator />

          <div>
            <span className="text-base text-gray-500 block">施術者</span>
            <span className="text-xl font-bold text-gray-900">
              {isOmakase ? "おまかせ" : state.selectedPractitioner?.name}
            </span>
          </div>

          <Separator />

          <div>
            <span className="text-base text-gray-500 block">日時</span>
            <span className="text-xl font-bold text-gray-900">
              {formattedDate}
            </span>
            <span className="text-xl font-bold text-gray-900 ml-2">
              {state.selectedTime} 〜 {formattedEndTime}
            </span>
          </div>

          <Separator />

          <div>
            <span className="text-base text-gray-500 block">お名前</span>
            <span className="text-xl font-bold text-gray-900">
              {state.patientInfo?.name || "---"}
            </span>
          </div>
        </div>
      </div>

      {/* LINE通知ボタン（プレースホルダー） */}
      <button
        onClick={() => {
          alert("LINE通知機能は現在準備中です");
        }}
        className="w-full min-h-[64px] py-4 px-8 text-xl font-bold text-white bg-green-500 rounded-2xl shadow-lg hover:bg-green-600 active:bg-green-700 transition-colors focus:outline-none focus:ring-4 focus:ring-green-300 mb-4 flex items-center justify-center gap-3"
      >
        <MessageCircle className="w-7 h-7" />
        LINE通知を受け取る
      </button>

      {/* トップに戻るボタン */}
      <Link
        href="/"
        onClick={() => reset()}
        className="w-full min-h-[64px] py-4 px-8 text-xl font-bold text-blue-700 bg-white border-2 border-blue-600 rounded-2xl shadow-lg hover:bg-blue-50 active:bg-blue-100 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center gap-3"
      >
        <Home className="w-7 h-7" />
        トップに戻る
      </Link>

      {/* 自動遷移メッセージ */}
      <p className="mt-6 text-base text-gray-400 text-center">
        10秒後に自動でトップページに戻ります
      </p>
    </div>
  );
}
