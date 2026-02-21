"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Banknote, Loader2, ChevronLeft } from "lucide-react";
import { useBooking } from "@/lib/booking-store";
import { StepIndicator } from "@/components/step-indicator";
import type { Menu } from "@/types/database";
import Link from "next/link";

// ---------------------------------------------------------------------------
// モックデータ (Supabase に接続できない場合のフォールバック)
// ---------------------------------------------------------------------------
const MOCK_MENUS: Menu[] = [
  {
    id: "menu-1",
    name: "初回カウンセリング＋施術",
    description: "初めての方はこちら。お体の状態をしっかり確認します。",
    duration_minutes: 60,
    price_estimate: 5000,
    icon: "stethoscope",
    sort_order: 1,
    is_published: true,
  },
  {
    id: "menu-2",
    name: "通常施術",
    description: "2回目以降の方の通常メニューです。",
    duration_minutes: 40,
    price_estimate: 4000,
    icon: "hand",
    sort_order: 2,
    is_published: true,
  },
  {
    id: "menu-3",
    name: "骨盤矯正",
    description: "骨盤のゆがみを整え、姿勢を改善します。",
    duration_minutes: 50,
    price_estimate: 5500,
    icon: "bone",
    sort_order: 3,
    is_published: true,
  },
  {
    id: "menu-4",
    name: "肩こり・首こり集中ケア",
    description: "デスクワークなどによる肩・首のつらさを集中的にほぐします。",
    duration_minutes: 30,
    price_estimate: 3500,
    icon: "zap",
    sort_order: 4,
    is_published: true,
  },
  {
    id: "menu-5",
    name: "腰痛ケア",
    description: "腰の痛みやだるさにお悩みの方向けの施術です。",
    duration_minutes: 40,
    price_estimate: 4500,
    icon: "activity",
    sort_order: 5,
    is_published: true,
  },
];

// ---------------------------------------------------------------------------
// アイコンマッピング (icon文字列 -> 表示用絵文字)
// ---------------------------------------------------------------------------
function getMenuEmoji(icon: string | null): string {
  switch (icon) {
    case "stethoscope":
      return "\u{1FA7A}";
    case "hand":
      return "\u{1F932}";
    case "bone":
      return "\u{1F9B4}";
    case "zap":
      return "\u26A1";
    case "activity":
      return "\u{1F4AA}";
    default:
      return "\u270B";
  }
}

export default function MenuSelectionPage() {
  const router = useRouter();
  const { setMenu } = useBooking();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMenus() {
      try {
        const { supabase } = await import("@/lib/supabase-browser");
        const { data, error } = await supabase
          .from("menus")
          .select("*")
          .eq("is_published", true)
          .order("sort_order", { ascending: true });

        if (error || !data || data.length === 0) {
          setMenus(MOCK_MENUS);
        } else {
          setMenus(data);
        }
      } catch {
        setMenus(MOCK_MENUS);
      } finally {
        setLoading(false);
      }
    }
    fetchMenus();
  }, []);

  function handleSelect(menu: Menu) {
    setMenu(menu);
    router.push("/booking/practitioner");
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* 戻るボタン */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-lg text-blue-600 font-medium mb-4 hover:text-blue-800 transition-colors min-h-[48px]"
      >
        <ChevronLeft className="w-6 h-6" />
        トップに戻る
      </Link>

      {/* ステップインジケータ */}
      <div className="mb-6">
        <StepIndicator currentStep={1} />
      </div>

      {/* 見出し */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        メニューを選んでください
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        ご希望の施術内容をお選びください
      </p>

      {/* ローディング */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-lg text-gray-600">読み込み中...</span>
        </div>
      )}

      {/* メニューカード一覧 */}
      {!loading && (
        <div className="flex flex-col gap-4">
          {menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => handleSelect(menu)}
              className="flex items-start gap-4 w-full min-h-[100px] p-5 bg-white border-2 border-gray-200 rounded-2xl shadow-sm text-left hover:border-blue-500 hover:shadow-md active:bg-blue-50 transition-all focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              {/* アイコン */}
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 text-3xl shrink-0">
                {getMenuEmoji(menu.icon)}
              </div>

              {/* テキスト情報 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900">
                  {menu.name}
                </h3>
                {menu.description && (
                  <p className="mt-1 text-base text-gray-600 line-clamp-2">
                    {menu.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <span className="inline-flex items-center gap-1 text-base text-gray-500">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    {menu.duration_minutes}分
                  </span>
                  {menu.price_estimate != null && (
                    <span className="inline-flex items-center gap-1 text-base text-gray-500">
                      <Banknote className="w-4 h-4" aria-hidden="true" />
                      {menu.price_estimate.toLocaleString()}円（税込目安）
                    </span>
                  )}
                </div>
              </div>

              {/* 矢印 */}
              <div className="flex items-center justify-center w-8 h-full shrink-0 text-gray-400 self-center">
                <ChevronLeft className="w-6 h-6 rotate-180" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
