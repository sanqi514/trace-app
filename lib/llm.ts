// 前端调用 Vercel Serverless 代理的封装
import { ReflectionTemplate, ReflectionSection, WeeklyReport } from "./types";
import { buildReflectionPrompt, buildWeeklyPrompt } from "./templates";
import { getSettings } from "./store";

async function callLLM(prompt: string): Promise<string> {
  // 从本地设置读取用户自带的模型 / Key / BaseURL（留空则由服务端兜底）
  let config: { apiKey?: string; baseURL?: string; model?: string } = {};
  try {
    const s = await getSettings();
    config = { apiKey: s.apiKey, baseURL: s.baseURL, model: s.modelName };
  } catch {
    /* 读取失败则交给服务端环境变量 */
  }
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, config }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `LLM 请求失败 (${res.status})`);
  }
  const data = await res.json();
  return data.content as string;
}

function extractJSON(raw: string): any {
  // 容错：模型可能包裹 ```json ``` 或夹带文字
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("模型未返回有效 JSON");
  return JSON.parse(match[0]);
}

export async function generateReflection(
  template: ReflectionTemplate,
  records: { text: string; createdAt: number; type: string }[]
): Promise<{ title: string; sections: ReflectionSection[] }> {
  const prompt = buildReflectionPrompt(template, records);
  const raw = await callLLM(prompt);
  const parsed = extractJSON(raw);
  return {
    title: parsed.title || "复盘",
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
  };
}

export async function generateWeekly(
  weekRange: string,
  records: { text: string; createdAt: number; type: string }[]
): Promise<Pick<WeeklyReport, "ideas" | "reviewPoints" | "things" | "mood">> {
  const prompt = buildWeeklyPrompt(weekRange, records);
  const raw = await callLLM(prompt);
  const p = extractJSON(raw);
  return {
    ideas: p.ideas || "",
    reviewPoints: p.reviewPoints || "",
    things: p.things || "",
    mood: p.mood || "",
  };
}

// 单条摘要 + 标签建议
export async function summarizeRecord(text: string): Promise<{ summary: string; tags: string[] }> {
  const prompt = [
    "请为以下记录生成一句话摘要和 2-3 个标签。",
    '只返回 JSON：{"summary":"...","tags":["..."]}',
    "",
    text,
  ].join("\n");
  const raw = await callLLM(prompt);
  const p = extractJSON(raw);
  return { summary: p.summary || "", tags: Array.isArray(p.tags) ? p.tags : [] };
}

// 优化表达：把口语化 / 零散的文字梳理通顺（保留原意，不杜撰）
export async function polishText(text: string): Promise<string> {
  const prompt = [
    "请把下面这段个人记录（可能是语音转写的口语，可能零散）梳理为通顺、清晰、自然的中文。",
    "要求：保留原意与所有关键信息，不要杜撰内容；去掉口头语和重复；适当分句、理顺逻辑；保持第一人称口吻。",
    '只返回 JSON：{"polished":"梳理后的文字"}',
    "",
    "原文：",
    text,
  ].join("\n");
  const raw = await callLLM(prompt);
  const p = extractJSON(raw);
  return (p.polished as string) || text;
}

// 预览：拼出发送内容（供发送前确认）
export function previewReflectionPayload(
  template: ReflectionTemplate,
  records: { text: string; createdAt: number; type: string }[]
): string {
  return buildReflectionPrompt(template, records);
}
