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
import { Search, Plus, Edit, Users } from "lucide-react";
import type { Patient } from "@/types/database";

const mockPatients: Patient[] = [
  { id: "p1", name: "田中太郎", phone: "090-1234-5678", birth_date: "1985-03-15", pin_code: "1234", line_user_id: null, memo: "腰痛持ち", created_at: "2024-01-10T00:00:00Z" },
  { id: "p2", name: "佐藤花子", phone: "090-2345-6789", birth_date: "1990-07-20", pin_code: "5678", line_user_id: null, memo: null, created_at: "2024-02-15T00:00:00Z" },
  { id: "p3", name: "鈴木一郎", phone: "090-3456-7890", birth_date: "1978-11-05", pin_code: "9012", line_user_id: null, memo: "肩こりがひどい", created_at: "2024-03-20T00:00:00Z" },
  { id: "p4", name: "高橋美咲", phone: "090-4567-8901", birth_date: "1995-01-12", pin_code: "3456", line_user_id: null, memo: null, created_at: "2024-04-05T00:00:00Z" },
  { id: "p5", name: "伊藤健太", phone: "090-5678-9012", birth_date: "1982-09-30", pin_code: "7890", line_user_id: null, memo: "週2回通院", created_at: "2024-05-10T00:00:00Z" },
];

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [formPinCode, setFormPinCode] = useState("");

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/patients${params}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.data || []);
      } else {
        setPatients(mockPatients);
      }
    } catch {
      setPatients(mockPatients);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients();
  };

  const openEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormName(patient.name);
    setFormPhone(patient.phone);
    setFormBirthDate(patient.birth_date || "");
    setFormMemo(patient.memo || "");
    setFormPinCode(patient.pin_code);
    setEditOpen(true);
  };

  const openAdd = () => {
    setFormName("");
    setFormPhone("");
    setFormBirthDate("");
    setFormMemo("");
    setFormPinCode("");
    setAddOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPatient) return;
    try {
      const res = await fetch("/api/patients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPatient.id,
          name: formName,
          phone: formPhone,
          birth_date: formBirthDate || null,
          memo: formMemo || null,
        }),
      });
      if (res.ok) {
        await fetchPatients();
      } else {
        // Fallback: update locally
        setPatients((prev) =>
          prev.map((p) =>
            p.id === editingPatient.id
              ? { ...p, name: formName, phone: formPhone, birth_date: formBirthDate || null, memo: formMemo || null }
              : p
          )
        );
      }
    } catch {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === editingPatient.id
            ? { ...p, name: formName, phone: formPhone, birth_date: formBirthDate || null, memo: formMemo || null }
            : p
        )
      );
    }
    setEditOpen(false);
  };

  const handleAdd = async () => {
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          birth_date: formBirthDate || null,
          pin_code: formPinCode || "0000",
          memo: formMemo || null,
        }),
      });
      if (res.ok) {
        await fetchPatients();
      } else {
        // Fallback: add locally
        const newPatient: Patient = {
          id: `temp-${Date.now()}`,
          name: formName,
          phone: formPhone,
          birth_date: formBirthDate || null,
          pin_code: formPinCode || "0000",
          line_user_id: null,
          memo: formMemo || null,
          created_at: new Date().toISOString(),
        };
        setPatients((prev) => [newPatient, ...prev]);
      }
    } catch {
      const newPatient: Patient = {
        id: `temp-${Date.now()}`,
        name: formName,
        phone: formPhone,
        birth_date: formBirthDate || null,
        pin_code: formPinCode || "0000",
        line_user_id: null,
        memo: formMemo || null,
        created_at: new Date().toISOString(),
      };
      setPatients((prev) => [newPatient, ...prev]);
    }
    setAddOpen(false);
  };

  const filteredPatients = searchQuery
    ? patients.filter(
        (p) =>
          p.name.includes(searchQuery) ||
          p.phone.includes(searchQuery)
      )
    : patients;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">患者管理</h2>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          新規登録
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            患者検索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="名前または電話番号で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <Button type="submit" variant="outline">
              <Search className="h-4 w-4 mr-2" />
              検索
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            患者一覧 ({filteredPatients.length}名)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">患者が見つかりません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>生年月日</TableHead>
                  <TableHead>メモ</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.phone}</TableCell>
                    <TableCell>{patient.birth_date || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {patient.memo ? (
                        <Badge variant="outline" className="font-normal">{patient.memo}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {patient.created_at.split("T")[0]}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(patient)} title="編集">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>患者情報編集</DialogTitle>
            <DialogDescription className="sr-only">患者の情報を編集します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名前</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>生年月日</Label>
              <Input type="date" value={formBirthDate} onChange={(e) => setFormBirthDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Textarea value={formMemo} onChange={(e) => setFormMemo(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規患者登録</DialogTitle>
            <DialogDescription className="sr-only">新しい患者を登録します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名前 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="山田太郎" />
            </div>
            <div className="space-y-2">
              <Label>電話番号 *</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="090-xxxx-xxxx" />
            </div>
            <div className="space-y-2">
              <Label>PINコード *</Label>
              <Input value={formPinCode} onChange={(e) => setFormPinCode(e.target.value)} placeholder="4桁の数字" maxLength={4} />
            </div>
            <div className="space-y-2">
              <Label>生年月日</Label>
              <Input type="date" value={formBirthDate} onChange={(e) => setFormBirthDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>メモ</Label>
              <Textarea value={formMemo} onChange={(e) => setFormMemo(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>キャンセル</Button>
            <Button onClick={handleAdd} disabled={!formName || !formPhone}>登録</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
