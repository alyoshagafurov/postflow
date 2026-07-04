"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Loader2, Send, Save } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PLATFORM_META } from "@/lib/platforms";
import { VideoUploader } from "@/components/posts/video-uploader";
import { CoverPicker, type CoverOption } from "@/components/posts/cover-picker";
import {
  AccountSelect,
  type SelectableAccount,
} from "@/components/posts/account-select";

type PerAccountText = Record<string, { caption?: string; hashtags?: string }>;

export function PostEditor({ accounts }: { accounts: SelectableAccount[] }) {
  const router = useRouter();

  const [postId, setPostId] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [covers, setCovers] = useState<CoverOption[]>([]);
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [generatingCovers, setGeneratingCovers] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [perPlatformText, setPerPlatformText] = useState(false);
  const [perAccount, setPerAccount] = useState<PerAccountText>({});

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState<null | "draft" | "schedule">(null);

  async function handleUploaded({ key }: { key: string }) {
    setVideoKey(key);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoKey: key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось создать пост");
      setPostId(data.id);
      void generateCovers(data.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function generateCovers(id: string) {
    setGeneratingCovers(true);
    try {
      const res = await fetch(`/api/posts/${id}/covers`, { method: "POST" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.covers)) {
        setCovers(data.covers);
        if (data.covers[0]) setSelectedCover(data.covers[0].key);
      } else {
        toast.message("Не удалось извлечь кадры — можно загрузить свою обложку.");
      }
    } catch {
      toast.message("Не удалось извлечь кадры — можно загрузить свою обложку.");
    } finally {
      setGeneratingCovers(false);
    }
  }

  async function save(kind: "draft" | "schedule") {
    if (!postId) return;

    if (kind === "schedule") {
      if (selectedAccounts.length === 0) {
        toast.error("Выберите хотя бы один аккаунт");
        return;
      }
      if (scheduleMode === "later" && !scheduledLocal) {
        toast.error("Укажите дату и время публикации");
        return;
      }
      if (!consent) {
        toast.error("Подтвердите согласие на публикацию");
        return;
      }
    }

    setSaving(kind);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const payload: Record<string, unknown> = {
        title: title || null,
        description: description || null,
        hashtags: hashtags || null,
        coverKey: selectedCover,
        perPlatformText,
        timezone,
      };

      if (perPlatformText) {
        payload.targets = selectedAccounts.map((id) => ({
          socialAccountId: id,
          caption: perAccount[id]?.caption || null,
          hashtags: perAccount[id]?.hashtags || null,
        }));
      } else {
        payload.targetAccountIds = selectedAccounts;
      }

      if (kind === "schedule") {
        payload.status = "SCHEDULED";
        payload.consent = true;
        payload.publishNow = scheduleMode === "now";
        if (scheduleMode === "later") {
          payload.scheduledAt = new Date(scheduledLocal).toISOString();
        }
      } else {
        payload.status = "DRAFT";
      }

      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");

      toast.success(
        kind === "schedule" ? "Публикация запланирована" : "Черновик сохранён",
      );
      router.push("/posts");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Video */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Видео</CardTitle>
        </CardHeader>
        <CardContent>
          {!videoKey ? (
            <VideoUploader onUploaded={handleUploaded} />
          ) : (
            <p className="flex items-center gap-2 text-sm text-success">
              <Send className="h-4 w-4" /> Видео загружено. Прокрутите ниже,
              чтобы настроить пост.
            </p>
          )}
        </CardContent>
      </Card>

      {videoKey && (
        <>
          {/* 2. Cover */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Обложка</CardTitle>
            </CardHeader>
            <CardContent>
              <CoverPicker
                covers={covers}
                value={selectedCover}
                generating={generatingCovers}
                onSelect={setSelectedCover}
                onCustomUploaded={(c) => setCovers((prev) => [...prev, c])}
              />
            </CardContent>
          </Card>

          {/* 3. Text */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Текст публикации</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Заголовок</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Заголовок ролика"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Описание</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Описание / подпись"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Хэштеги</Label>
                <Input
                  id="tags"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#shorts #reels #fyp"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">
                    Настроить текст под каждую платформу
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Иначе один текст для всех аккаунтов.
                  </p>
                </div>
                <Switch
                  checked={perPlatformText}
                  onCheckedChange={setPerPlatformText}
                />
              </div>

              {perPlatformText && selectedAccounts.length > 0 && (
                <div className="space-y-4">
                  {selectedAccounts.map((id) => {
                    const acc = accounts.find((a) => a.id === id);
                    if (!acc) return null;
                    const meta = PLATFORM_META[acc.platform];
                    return (
                      <div
                        key={id}
                        className="space-y-2 rounded-lg border border-border p-3"
                      >
                        <p
                          className="text-xs font-medium"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                          {acc.username ? ` · @${acc.username.replace(/^@/, "")}` : ""}
                        </p>
                        <Textarea
                          rows={2}
                          placeholder={`Текст для ${meta.label}`}
                          value={perAccount[id]?.caption ?? ""}
                          onChange={(e) =>
                            setPerAccount((p) => ({
                              ...p,
                              [id]: { ...p[id], caption: e.target.value },
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Куда публиковать</CardTitle>
            </CardHeader>
            <CardContent>
              <AccountSelect
                accounts={accounts}
                value={selectedAccounts}
                onChange={setSelectedAccounts}
              />
            </CardContent>
          </Card>

          {/* 5. Schedule + consent */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Публикация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleMode("now")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition",
                    scheduleMode === "now"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/40",
                  )}
                >
                  <Send className="h-4 w-4" /> Опубликовать сейчас
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode("later")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition",
                    scheduleMode === "later"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/40",
                  )}
                >
                  <CalendarClock className="h-4 w-4" /> Запланировать
                </button>
              </div>

              {scheduleMode === "later" && (
                <div className="space-y-2">
                  <Label htmlFor="when">Дата и время</Label>
                  <Input
                    id="when"
                    type="datetime-local"
                    value={scheduledLocal}
                    onChange={(e) => setScheduledLocal(e.target.value)}
                  />
                </div>
              )}

              <label className="flex items-start gap-3 rounded-lg border border-border p-3">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-muted-foreground">
                  Я подтверждаю, что обладаю правами на контент и согласен на его
                  публикацию в выбранные аккаунты. Публикация в TikTok и Instagram
                  возможна после верификации аккаунта платформой.
                </span>
              </label>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              disabled={saving !== null}
              onClick={() => save("draft")}
            >
              {saving === "draft" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Сохранить черновик
            </Button>
            <Button disabled={saving !== null} onClick={() => save("schedule")}>
              {saving === "schedule" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : scheduleMode === "now" ? (
                <Send className="mr-2 h-4 w-4" />
              ) : (
                <CalendarClock className="mr-2 h-4 w-4" />
              )}
              {scheduleMode === "now" ? "Опубликовать сейчас" : "Запланировать"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
