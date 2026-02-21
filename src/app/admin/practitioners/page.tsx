"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, UserCog, Calendar, BookOpen } from "lucide-react";
import type { Practitioner, Schedule, Menu, DayOfWeek } from "@/types/database";

const dayLabels: Record<DayOfWeek, string> = {
  0: "日曜日",
  1: "月曜日",
  2: "火曜日",
  3: "水曜日",
  4: "木曜日",
  5: "金曜日",
  6: "土曜日",
};

const mockPractitioners: Practitioner[] = [
  { id: "pr1", name: "山田太郎", photo_url: null, bio: "骨盤矯正の専門家。20年の経験。", specialties: ["骨盤矯正", "腰痛治療"], is_active: true, created_at: new Date().toISOString() },
  { id: "pr2", name: "鈴木花子", photo_url: null, bio: "猫背矯正とスポーツ障害を専門とする。", specialties: ["猫背矯正", "スポーツ障害"], is_active: true, created_at: new Date().toISOString() },
  { id: "pr3", name: "佐藤次郎", photo_url: null, bio: "全身調整のスペシャリスト。", specialties: ["全身調整"], is_active: false, created_at: new Date().toISOString() },
];

const mockSchedules: Schedule[] = [
  { id: "s1", practitioner_id: "pr1", day_of_week: 1, start_time: "09:00", end_time: "18:00", is_available: true, specific_date: null, is_holiday: false },
  { id: "s2", practitioner_id: "pr1", day_of_week: 2, start_time: "09:00", end_time: "18:00", is_available: true, specific_date: null, is_holiday: false },
  { id: "s3", practitioner_id: "pr1", day_of_week: 3, start_time: "09:00", end_time: "18:00", is_available: true, specific_date: null, is_holiday: false },
  { id: "s4", practitioner_id: "pr1", day_of_week: 4, start_time: "09:00", end_time: "18:00", is_available: true, specific_date: null, is_holiday: false },
  { id: "s5", practitioner_id: "pr1", day_of_week: 5, start_time: "09:00", end_time: "17:00", is_available: true, specific_date: null, is_holiday: false },
  { id: "s6", practitioner_id: "pr1", day_of_week: 6, start_time: "10:00", end_time: "15:00", is_available: true, specific_date: null, is_holiday: false },
  { id: "s7", practitioner_id: "pr1", day_of_week: 0, start_time: "09:00", end_time: "18:00", is_available: false, specific_date: null, is_holiday: true },
];

const mockMenus: Menu[] = [
  { id: "m1", name: "骨盤矯正", description: null, duration_minutes: 30, price_estimate: 5000, icon: null, sort_order: 1, is_published: true },
  { id: "m2", name: "全身調整", description: null, duration_minutes: 60, price_estimate: 8000, icon: null, sort_order: 2, is_published: true },
  { id: "m3", name: "猫背矯正", description: null, duration_minutes: 45, price_estimate: 6000, icon: null, sort_order: 3, is_published: true },
];

