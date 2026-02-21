"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Search,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Trash2,
} from "lucide-react";
import { format, parse, isPast, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Reservation, Menu, Practitioner } from "@/types/database";

// ---------------------------------------------------------------------------
// 表示用の予約型
// ---------------------------------------------------------------------------
interface ReservationDisplay {
  reservation: Reservation;
  menu: Menu | null;
  practitioner: Practitioner | null;
}

// ---------------------------------------------------------------------------
// モック予約データ
// ---------------------------------------------------------------------------
function getMockReservations(): ReservationDisplay[] {
  return [
    {
      reservation: {
        id: "res-mock-1",
        patient_id: "p1",
        practitioner_id: "prac-1",
        menu_id: "menu-2",
        date: format(new Date(Date.now() + 3 * 86400000), "yyyy-MM-dd"),
        start_time: "10:00:00",
        end_time: "10:40:00",
        status: "reserved",
        created_at: "",
        updated_at: "",
      },
      menu: {
        id: "menu-2",
        name: "通常施術",
        description: null,
        duration_minutes: 40,
        price_estimate: 4000,
        icon: null,
        sort_order: 2,
        is_published: true,
      },
      practitioner: {
        id: "prac-1",
        name: "山田 太郎",
        photo_url: null,
        bio: null,
        specialties: null,
        is_active: true,
        created_at: "",
      },
    },
  ];
}

