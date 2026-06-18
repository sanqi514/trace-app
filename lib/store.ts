import { openDB, IDBPDatabase } from "idb";
import { TraceRecord, Reflection, WeeklyReport, AppSettings } from "./types";

const DB_NAME = "trace-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB only available in browser");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("records")) {
          const s = db.createObjectStore("records", { keyPath: "id" });
          s.createIndex("createdAt", "createdAt");
          s.createIndex("type", "type");
        }
        if (!db.objectStoreNames.contains("reflections")) {
          db.createObjectStore("reflections", { keyPath: "id" }).createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("weeklyReports")) {
          db.createObjectStore("weeklyReports", { keyPath: "id" }).createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- Records ----
export async function getRecords(): Promise<TraceRecord[]> {
  const db = await getDB();
  const all = (await db.getAllFromIndex("records", "createdAt")) as TraceRecord[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}
export async function getRecord(id: string): Promise<TraceRecord | undefined> {
  return (await getDB()).get("records", id);
}
export async function saveRecord(rec: TraceRecord) {
  return (await getDB()).put("records", rec);
}
export async function deleteRecord(id: string) {
  return (await getDB()).delete("records", id);
}

// ---- Reflections ----
export async function getReflections(): Promise<Reflection[]> {
  const all = (await (await getDB()).getAll("reflections")) as Reflection[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}
export async function getReflection(id: string): Promise<Reflection | undefined> {
  return (await getDB()).get("reflections", id);
}
export async function saveReflection(r: Reflection) {
  return (await getDB()).put("reflections", r);
}

// ---- Weekly ----
export async function getWeeklyReports(): Promise<WeeklyReport[]> {
  const all = (await (await getDB()).getAll("weeklyReports")) as WeeklyReport[];
  return all.sort((a, b) => b.createdAt - a.createdAt);
}
export async function getWeeklyReport(id: string): Promise<WeeklyReport | undefined> {
  return (await getDB()).get("weeklyReports", id);
}
export async function saveWeeklyReport(r: WeeklyReport) {
  return (await getDB()).put("weeklyReports", r);
}

// ---- Settings ----
const DEFAULT_SETTINGS: AppSettings = {
  aiEnabled: true,
  previewBeforeSend: true,
  // 留空 → 使用 Vercel 服务端环境变量；填了则用用户自带的
  modelName: "",
  baseURL: "",
  apiKey: "",
  reminders: [
    { id: "r1", label: "每晚记录", time: "22:00", repeat: "daily", enabled: false },
    { id: "r2", label: "每周复盘", time: "20:00", repeat: "weekly", weekday: 0, enabled: false },
  ],
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const row = await db.get("settings", "app");
  return row?.value ? { ...DEFAULT_SETTINGS, ...row.value } : DEFAULT_SETTINGS;
}
export async function saveSettings(value: AppSettings) {
  return (await getDB()).put("settings", { key: "app", value });
}

// ---- Export ----
export async function exportAll() {
  const [records, reflections, weekly] = await Promise.all([
    getRecords(),
    getReflections(),
    getWeeklyReports(),
  ]);
  // 导出时去掉 Blob（不可序列化），仅保留元数据
  const safeRecords = records.map(({ audioBlob, images, ...rest }) => ({
    ...rest,
    hasAudio: !!audioBlob,
    imageCount: images?.length || 0,
  }));
  return { records: safeRecords, reflections, weekly, exportedAt: Date.now() };
}
