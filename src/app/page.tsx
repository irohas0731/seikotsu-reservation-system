"use client";

import Link from "next/link";
import { CalendarPlus, Search } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-b from-blue-50 to-white">
      {/* 院名 */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          やまだ整骨院
        </h1>
        <p className="mt-3 text-xl text-gray-600">
          オンライン予約
        </p>
      </div>

      {/* メインボタン */}
      <div className="flex flex-col gap-6 w-full max-w-sm">
        {/* 予約するボタン */}
        <Link
          href="/booking/menu"
          className="flex items-center justify-center gap-4 w-full min-w-[200px] min-h-[80px] py-6 px-8 text-xl font-bold text-white bg-blue-600 rounded-2xl shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
          style={{ minHeight: "80px", minWidth: "200px" }}
        >
          <CalendarPlus className="w-8 h-8 shrink-0" aria-hidden="true" />
          <span>予約する</span>
        </Link>

        {/* 予約を確認するボタン */}
        <Link
          href="/reservations"
          className="flex items-center justify-center gap-4 w-full min-w-[200px] min-h-[80px] py-6 px-8 text-xl font-bold text-blue-700 bg-white border-2 border-blue-600 rounded-2xl shadow-lg hover:bg-blue-50 active:bg-blue-100 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300"
          style={{ minHeight: "80px", minWidth: "200px" }}
        >
          <Search className="w-8 h-8 shrink-0" aria-hidden="true" />
          <span>予約を確認する</span>
        </Link>
      </div>

      {/* フッター */}
      <p className="mt-16 text-base text-gray-400">
        お電話でもご予約いただけます
      </p>
      <a
        href="tel:0312345678"
        className="mt-2 text-lg font-semibold text-blue-600 underline"
      >
        03-1234-5678
      </a>
    </div>
  );
}