export default function ReservationsPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [reservations, setReservations] = useState<ReservationDisplay[]>([]);
  const [cancelTarget, setCancelTarget] = useState<ReservationDisplay | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // バリデーション
  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!phone.trim()) {
      newErrors.phone = "電話番号を入力してください";
    }

    if (!pin.trim()) {
      newErrors.pin = "暗証番号を入力してください";
    } else if (!/^\d{4}$/.test(pin)) {
      newErrors.pin = "暗証番号は4桁の数字で入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // 検索
  async function handleSearch() {
    if (!validate()) return;

    setLoading(true);
    setSearched(true);

    try {
      const { supabase } = await import("@/lib/supabase-browser");
      const cleanPhone = phone.replace(/[\s\-]/g, "");

      // 患者を検索
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("phone", cleanPhone)
        .eq("pin_code", pin)
        .single();

      if (patientError || !patient) {
        setReservations([]);
        setLoading(false);
        return;
      }

      // 予約一覧を取得
      const { data: reservationsData, error: resError } = await supabase
        .from("reservations")
        .select("*")
        .eq("patient_id", patient.id)
        .in("status", ["reserved"])
        .order("date", { ascending: true });

      if (resError || !reservationsData) {
        setReservations([]);
        setLoading(false);
        return;
      }

      // メニューと施術者情報を付与
      const displays: ReservationDisplay[] = [];

      for (const res of reservationsData) {
        const { data: menuData } = await supabase
          .from("menus")
          .select("*")
          .eq("id", res.menu_id)
          .single();

        const { data: pracData } = await supabase
          .from("practitioners")
          .select("*")
          .eq("id", res.practitioner_id)
          .single();

        displays.push({
          reservation: res,
          menu: menuData || null,
          practitioner: pracData || null,
        });
      }

      setReservations(displays);
    } catch {
      // Supabase接続失敗時はモックデータ
      setReservations(getMockReservations());
    } finally {
      setLoading(false);
    }
  }

  // キャンセル
  async function handleCancel() {
    if (!cancelTarget) return;

    setCancelling(true);

    try {
      const { supabase } = await import("@/lib/supabase-browser");

      await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", cancelTarget.reservation.id);

      // 一覧から除外
      setReservations((prev) =>
        prev.filter((r) => r.reservation.id !== cancelTarget.reservation.id)
      );
    } catch {
      // モック時は直接除外
      setReservations((prev) =>
        prev.filter((r) => r.reservation.id !== cancelTarget.reservation.id)
      );
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  }

  // 次回の予約 (一番近い未来の予約)
  const nextReservation = reservations.find((r) => {
    const dateStr = r.reservation.date;
    try {
      return !isPast(parseISO(dateStr + "T23:59:59"));
    } catch {
      return false;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          予約の確認
        </h1>
      </header>

      <div className="flex flex-col flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {/* 戻るボタン */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-lg text-blue-600 font-medium mb-6 hover:text-blue-800 transition-colors min-h-[48px]"
        >
          <ChevronLeft className="w-6 h-6" />
          トップに戻る
        </Link>

        {/* 検索フォーム */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            ご予約を検索する
          </h2>
          <p className="text-base text-gray-600 mb-5">
            ご予約時の電話番号と暗証番号を入力してください
          </p>

          <div className="space-y-5">
            {/* 電話番号 */}
            <div>
              <Label htmlFor="res-phone" className="text-lg font-bold text-gray-700">
                電話番号
              </Label>
              <Input
                id="res-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="090-1234-5678"
                className="mt-2 h-14 text-xl px-4 rounded-xl border-2"
                autoComplete="tel"
              />
              {errors.phone && (
                <p className="mt-1 text-base text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* 暗証番号 */}
            <div>
              <Label htmlFor="res-pin" className="text-lg font-bold text-gray-700">
                4桁の暗証番号
              </Label>
              <Input
                id="res-pin"
                type="tel"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="1234"
                className="mt-2 h-14 text-xl px-4 rounded-xl border-2 tracking-[0.5em] text-center max-w-[200px]"
                autoComplete="off"
              />
              {errors.pin && (
                <p className="mt-1 text-base text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.pin}
                </p>
              )}
            </div>
          </div>

          {/* 検索ボタン */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="mt-6 w-full min-h-[64px] py-4 px-8 text-xl font-bold text-white bg-blue-600 rounded-2xl shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                検索中...
              </>
            ) : (
              <>
                <Search className="w-6 h-6" />
                予約を検索する
              </>
            )}
          </button>
        </div>

        {/* 検索結果 */}
        {searched && !loading && (
          <>
            {reservations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl text-gray-500 mb-2">
                  予約が見つかりませんでした
                </p>
                <p className="text-base text-gray-400">
                  電話番号と暗証番号をお確かめください
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">
                  ご予約一覧（{reservations.length}件）
                </h2>

                {reservations.map((item) => {
                  const isNext = nextReservation?.reservation.id === item.reservation.id;
                  const dateObj = parse(
                    item.reservation.date,
                    "yyyy-MM-dd",
                    new Date()
                  );
                  const formattedDate = format(dateObj, "M月d日（E）", {
                    locale: ja,
                  });
                  const startTime = item.reservation.start_time.slice(0, 5);
                  const endTime = item.reservation.end_time.slice(0, 5);

                  return (
                    <div
                      key={item.reservation.id}
                      className={`bg-white rounded-2xl border-2 p-5 shadow-sm ${
                        isNext ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"
                      }`}
                    >
                      {isNext && (
                        <span className="inline-block mb-3 px-3 py-1 text-base font-bold text-blue-700 bg-blue-100 rounded-full">
                          次回のご予約
                        </span>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-lg">
                          <Calendar className="w-5 h-5 text-gray-500" />
                          <span className="font-bold text-gray-900">
                            {formattedDate}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-lg">
                          <Clock className="w-5 h-5 text-gray-500" />
                          <span className="font-bold text-gray-900">
                            {startTime} 〜 {endTime}
                          </span>
                        </div>

                        {item.practitioner && (
                          <div className="flex items-center gap-2 text-lg">
                            <User className="w-5 h-5 text-gray-500" />
                            <span className="text-gray-900">
                              {item.practitioner.name}
                            </span>
                          </div>
                        )}

                        {item.menu && (
                          <div className="text-lg text-gray-700">
                            {item.menu.name}
                          </div>
                        )}
                      </div>

                      <Separator className="my-4" />

                      {/* キャンセルボタン */}
                      <button
                        onClick={() => setCancelTarget(item)}
                        className="inline-flex items-center gap-2 py-3 px-5 text-base font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 active:bg-red-200 transition-colors focus:outline-none focus:ring-4 focus:ring-red-200 min-h-[48px]"
                      >
                        <Trash2 className="w-5 h-5" />
                        この予約をキャンセルする
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* キャンセル確認ダイアログ */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <DialogContent className="max-w-md mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              予約をキャンセルしますか？
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 mt-2">
              この操作は取り消せません。本当にキャンセルしてよろしいですか？
            </DialogDescription>
          </DialogHeader>

          {cancelTarget && (
            <div className="py-3 px-4 bg-gray-50 rounded-xl text-base">
              <p>
                <span className="font-bold">日時：</span>
                {format(
                  parse(cancelTarget.reservation.date, "yyyy-MM-dd", new Date()),
                  "M月d日（E）",
                  { locale: ja }
                )}{" "}
                {cancelTarget.reservation.start_time.slice(0, 5)}
              </p>
              {cancelTarget.menu && (
                <p>
                  <span className="font-bold">メニュー：</span>
                  {cancelTarget.menu.name}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col gap-3 sm:flex-col">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full min-h-[56px] py-4 px-6 text-lg font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors focus:outline-none focus:ring-4 focus:ring-red-300 disabled:bg-gray-400"
            >
              {cancelling ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  キャンセル中...
                </span>
              ) : (
                "キャンセルする"
              )}
            </button>
            <button
              onClick={() => setCancelTarget(null)}
              className="w-full min-h-[56px] py-4 px-6 text-lg font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-colors focus:outline-none focus:ring-4 focus:ring-gray-200"
            >
              戻る
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
