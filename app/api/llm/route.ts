import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let prompt = "";
  let clientCfg: { apiKey?: string; baseURL?: string; model?: string } = {};
  try {
    const body = await req.json();
    prompt = body.prompt;
    clientCfg = body.config || {};
  } catch {
    return NextResponse.json({ error: "请求体解析失败" }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: "缺少 prompt" }, { status: 400 });
  }

  // 优先用前端自带配置，留空则回退到 Vercel 服务端环境变量
  const apiKey = (clientCfg.apiKey || "").trim() || process.env.LLM_API_KEY;
  const baseURL =
    (clientCfg.baseURL || "").trim() || process.env.LLM_BASE_URL || "https://api.openai.com/v1";
  const model = (clientCfg.model || "").trim() || process.env.LLM_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json(
      { error: "未配置 API Key：请在「设置」中填入你的 Key，或在 Vercel 环境变量中设置 LLM_API_KEY。" },
      { status: 400 }
    );
  }

  try {
    const resp = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "你是简洁、可靠的中文个人记录复盘助手，严格按要求只返回 JSON。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json({ error: `上游模型错误: ${t.slice(0, 300)}` }, { status: 502 });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ content });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "代理请求异常" }, { status: 500 });
  }
}
