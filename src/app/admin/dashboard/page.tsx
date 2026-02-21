"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  XCircle,
  Users,
} from "lucide-react";
import type { ReservationWithDetails, ReservationStatus } from "@/types/database";

// Mock data for development
const mockReservations: ReservationWithDetails[] = [
  {
    id: "1",
    patient_id: "p1",
    practitioner_id: "pr1",
    menu_id: "m1",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "09:00",
    end_time: "09:30",
    status: "reserved",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    patient: { id: "p1", name: "田中太郎", phone: "090-1234-5678", birth_date: "1985-03-15", pin_code: "1234", line_user_id: null, memo: null, created_at: new Date().toISOString() },
    practitioner: { id: "pr1", name: "山田先生", photo_url: null, bio: null, specialties: ["骨盤矯正"], is_active: true, created_at: new Date().toISOString() },
    menu: { id: "m1", name: "骨盤矯正", description: null, duration_minutes: 30, price_estimate: 5000, icon: null, sort_order: 1, is_published: true },
  },
  {
    id: "2",
    patient_id: "p2",
    practitioner_id: "pr1",
    menu_id: "m2",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "10:00",
    end_time: "10:30",
    status: "visited",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    patient: { id: "p2", name: "佐藤花子", phone: "090-2345-6789", birth_date: "1990-07-20", pin_code: "5678", line_user_id: null, memo: null, created_at: new Date().toISOString() },
    practitioner: { id: "pr1", name: "山田先生", photo_url: null, bio: null, specialties: ["骨盤矯正"], is_active: true, created_at: new Date().toISOString() },
    menu: { id: "m2", name: "全身調整", description: null, duration_minutes: 60, price_estimate: 8000, icon: null, sort_order: 2, is_published: true },
  },
  {
    id: "3",
    patient_id: "p3",
    practitioner_id: "pr2",
    menu_id: "m1",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "11:00",
    end_time: "11:30",
    status: "cancelled",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    patient: { id: "p3", name: "鈴木一郎", phone: "090-3456-7890", birth_date: "1978-11-05", pin_code: "9012", line_user_id: null, memo: null, created_at: new Date().toISOString() },
    practitioner: { id: "pr2", name: "鈴木先生", photo_url: null, bio: null, specialties: ["猫背矯正"], is_active: true, created_at: new Date().toISOString() },
    menu: { id: "m1", name: "骨盤矯正", description: null, duration_minutes: 30, price_estimate: 5000, icon: null, sort_order: 1, is_published: true },
  },
  {
    id: "4",
    patient_id: "p4",
    practitioner_id: "pr2",
    menu_id: "m3",
    date: format(new Date(), "yyyy-MM-dd"),
    start_time: "14:00",
    end_time: "14:30",
    status: "reserved",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    patient: { id: "p4", name: "高橋美咲", phone: "090-4567-8901", birth_date: "1995-01-12", pin_code: "3456", line_user_id: null, memo: null, created_at: new Date().toISOString() },
    practitioner: { id: "pr2", name: "鈴木先生", photo_url: null, bio: null, specialties: ["猫背矯正"], is_active: true, created_at: new Date().toISOString() },
    menu: { id: "m3", name: "猫背矯正", description: null, duration_minutes: 45, price_estimate: 6000, icon: null, sort_order: 3, is_published: true },
  },
];

const statusConfig: Record<ReservationStatus, { label: string; className: string }> = {
  reserved: { label: "予約済み", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  visited: { label: "来院済み", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  cancelled: { label: "キャンセル", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  no_show: { label: "無断キャンセル", className: "bg-red-200 text-red-900 hover:bg-red-200" },
};

export default function DashboardPage() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();

  const fetchReservations = useCallback(async () => {
    try {
      const dateStr = format(today, "yyyy-MM-dd");
      const res = await fetch(`/api/reservations?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setReservations(data.data || []);
      } else {
        // Fallback to mock data
        setReservations(mockReservations);
      }
    } catch {
      setReservations(mockReservations);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
      }
    } catch {
      // Fallback: update locally
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    }
  };

  const totalToday = reservations.filter((r) => r.status !== "cancelled").length;
  const completed = reservations.filter((r) => r.status === "visited").length;
  const remaining = reservations.filter((r) => r.status === "reserved").length;
  const cancelled = reservations.filter((r) => r.status === "cancelled" || r.status === "no_show").length;

  return (
    <div className="space-y-6">
      {/* Date Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">ダッシュボード</h2>
        <p className="text-muted-foreground flex items-center gap-2 mt-1">
          <CalendarDays className="h-4 w-4" />
          {format(today, "yyyy年M月d日 (EEEE)", { locale: ja })}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日の予約</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalToday}件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">来院済み</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completed}件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">残り</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{remaining}件</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">キャンセル</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{cancelled}件</div>
          </CardContent>
        </Card>
      </div>

      {/* Reservation List */}
      <Card>
        <CardHeader>
          <CardTitle>本日の予約一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">本日の予約はありません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>時間</TableHead>
                  <TableHead>患者名</TableHead>
                  <TableHead>施術者</TableHead>
                  <TableHead>メニュー</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((reservation) => {
                    const status = statusConfig[reservation.status];
                    return (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-mono">
                          {reservation.start_time} - {reservation.end_time}
                        </TableCell>
                        <TableCell className="font-medium">
                          {reservation.patient.name}
                        </TableCell>
                        <TableCell>{reservation.practitioner.name}</TableCell>
                        <TableCell>{reservation.menu.name}</TableCell>
                        <TableCell>
                          <Badge className={status.className}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {reservation.status === "reserved" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                  onClick={() => handleStatusChange(reservation.id, "visited")}
                                >
                                  来院
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                  onClick={() => handleStatusChange(reservation.id, "cancelled")}
                                >
                                  取消
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
