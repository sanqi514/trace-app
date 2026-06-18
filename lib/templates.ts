import { ReflectionTemplate } from "./types";

// 复盘模板定义：A 成长型 / B 目标型
export const REFLECTION_TEMPLATES: Record<
  ReflectionTemplate,
  { name: string; desc: string; steps: string[] }
> = {
  A: {
    name: "模板 A · 成长型",
    desc: "发生了什么 → 我的感受 → 学到什么 → 下一步行动",
    steps: ["发生了什么", "我的感受", "学到什么", "下一步行动"],
  },
  B: {
    name: "模板 B · 目标型",
    desc: "目标 → 结果 → 差距 → 原因 → 改进",
    steps: ["目标", "结果", "差距", "原因", "改进"],
  },
};

// 构造单条/多条复盘的提示词
export function buildReflectionPrompt(
  template: ReflectionTemplate,
  records: { text: string; createdAt: number; type: string }[]
): string {
  const tpl = REFLECTION_TEMPLATES[template];
  const corpus = records
    .map((r, i) => `【记录${i + 1}｜${new Date(r.createdAt).toLocaleString("zh-CN")}】\n${r.text}`)
    .join("\n\n");
  return [
    `你是一个善于复盘的助手。请基于以下记录，按固定结构输出一份结构化复盘。`,
    `结构字段（严格按此顺序，且只用这些字段）：${tpl.steps.join(" → ")}。`,
    `要求：每个字段一段简洁中文；最后一个字段若是行动类，请给出 2-3 条可执行的具体行动；不要寒暄。`,
    `请只返回 JSON，格式：{"title":"一句话标题","sections":[{"title":"字段名","body":"内容"}]}`,
    ``,
    `以下是记录内容：`,
    corpus,
  ].join("\n");
}

// 构造每周总结提示词
export function buildWeeklyPrompt(
  weekRange: string,
  records: { text: string; createdAt: number; type: string }[]
): string {
  const corpus = records
    .map((r, i) => `【${r.type}｜${new Date(r.createdAt).toLocaleString("zh-CN")}】${r.text}`)
    .join("\n");
  return [
    `你是个人周报助手。基于本周（${weekRange}）的记录，生成四个固定板块的总结。`,
    `板块：本周灵感清单、本周复盘要点、本周做了哪些事、情绪/状态。`,
    `要求：简洁中文，灵感与复盘可用要点列表（用 · 开头）；情绪/状态给出整体判断与一条建议；不要寒暄。`,
    `请只返回 JSON，格式：{"ideas":"...","reviewPoints":"...","things":"...","mood":"..."}`,
    ``,
    `本周记录：`,
    corpus,
  ].join("\n");
}
