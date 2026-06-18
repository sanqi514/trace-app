// 类型定义
export type RecordType = "review" | "idea" | "fun";

export interface TraceRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  type: RecordType;
  text: string;
  audioBlob?: Blob;
  audioDuration?: number;
  images?: Blob[];
  transcribed: boolean;
  tags: string[];
  aiSummary?: string;
  aiTags?: string[];
}

export type ReflectionTemplate = "A" | "B";

export interface ReflectionSection {
  title: string;
  body: string;
}

export interface Reflection {
  id: string;
  createdAt: number;
  template: ReflectionTemplate;
  title: string;
  sourceRecordIds: string[];
  sections: ReflectionSection[];
}

export interface WeeklyReport {
  id: string;
  createdAt: number;
  weekRange: string;
  sourceCount: number;
  ideas: string;
  reviewPoints: string;
  things: string;
  mood: string;
}

export interface Reminder {
  id: string;
  label: string;
  time: string; // "HH:MM"
  repeat: "daily" | "weekly";
  weekday?: number; // 0-6 when weekly
  enabled: boolean;
}

export interface AppSettings {
  aiEnabled: boolean;
  previewBeforeSend: boolean;
  // AI 连接配置（前端可自填；留空则用 Vercel 服务端环境变量兜底）
  modelName: string;
  baseURL: string;
  apiKey: string;
  reminders: Reminder[];
}

export const TYPE_META: Record<RecordType, { label: string; emoji: string; color: string; bg: string }> = {
  review: { label: "复盘", emoji: "🟠", color: "#e8775a", bg: "#fdeee9" },
  idea: { label: "灵感", emoji: "🔵", color: "#6c8cff", bg: "#eef1ff" },
  fun: { label: "趣事", emoji: "🟡", color: "#c98a06", bg: "#fef6e3" },
};
