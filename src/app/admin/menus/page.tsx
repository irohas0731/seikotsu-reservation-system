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
import {
  Plus,
  Edit,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Menu } from "@/types/database";

const mockMenus: Menu[] = [
  { id: "m1", name: "骨盤矯正", description: "骨盤のゆがみを整え、腰痛や姿勢の改善を目指します。", duration_minutes: 30, price_estimate: 5000, icon: "bone", sort_order: 1, is_published: true },
  { id: "m2", name: "全身調整", description: "全身のバランスを整える施術です。肩こり・腰痛・膝痛など幅広く対応。", duration_minutes: 60, price_estimate: 8000, icon: "body", sort_order: 2, is_published: true },
  { id: "m3", name: "猫背矯正", description: "猫背を改善し、正しい姿勢を取り戻す施術です。", duration_minutes: 45, price_estimate: 6000, icon: "spine", sort_order: 3, is_published: true },
  { id: "m4", name: "スポーツコンディショニング", description: "スポーツによる疲労回復やパフォーマンス向上をサポート。", duration_minutes: 60, price_estimate: 9000, icon: "activity", sort_order: 4, is_published: false },
];

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDuration, setFormDuration] = useState(30);
  const [formPrice, setFormPrice] = useState(0);
  const [formIcon, setFormIcon] = useState("");
  const [formIsPublished, setFormIsPublished] = useState(true);

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/menus");
      if (res.ok) {
        const data = await res.json();
        setMenus(data.data || []);
      } else {
        setMenus(mockMenus);
      }
    } catch {
      setMenus(mockMenus);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const openAdd = () => {
    setFormName("");
    setFormDescription("");
    setFormDuration(30);
    setFormPrice(0);
    setFormIcon("");
    setFormIsPublished(true);
    setAddOpen(true);
  };

  const openEdit = (menu: Menu) => {
    setEditingMenu(menu);
    setFormName(menu.name);
    setFormDescription(menu.description || "");
    setFormDuration(menu.duration_minutes);
    setFormPrice(menu.price_estimate || 0);
    setFormIcon(menu.icon || "");
    setFormIsPublished(menu.is_published);
    setEditOpen(true);
  };

  const handleAdd = async () => {
    const maxSort = menus.reduce((max, m) => Math.max(max, m.sort_order), 0);
    const newMenu: Menu = {
      id: `temp-${Date.now()}`,
      name: formName,
      description: formDescription || null,
      duration_minutes: formDuration,
      price_estimate: formPrice || null,
      icon: formIcon || null,
      sort_order: maxSort + 1,
      is_published: formIsPublished,
    };

    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMenu),
      });
      if (res.ok) {
        await fetchMenus();
      } else {
        setMenus((prev) => [...prev, newMenu]);
      }
    } catch {
      setMenus((prev) => [...prev, newMenu]);
    }
    setAddOpen(false);
  };

  const handleSaveEdit = async () => {
    if (!editingMenu) return;
    const updated: Menu = {
      ...editingMenu,
      name: formName,
      description: formDescription || null,
      duration_minutes: formDuration,
      price_estimate: formPrice || null,
      icon: formIcon || null,
      is_published: formIsPublished,
    };
    setMenus((prev) => prev.map((m) => (m.id === editingMenu.id ? updated : m)));
    setEditOpen(false);
  };

  const togglePublished = (menu: Menu) => {
    setMenus((prev) =>
      prev.map((m) =>
        m.id === menu.id ? { ...m, is_published: !m.is_published } : m
      )
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setMenus((prev) => {
      const newMenus = [...prev];
      const temp = newMenus[index].sort_order;
      newMenus[index].sort_order = newMenus[index - 1].sort_order;
      newMenus[index - 1].sort_order = temp;
      [newMenus[index], newMenus[index - 1]] = [newMenus[index - 1], newMenus[index]];
      return newMenus;
    });
  };

  const moveDown = (index: number) => {
    if (index === menus.length - 1) return;
    setMenus((prev) => {
      const newMenus = [...prev];
      const temp = newMenus[index].sort_order;
      newMenus[index].sort_order = newMenus[index + 1].sort_order;
      newMenus[index + 1].sort_order = temp;
      [newMenus[index], newMenus[index + 1]] = [newMenus[index + 1], newMenus[index]];
      return newMenus;
    });
  };

  const sortedMenus = [...menus].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">メニュー管理</h2>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          メニュー追加
        </Button>
      </div>

      {/* Menu List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            メニュー一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
          ) : sortedMenus.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">メニューが登録されていません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">並び順</TableHead>
                  <TableHead>メニュー名</TableHead>
                  <TableHead>施術時間</TableHead>
                  <TableHead>料金目安</TableHead>
                  <TableHead>公開状態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMenus.map((menu, index) => (
                  <TableRow key={menu.id}>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => moveDown(index)}
                          disabled={index === sortedMenus.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{menu.name}</TableCell>
                    <TableCell>{menu.duration_minutes}分</TableCell>
                    <TableCell>{menu.price_estimate?.toLocaleString() || "-"}円</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          menu.is_published
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                        }
                      >
                        {menu.is_published ? "公開" : "非公開"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(menu)} title="編集">
                          <Edit className="h-4 w-4 mr-1" />
                          編集
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePublished(menu)}
                          title={menu.is_published ? "非公開にする" : "公開する"}
                        >
                          {menu.is_published ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-1" />
                              非公開
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              公開
                            </>
                          )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メニュー追加</DialogTitle>
            <DialogDescription className="sr-only">新しいメニューを追加します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>メニュー名 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="骨盤矯正" />
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>施術時間（分）*</Label>
                <Input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  min={15}
                  step={15}
                />
              </div>
              <div className="space-y-2">
                <Label>料金目安（円）</Label>
                <Input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  min={0}
                  step={500}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>アイコン名</Label>
              <Input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder="bone" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_published_add"
                checked={formIsPublished}
                onChange={(e) => setFormIsPublished(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is_published_add">公開する</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>キャンセル</Button>
            <Button onClick={handleAdd} disabled={!formName || !formDuration}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メニュー編集</DialogTitle>
            <DialogDescription className="sr-only">メニューの情報を編集します</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>メニュー名</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>施術時間（分）</Label>
                <Input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  min={15}
                  step={15}
                />
              </div>
              <div className="space-y-2">
                <Label>料金目安（円）</Label>
                <Input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  min={0}
                  step={500}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>アイコン名</Label>
              <Input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_published_edit"
                checked={formIsPublished}
                onChange={(e) => setFormIsPublished(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is_published_edit">公開する</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
            <Button onClick={handleSaveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
