"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, subDays, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Filter, Eye, Edit, XCircle } from "lucide-react";
import type {
  ReservationWithDetails,
  ReservationStatus,
  Practitioner,
} from "@/types/database";

const statusConfig: Record<ReservationStatus, { label: string; className: string }> = {
  reserved: { label: "予約済み", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  visited: { label: "来院済み", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  cancelled: { label: "キャンセル", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  no_show: { label: "無断キャンセル", className: "bg-red-200 text-red-900 hover:bg-red-200" },
};

const mockPractitioners: Practitioner[] = [
  { id: "pr1", name: "山田先生", photo_url: null, bio: null, specialties: ["骨盤矯正"], is_active: true, created_at: new Date().toISOString() },
  { id: "pr2", name: "鈴木先生", photo_url: null, bio: null, specialties: ["猫背矯正"], is_active: true, created_at: new Date().toISOString() },
];

const mockReservations: ReservationWithDetails[] = [
  {
    id: "1", patient_id: "p1", practitioner_id: "pr1", menu_id: "m1",
    date: format(new Date(), "yyyy-MM-dd"), start_time: "09:00", end_time: "09:30", status: "reserved",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    patient: { id: "p1", name: "田中太郎", phone: "090-1234-5678", birth_date: "1985-03-15", pin_code: "1234", line_user_id: null, memo: null, created_at: new Date().toISOString() },
    practitioner: { id: "pr1", name: "山田先生", photo_url: null, bio: null, specialties: ["骨盤矯正"], is_active: true, created_at: new Date().toISOString() },
    menu: { id: "m1", name: "骨盤矯正", description: null, duration_minutes: 30, price_estimate: 5000, icon: null, sort_order: 1, is_published: true },
  },
  {
    id: "2", patient_id: "p2", practitioner_id: "pr1", menu_id: "m2",
    date: format(new Date(), "yyyy-MM-dd"), start_time: "10:00", end_time: "11:00", status: "visited",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    patient: { id: "p2", name: "佐藤花子", phone: "090-2345-6789", birth_date: "1990-07-20", pin_code: "5678", line_user_id: null, memo: null, created_at: new Date().toISOString() },
    practitioner: { id: "pr1", name: "山田先生", photo_url: null, bio: null, specialties: ["骨盤矯正"], is_active: true, created_at: new Date().toISOString() },
    menu: { id: "m2", name: "全身調整", description: null, duration_minutes: 60, price_estimate: 8000, icon: null, sort_order: 2, is_published: true },
  },
  {
    id: "3", patient_id: "p3", practitioner_id: "pr2", menu_id: "m1",
    date: format(subDays(new Date(), 1), "yyyy-MM-dd"), start_time: "14:00", end_time: "14:30", status: "cancelled",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    patient: { id: "p3", name: "鈴木一郎", phone: "090-3456-7890", birth_date: "1978-11-05", pin_code: "9012", line_user_id: null, memo: null, created_at: new Date().toISOString() },
    practitioner: { id: "pr2", name: "鈴木先生", photo_url: null, bio: null, specialties: ["猫背矯正"], is_active: true, created_at: new Date().toISOString() },
    menu: { id: "m1", name: "骨盤矯正", description: null, duration_minutes: 30, price_estimate: 5000, icon: null, sort_order: 1, is_published: true },
  },
];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [filterPractitioner, setFilterPractitioner] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<ReservationStatus>("reserved");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resReservations, resPractitioners] = await Promise.all([
        fetch(`/api/reservations?date_from=${dateFrom}&date_to=${dateTo}`),
        fetch("/api/practitioners"),
      ]);

      if (resReservations.ok) {
        const data = await resReservations.json();
        setReservations(data.data || []);
      } else {
        setReservations(mockReservations);
      }

      if (resPractitioners.ok) {
        const data = await resPractitioners.json();
        setPractitioners(data.data || []);
      } else {
        setPractitioners(mockPractitioners);
      }
    } catch {
      setReservations(mockReservations);
      setPractitioners(mockPractitioners);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = reservations.filter((r) => {
    if (filterPractitioner !== "all" && r.practitioner_id !== filterPractitioner) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  const openDetail = (r: ReservationWithDetails) => {
    setSelectedReservation(r);
    setDetailOpen(true);
  };

  const openEdit = (r: ReservationWithDetails) => {
    setSelectedReservation(r);
    setEditStatus(r.status);
    setEditDate(r.date);
    setEditStartTime(r.start_time);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedReservation) return;
    try {
      const res = await fetch(`/api/reservations/${selectedReservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          date: editDate,
          start_time: editStartTime,
        }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        // Fallback: update locally
        setReservations((prev) =>
          prev.map((r) =>
            r.id === selectedReservation.id
              ? { ...r, status: editStatus, date: editDate, start_time: editStartTime }
              : r
          )
        );
      }
    } catch {
      setReservations((prev) =>
        prev.map((r) =>
          r.id === selectedReservation.id
            ? { ...r, status: editStatus, date: editDate, start_time: editStartTime }
            : r
        )
      );
    }
    setEditOpen(false);
  };

  const handleCancel = async (id: string) => {
    try {
      await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
      });
    } catch {
      // continue
    }
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "cancelled" as ReservationStatus } : r))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">予約管理</h2>
        <Button onClick={() => window.location.href = "/admin/calendar"}>
          <Plus className="h-4 w-4 mr-2" />
          代理予約
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>開始日</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>終了日</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>施術者</Label>
              <Select value={filterPractitioner} onValueChange={setFilterPractitioner}>
                <SelectTrigger>
                  <SelectValue placeholder="全員" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全員</SelectItem>
                  {practitioners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ステータス</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="reserved">予約済み</SelectItem>
                  <SelectItem value="visited">来院済み</SelectItem>
                  <SelectItem value="cancelled">キャンセル</SelectItem>
                  <SelectItem value="no_show">無断キャンセル</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={fetchData} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              検索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">予約が見つかりません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead>患者名</TableHead>
                  <TableHead>施術者</TableHead>
                  <TableHead>メニュー</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered
                  .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))
                  .map((reservation) => {
                    const status = statusConfig[reservation.status];
                    return (
                      <TableRow key={reservation.id}>
                        <TableCell>{reservation.date}</TableCell>
                        <TableCell className="font-mono">
                          {reservation.start_time} - {reservation.end_time}
                        </TableCell>
                        <TableCell className="font-medium">{reservation.patient.name}</TableCell>
                        <TableCell>{reservation.practitioner.name}</TableCell>
                        <TableCell>{reservation.menu.name}</TableCell>
                        <TableCell>
                          <Badge className={status.className}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openDetail(reservation)} title="詳細">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(reservation)} title="編集">
                              <Edit className="h-4 w-4" />
                            </Button>
                            {reservation.status === "reserved" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => handleCancel(reservation.id)}
                                title="キャンセル"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
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

      {/* Detail Dialog */}
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
                <div>{selectedReservation.patient.name}</div>
                <div className="text-muted-foreground">電話番号</div>
                <div>{selectedReservation.patient.phone}</div>
                <div className="text-muted-foreground">施術者</div>
                <div>{selectedReservation.practitioner.name}</div>
                <div className="text-muted-foreground">メニュー</div>
                <div>{selectedReservation.menu.name}</div>
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
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約編集</DialogTitle>
            <DialogDescription className="sr-only">予約情報を編集</DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>患者名</Label>
                <Input value={selectedReservation.patient.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>日付</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>開始時間</Label>
                <Input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>ステータス</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ReservationStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reserved">予約済み</SelectItem>
                    <SelectItem value="visited">来院済み</SelectItem>
                    <SelectItem value="cancelled">キャンセル</SelectItem>
                    <SelectItem value="no_show">無断キャンセル</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
