"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, Shuffle } from "lucide-react";
import { useBooking } from "@/lib/booking-store";
import { StepIndicator } from "@/components/step-indicator";
import type { Practitioner } from "@/types/database";

// ---------------------------------------------------------------------------
// モックデータ
// ---------------------------------------------------------------------------
const MOCK_PRACTITIONERS: Practitioner[] = [
  {
    id: "prac-1",
    name: "山田 太郎",
    photo_url: null,
    bio: "院長。20年の経験で皆さまの健康をサポートします。",
    specialties: ["骨盤矯正", "腰痛"],
    is_active: true,
    created_at: "",
  },
  {
    id: "prac-2",
    name: "佐藤 花子",
    photo_url: null,
    bio: "女性施術者。ソフトな施術が得意です。",
    specialties: ["肩こり", "首こり", "ヘッドケア"],
    is_active: true,
    created_at: "",
  },
  {
    id: "prac-3",
    name: "鈴木 一郎",
    photo_url: null,
    bio: "スポーツ外傷を中心に対応。アスリートの方も多数ご来院。",
    specialties: ["スポーツ外傷", "骨盤矯正"],
    is_active: true,
    created_at: "",
  },
];

// ---------------------------------------------------------------------------
// 名前の頭文字を取得
// ---------------------------------------------------------------------------
function getInitial(name: string): string {
  return name.charAt(0);
}

// ---------------------------------------------------------------------------
// 名前からカラーを決定 (パステル系)
// ---------------------------------------------------------------------------
function getColor(name: string): string {
  const colors = [
    "bg-blue-200 text-blue-800",
    "bg-green-200 text-green-800",
    "bg-purple-200 text-purple-800",
    "bg-orange-200 text-orange-800",
    "bg-pink-200 text-pink-800",
    "bg-teal-200 text-teal-800",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function PractitionerSelectionPage() {
  const router = useRouter();
  const { state, setPractitioner } = useBooking();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);

  // メニューが未選択なら Step 1 に戻す
  useEffect(() => {
    if (!state.selectedMenu) {
      router.replace("/booking/menu");
    }
  }, [state.selectedMenu, router]);

  useEffect(() => {
    async function fetchPractitioners() {
      try {
        const { supabase } = await import("@/lib/supabase-browser");

        // メニューに対応する施術者を取得
        if (state.selectedMenu) {
          const { data: pmData } = await supabase
            .from("practitioner_menus")
            .select("practitioner_id")
            .eq("menu_id", state.selectedMenu.id);

          if (pmData && pmData.length > 0) {
            const practitionerIds = pmData.map((pm) => pm.practitioner_id);
            const { data, error } = await supabase
              .from("practitioners")
              .select("*")
              .eq("is_active", true)
              .in("id", practitionerIds);

            if (!error && data && data.length > 0) {
              setPractitioners(data);
              setLoading(false);
              return;
            }
          }
        }

        // フォールバック: 全アクティブ施術者
        const { data, error } = await supabase
          .from("practitioners")
          .select("*")
          .eq("is_active", true);

        if (!error && data && data.length > 0) {
          setPractitioners(data);
        } else {
          setPractitioners(MOCK_PRACTITIONERS);
        }
      } catch {
        setPractitioners(MOCK_PRACTITIONERS);
      } finally {
        setLoading(false);
      }
    }
    fetchPractitioners();
  }, [state.selectedMenu]);

  function handleSelect(practitioner: Practitioner | null) {
    setPractitioner(practitioner);
    router.push("/booking/date");
  }

  if (!state.selectedMenu) return null;

  return (
    <div className="flex flex-col flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* 戻るボタン */}
      <Link
        href="/booking/menu"
        className="inline-flex items-center gap-1 text-lg text-blue-600 font-medium mb-4 hover:text-blue-800 transition-colors min-h-[48px]"
      >
        <ChevronLeft className="w-6 h-6" />
        メニュー選択に戻る
      </Link>

      {/* ステップインジケータ */}
      <div className="mb-6">
        <StepIndicator currentStep={2} />
      </div>

      {/* 選択済みメニュー表示 */}
      <div className="mb-4 px-4 py-3 bg-blue-50 rounded-xl">
        <p className="text-base text-blue-800">
          <span className="font-bold">選択中のメニュー：</span>
          {state.selectedMenu.name}
        </p>
      </div>

      {/* 見出し */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        施術者を選んでください
      </h2>
      <p className="text-lg text-gray-600 mb-6">
        ご希望の施術者をお選びください
      </p>

      {/* ローディング */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-lg text-gray-600">読み込み中...</span>
        </div>
      )}

      {/* 施術者カード一覧 */}
      {!loading && (
        <div className="flex flex-col gap-4">
          {/* おまかせオプション */}
          <button
            onClick={() => handleSelect(null)}
            className="flex items-center gap-4 w-full min-h-[100px] p-5 bg-white border-2 border-gray-200 rounded-2xl shadow-sm text-left hover:border-blue-500 hover:shadow-md active:bg-blue-50 transition-all focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-700 shrink-0">
              <Shuffle className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">おまかせ</h3>
              <p className="mt-1 text-base text-gray-600">
                空いている施術者におまかせします
              </p>
            </div>
            <div className="flex items-center justify-center w-8 shrink-0 text-gray-400 self-center">
              <ChevronLeft className="w-6 h-6 rotate-180" />
            </div>
          </button>

          {/* 各施術者 */}
          {practitioners.map((practitioner) => (
            <button
              key={practitioner.id}
              onClick={() => handleSelect(practitioner)}
              className="flex items-center gap-4 w-full min-h-[100px] p-5 bg-white border-2 border-gray-200 rounded-2xl shadow-sm text-left hover:border-blue-500 hover:shadow-md active:bg-blue-50 transition-all focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              {/* 写真プレースホルダー */}
              <div
                className={`flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold shrink-0 ${getColor(practitioner.name)}`}
              >
                {getInitial(practitioner.name)}
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900">
                  {practitioner.name}
                </h3>
                {practitioner.bio && (
                  <p className="mt-1 text-base text-gray-600 line-clamp-2">
                    {practitioner.bio}
                  </p>
                )}
                {practitioner.specialties && practitioner.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {practitioner.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="inline-block px-2 py-0.5 text-sm bg-gray-100 text-gray-700 rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 矢印 */}
              <div className="flex items-center justify-center w-8 shrink-0 text-gray-400 self-center">
                <ChevronLeft className="w-6 h-6 rotate-180" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
