"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, addDays, startOfWeek, parse } from "date-fns";
import { ja } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import type {
  ReservationWithDetails,
  Practitioner,
  ReservationStatus,
} from "@/types/database";

const statusConfig: Record<ReservationStatus, { label: string; className: string }> = {
  reserved: { label: "予約済み", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  visited: { label: "来院済み", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  cancelled: { label: "キャンセル", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  no_show: { label: "無断キャンセル", className: "bg-red-200 text-red-900 hover:bg-red-200" },
};

// Generate time slots from 9:00 to 20:00 in 30-min intervals
const timeSlots: string[] = [];
for (let h = 9; h < 20; h++) {
  timeSlots.push(`${h.toString().padStart(2, "0")}:00`);
  timeSlots.push(`${h.toString().padStart(2, "0")}:30`);
}

const mockPractitioners: Practitioner[] = [
  { id: "pr1", name: "山田先生", photo_url: null, bio: null, specialties: ["骨盤矯正"], is_active: true, created_at: new Date().toISOString() },
  { id: "pr2", name: "鈴木先生", photo_url: null, bio: null, specialties: ["猫背矯正"], is_active: true, created_at: new Date().toISOString() },
  { id: "pr3", name: "佐藤先生", photo_url: null, bio: null, specialties: ["全身調整"], is_active: true, created_at: new Date().toISOString() },
];

const today = new Date();
const todayStr = format(today, "yyyy-MM-dd");

const mockReservations: ReservationWithDetails[] = [
  {
    id: "1", patient_id: "p1", practitioner_id: "pr1", menu_id: "m1",
    date: todayStr, start_time: "09:00", end_time: "09:30", status: "reserved",
    created_at: today.toISOString(), updated_at: today.toISOString(),
    patient: { id: "p1", name: "田中太郎", phone: "090-1234-5678", birth_date: null, pin_code: "1234", line_user_id: null, memo: null, created_at: today.toISOString() },
    practitioner: mockPractitioners[0],
    menu: { id: "m1", name: "骨盤矯正", description: null, duration_minutes: 30, price_estimate: 5000, icon: null, sort_order: 1, is_published: true },
  },
  {
    id: "2", patient_id: "p2", practitioner_id: "pr1", menu_id: "m2",
    date: todayStr, start_time: "10:00", end_time: "11:00", status: "reserved",
    created_at: today.toISOString(), updated_at: today.toISOString(),
    patient: { id: "p2", name: "佐藤花子", phone: "090-2345-6789", birth_date: null, pin_code: "5678", line_user_id: null, memo: null, created_at: today.toISOString() },
    practitioner: mockPractitioners[0],
    menu: { id: "m2", name: "全身調整", description: null, duration_minutes: 60, price_estimate: 8000, icon: null, sort_order: 2, is_published: true },
  },
  {
    id: "3", patient_id: "p3", practitioner_id: "pr2", menu_id: "m3",
    date: todayStr, start_time: "11:00", end_time: "11:45", status: "visited",
    created_at: today.toISOString(), updated_at: today.toISOString(),
    patient: { id: "p3", name: "鈴木一郎", phone: "090-3456-7890", birth_date: null, pin_code: "9012", line_user_id: null, memo: null, created_at: today.toISOString() },
    practitioner: mockPractitioners[1],
    menu: { id: "m3", name: "猫背矯正", description: null, duration_minutes: 45, price_estimate: 6000, icon: null, sort_order: 3, is_published: true },
  },
  {
    id: "4", patient_id: "p4", practitioner_id: "pr3", menu_id: "m1",
    date: todayStr, start_time: "14:00", end_time: "14:30", status: "reserved",
    created_at: today.toISOString(), updated_at: today.toISOString(),
    patient: { id: "p4", name: "高橋美咲", phone: "090-4567-8901", birth_date: null, pin_code: "3456", line_user_id: null, memo: null, created_at: today.toISOString() },
    practitioner: mockPractitioners[2],
    menu: { id: "m1", name: "骨盤矯正", description: null, duration_minutes: 30, price_estimate: 5000, icon: null, sort_order: 1, is_published: true },
  },
];

type ViewMode = "day" | "week";

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      let dateFrom = dateStr;
      let dateTo = dateStr;

      if (viewMode === "week") {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        dateFrom = format(weekStart, "yyyy-MM-dd");
        dateTo = format(addDays(weekStart, 6), "yyyy-MM-dd");
      }

      const [resPractitioners, resReservations] = await Promise.all([
        fetch("/api/practitioners"),
        fetch(`/api/reservations?date_from=${dateFrom}&date_to=${dateTo}`),
      ]);

      if (resPractitioners.ok) {
        const data = await resPractitioners.json();
        setPractitioners((data.data || []).filter((p: Practitioner) => p.is_active));
      } else {
        setPractitioners(mockPractitioners);
      }

      if (resReservations.ok) {
        const data = await resReservations.json();
        setReservations(data.data || []);
      } else {
        setReservations(mockReservations);
      }
    } catch {
      setPractitioners(mockPractitioners);
      setReservations(mockReservations);
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateDate = (direction: number) => {
    if (viewMode === "day") {
      setCurrentDate((prev) => addDays(prev, direction));
    } else {
      setCurrentDate((prev) => addDays(prev, direction * 7));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const openReservationDetail = (reservation: ReservationWithDetails) => {
    setSelectedReservation(reservation);
    setDetailOpen(true);
  };

  // Calculate how many 30-min slots a reservation spans
  const getSlotSpan = (startTime: string, endTime: string): number => {
    const start = parse(startTime, "HH:mm", new Date());
    const end = parse(endTime, "HH:mm", new Date());
    const diffMs = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffMs / (30 * 60 * 1000)));
  };

  const getReservationForSlot = (
    practitionerId: string,
    date: string,
    time: string
  ): ReservationWithDetails | null => {
    return (
      reservations.find(
        (r) =>
          r.practitioner_id === practitionerId &&
          r.date === date &&
          r.start_time === time &&
          r.status !== "cancelled"
      ) || null
    );
  };

  const isSlotOccupied = (
    practitionerId: string,
    date: string,
    time: string
  ): boolean => {
    const slotTime = parse(time, "HH:mm", new Date());
    return reservations.some((r) => {
      if (r.practitioner_id !== practitionerId || r.date !== date || r.status === "cancelled") return false;
      const rStart = parse(r.start_time, "HH:mm", new Date());
      const rEnd = parse(r.end_time, "HH:mm", new Date());
      return slotTime >= rStart && slotTime < rEnd && r.start_time !== time;
    });
  };

  const statusBgColor: Record<ReservationStatus, string> = {
    reserved: "bg-blue-50 border-blue-300 text-blue-900",
    visited: "bg-green-50 border-green-300 text-green-900",
    cancelled: "bg-red-50 border-red-300 text-red-900",
    no_show: "bg-red-100 border-red-400 text-red-900",
  };

  // Day view
  const renderDayView = () => {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="border p-2 bg-muted w-20 text-sm">時間</th>
              {practitioners.map((p) => (
                <th key={p.id} className="border p-2 bg-muted text-sm font-medium">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time) => (
              <tr key={time}>
                <td className="border p-2 text-xs text-muted-foreground font-mono text-center">
                  {time}
                </td>
                {practitioners.map((p) => {
                  const reservation = getReservationForSlot(p.id, dateStr, time);
                  const occupied = isSlotOccupied(p.id, dateStr, time);

                  if (occupied) return null; // Skip - already rendered by rowSpan

                  if (reservation) {
                    const span = getSlotSpan(reservation.start_time, reservation.end_time);
                    return (
                      <td
                        key={p.id}
                        rowSpan={span}
                        className={`border p-1 cursor-pointer hover:opacity-80 transition-opacity ${statusBgColor[reservation.status]}`}
                        onClick={() => openReservationDetail(reservation)}
                      >
                        <div className="text-xs font-medium truncate">{reservation.patient.name}</div>
                        <div className="text-xs truncate text-muted-foreground">{reservation.menu.name}</div>
                      </td>
                    );
                  }

                  return <td key={p.id} className="border p-1 hover:bg-muted/50 cursor-pointer" />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="border p-2 bg-muted w-20 text-sm">時間</th>
              {days.map((day) => (
                <th key={day.toISOString()} className="border p-2 bg-muted text-sm font-medium">
                  <div>{format(day, "M/d")}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(day, "EEEE", { locale: ja })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time) => (
              <tr key={time}>
                <td className="border p-1 text-xs text-muted-foreground font-mono text-center">
                  {time}
                </td>
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayReservations = reservations.filter(
                    (r) => r.date === dateStr && r.start_time === time && r.status !== "cancelled"
                  );

                  return (
                    <td key={dateStr} className="border p-1 align-top">
                      {dayReservations.map((r) => (
                        <div
                          key={r.id}
                          className={`text-xs p-1 rounded mb-1 cursor-pointer hover:opacity-80 ${statusBgColor[r.status]}`}
                          onClick={() => openReservationDetail(r)}
                        >
                          <div className="font-medium truncate">{r.patient.name}</div>
                          <div className="truncate text-muted-foreground">{r.practitioner.name}</div>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          カレンダー
        </h2>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day">日表示</TabsTrigger>
              <TabsTrigger value="week">週表示</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-lg font-semibold min-w-[200px] text-center">
          {viewMode === "day"
            ? format(currentDate, "yyyy年M月d日 (EEEE)", { locale: ja })
            : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "M/d")} - ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), "M/d")}`}
        </div>
        <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToToday}>
          今日
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : viewMode === "day" ? (
            renderDayView()
          ) : (
            renderWeekView()
          )}
        </CardContent>
      </Card>

      {/* Reservation Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約詳細</DialogTitle>
            <DialogDescription className="sr-only">予約の詳細情報</DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">日付</div>
                <div>{selectedReservation.date}</div>
                <div className="text-muted-foreground">時間</div>
                <div>{selectedReservation.start_time} - {selectedReservation.end_time}</div>
                <div className="text-muted-foreground">患者名</div>
                <div className="font-medium">{selectedReservation.patient.name}</div>
                <div className="text-muted-foreground">電話番号</div>
                <div>{selectedReservation.patient.phone}</div>
                <div className="text-muted-foreground">施術者</div>
                <div>{selectedReservation.practitioner.name}</div>
                <div className="text-muted-foreground">メニュー</div>
                <div>{selectedReservation.menu.name}</div>
                <div className="text-muted-foreground">施術時間</div>
                <div>{selectedReservation.menu.duration_minutes}分</div>
                <div className="text-muted-foreground">料金目安</div>
                <div>{selectedReservation.menu.price_estimate?.toLocaleString()}円</div>
                <div className="text-muted-foreground">ステータス</div>
                <div>
                  <Badge className={statusConfig[selectedReservation.status].className}>
                    {statusConfig[selectedReservation.status].label}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>閉じる</Button>
            <Button
              onClick={() => {
                setDetailOpen(false);
                window.location.href = `/admin/reservations`;
              }}
            >
              予約管理へ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
