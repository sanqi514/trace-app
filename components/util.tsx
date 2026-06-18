"use client";
import { useEffect, useState } from "react";

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2400);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? <div className="toast">{msg}</div> : null;
  return { showToast: setMsg, toastNode: node };
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (sameDay) return `今天 ${hm}`;
  if (yest) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

export function formatDuration(sec?: number): string {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 本周范围（周一至周日）
export function getWeekRange(): { start: number; end: number; label: string } {
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - (day - 1));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
  return { start: start.getTime(), end: end.getTime(), label: `${fmt(start)} – ${fmt(end)}` };
}