interface ScheduleFormRow {
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export default function PractitionersPage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [allMenus, setAllMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [menuAssignOpen, setMenuAssignOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formSpecialties, setFormSpecialties] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Schedule form
  const [scheduleRows, setScheduleRows] = useState<ScheduleFormRow[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState("");

  // Menu assignment
  const [assignedMenuIds, setAssignedMenuIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resPractitioners, resMenus] = await Promise.all([
        fetch("/api/practitioners"),
        fetch("/api/menus"),
      ]);

      if (resPractitioners.ok) {
        const data = await resPractitioners.json();
        setPractitioners(data.data || []);
      } else {
        setPractitioners(mockPractitioners);
      }

      if (resMenus.ok) {
        const data = await resMenus.json();
        setAllMenus(data.data || []);
      } else {
        setAllMenus(mockMenus);
      }
    } catch {
      setPractitioners(mockPractitioners);
      setAllMenus(mockMenus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setFormName("");
    setFormPhotoUrl("");
    setFormBio("");
    setFormSpecialties("");
    setFormIsActive(true);
    setAddOpen(true);
  };

  const openEdit = (p: Practitioner) => {
    setSelectedPractitioner(p);
    setFormName(p.name);
    setFormPhotoUrl(p.photo_url || "");
    setFormBio(p.bio || "");
    setFormSpecialties((p.specialties || []).join(", "));
    setFormIsActive(p.is_active);
    setEditOpen(true);
  };

  const openSchedule = (p: Practitioner) => {
    setSelectedPractitioner(p);
    // Initialize schedule rows for all 7 days
    const existing = mockSchedules.filter((s) => s.practitioner_id === p.id && !s.specific_date);
    const rows: ScheduleFormRow[] = ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((dow) => {
      const found = existing.find((s) => s.day_of_week === dow);
      return {
        day_of_week: dow,
        start_time: found?.start_time || "09:00",
        end_time: found?.end_time || "18:00",
        is_available: found?.is_available ?? (dow !== 0),
      };
    });
    setScheduleRows(rows);
    // Load holidays
    const holidaySchedules = mockSchedules.filter(
      (s) => s.practitioner_id === p.id && s.specific_date && s.is_holiday
    );
    setHolidays(holidaySchedules.map((s) => s.specific_date!));
    setNewHoliday("");
    setScheduleOpen(true);
  };

  const openMenuAssign = (p: Practitioner) => {
    setSelectedPractitioner(p);
    // In a real app, we'd fetch practitioner_menus
    setAssignedMenuIds(allMenus.slice(0, 2).map((m) => m.id)); // Mock default
    setMenuAssignOpen(true);
  };

  const handleAdd = async () => {
    const specialties = formSpecialties.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/practitioners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          photo_url: formPhotoUrl || null,
          bio: formBio || null,
          specialties,
          is_active: formIsActive,
        }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const newPractitioner: Practitioner = {
          id: `temp-${Date.now()}`,
          name: formName,
          photo_url: formPhotoUrl || null,
          bio: formBio || null,
          specialties,
          is_active: formIsActive,
          created_at: new Date().toISOString(),
        };
        setPractitioners((prev) => [...prev, newPractitioner]);
      }
    } catch {
      const newPractitioner: Practitioner = {
        id: `temp-${Date.now()}`,
        name: formName,
        photo_url: formPhotoUrl || null,
        bio: formBio || null,
        specialties,
        is_active: formIsActive,
        created_at: new Date().toISOString(),
      };
      setPractitioners((prev) => [...prev, newPractitioner]);
    }
    setAddOpen(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedPractitioner) return;
    const specialties = formSpecialties.split(",").map((s) => s.trim()).filter(Boolean);
    const updated = {
      ...selectedPractitioner,
      name: formName,
      photo_url: formPhotoUrl || null,
      bio: formBio || null,
      specialties,
      is_active: formIsActive,
    };
    setPractitioners((prev) => prev.map((p) => (p.id === selectedPractitioner.id ? updated : p)));
    setEditOpen(false);
  };

  const handleScheduleRowChange = (index: number, field: keyof ScheduleFormRow, value: string | boolean) => {
    setScheduleRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addHoliday = () => {
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays((prev) => [...prev, newHoliday]);
      setNewHoliday("");
    }
  };

  const removeHoliday = (date: string) => {
    setHolidays((prev) => prev.filter((d) => d !== date));
  };

  const toggleMenuAssignment = (menuId: string) => {
    setAssignedMenuIds((prev) =>
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">施術者管理</h2>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          施術者追加
        </Button>
      </div>

      {/* Practitioner List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            施術者一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : practitioners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">施術者が登録されていません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>専門分野</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {practitioners.map((practitioner) => (
                  <TableRow key={practitioner.id}>
                    <TableCell className="font-medium">{practitioner.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(practitioner.specialties || []).map((s, i) => (
                          <Badge key={i} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={practitioner.is_active ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>
                        {practitioner.is_active ? "有効" : "無効"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(practitioner)} title="基本情報編集">
                          <Edit className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openSchedule(practitioner)} title="シフト管理">
                          <Calendar className="h-4 w-4 mr-1" />
                          シフト
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openMenuAssign(practitioner)} title="メニュー割当">
                          <BookOpen className="h-4 w-4 mr-1" />
                          メニュー
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>施術者追加</DialogTitle>
            <DialogDescription className="sr-only">新しい施術者を追加します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名前 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="山田太郎" />
            </div>
            <div className="space-y-2">
              <Label>写真URL</Label>
              <Input value={formPhotoUrl} onChange={(e) => setFormPhotoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>自己紹介</Label>
              <Textarea value={formBio} onChange={(e) => setFormBio(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>専門分野（カンマ区切り）</Label>
              <Input value={formSpecialties} onChange={(e) => setFormSpecialties(e.target.value)} placeholder="骨盤矯正, 腰痛治療" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_add"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is_active_add">有効にする</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>キャンセル</Button>
            <Button onClick={handleAdd} disabled={!formName}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>施術者情報編集</DialogTitle>
            <DialogDescription className="sr-only">施術者の情報を編集します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名前</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>写真URL</Label>
              <Input value={formPhotoUrl} onChange={(e) => setFormPhotoUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>自己紹介</Label>
              <Textarea value={formBio} onChange={(e) => setFormBio(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>専門分野（カンマ区切り）</Label>
              <Input value={formSpecialties} onChange={(e) => setFormSpecialties(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_edit"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is_active_edit">有効にする</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPractitioner?.name} - シフト管理</DialogTitle>
            <DialogDescription className="sr-only">施術者のシフトを管理します</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="weekly">
            <TabsList>
              <TabsTrigger value="weekly">曜日別スケジュール</TabsTrigger>
              <TabsTrigger value="holidays">休日設定</TabsTrigger>
            </TabsList>
            <TabsContent value="weekly" className="space-y-4">
              {scheduleRows.map((row, index) => (
                <div key={row.day_of_week} className="flex items-center gap-3 p-3 border rounded-md">
                  <div className="w-20 font-medium text-sm">{dayLabels[row.day_of_week]}</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.is_available}
                      onChange={(e) => handleScheduleRowChange(index, "is_available", e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-muted-foreground">勤務</span>
                  </div>
                  <Input
                    type="time"
                    value={row.start_time}
                    onChange={(e) => handleScheduleRowChange(index, "start_time", e.target.value)}
                    disabled={!row.is_available}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="time"
                    value={row.end_time}
                    onChange={(e) => handleScheduleRowChange(index, "end_time", e.target.value)}
                    disabled={!row.is_available}
                    className="w-32"
                  />
                </div>
              ))}
            </TabsContent>
            <TabsContent value="holidays" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newHoliday}
                  onChange={(e) => setNewHoliday(e.target.value)}
                  className="w-48"
                />
                <Button variant="outline" onClick={addHoliday}>追加</Button>
              </div>
              {holidays.length === 0 ? (
                <p className="text-sm text-muted-foreground">休日が設定されていません</p>
              ) : (
                <div className="space-y-2">
                  {holidays.sort().map((date) => (
                    <div key={date} className="flex items-center justify-between p-2 border rounded-md">
                      <span className="text-sm">{date}</span>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeHoliday(date)}>
                        削除
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>閉じる</Button>
            <Button onClick={() => setScheduleOpen(false)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Assignment Dialog */}
      <Dialog open={menuAssignOpen} onOpenChange={setMenuAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPractitioner?.name} - メニュー割当</DialogTitle>
            <DialogDescription className="sr-only">施術者に対応メニューを割り当てます</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {allMenus.map((menu) => (
              <div key={menu.id} className="flex items-center gap-3 p-3 border rounded-md">
                <input
                  type="checkbox"
                  checked={assignedMenuIds.includes(menu.id)}
                  onChange={() => toggleMenuAssignment(menu.id)}
                  className="rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{menu.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {menu.duration_minutes}分 / {menu.price_estimate?.toLocaleString()}円
                  </div>
                </div>
              </div>
            ))}
            {allMenus.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">メニューが登録されていません</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMenuAssignOpen(false)}>閉じる</Button>
            <Button onClick={() => setMenuAssignOpen(false)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
