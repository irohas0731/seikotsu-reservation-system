"use client";

import { BookingProvider } from "@/lib/booking-store";

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BookingProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* ヘッダー */}
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-2xl font-bold text-center text-gray-900">
            ご予約
          </h1>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </BookingProvider>
  );
}
