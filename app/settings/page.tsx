"use client";
import { useEffect, useState } from "react";
import TabBar from "@/components/TabBar";
import { useToast } from "@/components/util";
import { getSettings, saveSettings, exportAll, getRecords } from "@/lib/store";
import { AppSettings } from "@/lib/types";

export default function SettingsPage() {
  const { showToast, toastNode } = useToast();
  const [s, setS] = useState<AppSettings | null>(null);
  const [count, setCount] = useState(0);

  // AI 模型区：折叠 + 草稿（填完点保存才生效）
  const [aiOpen, setAiOpen] = useState(false);
  const [draftModel, setDraftModel] = useState("");
  const [draftBase, setDraftBase] = useState("");
  const [draftKey, setDraftKey] = useState("");

  useEffect(() => {
    getSettings().then((v) => {
      setS(v);
      setDraftModel(v.modelName);
      setDraftBase(v.baseURL);
      setDraftKey(v.apiKey);
    });
    getRecords().then((r) => setCount(r.length));
  }, []);

  if (!s) return null;

  const update = async (patch: Partial<AppSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    await saveSettings(next);
  };

  // 已配置摘要（用于折叠态右侧展示）
  const aiSummary = s.modelName.trim()
    ? s.modelName.trim()
    : s.apiKey.trim()
    ? "自定义 Key"
    : "服务端默认";

  const dirty =
    draftModel !== s.modelName || draftBase !== s.baseURL || draftKey !== s.apiKey;

  const saveAi = async () => {
    await update({
      modelName: draftModel.trim(),
      baseURL: draftBase.trim(),
      apiKey: draftKey.trim(),
    });
    showToast("AI 配置已保存");
    setAiOpen(false);
  };

  const updateReminder = async (id: string, patch: any) => {
    const reminders = s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r));
    await update({ reminders });
  };

  const exportData = async (fmt: "md" | "json") => {
    const data = await exportAll();
    let content = "", name = "", mime = "";
    if (fmt === "json") {
      content = JSON.stringify(data, null, 2);
      name = "trace-export.json"; mime = "application/json";
    } else {
      const lines = ["# Trace 数据导出", "", `> 导出于 ${new Date().toLocaleString("zh-CN")}`, "", "## 记录", ""];
      data.records.forEach((r: any) => {
        lines.push(`### [${r.type}] ${new Date(r.createdAt).toLocaleString("zh-CN")}`, "", r.text || "（仅录音）", r.tags?.length ? `\n标签：${r.tags.map((t: string) => "#" + t).join(" ")}` : "", "");
      });
      content = lines.join("\n");
      name = "trace-export.md"; mime = "text/markdown";
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
    showToast("已导出");
  };

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <div className={`toggle ${on ? "" : "off"}`} onClick={onClick} />
  );

  return (
    <div className="app">
      <div className="app-body">
        <div className="h-row"><div><h2>设置</h2></div></div>

        <div className="sec">AI 模型（OpenAI 兼容 · 经 Vercel 代理）</div>
        <div className="set-group">
          {/* 折叠头：点击展开/收起 */}
          <div className="set-row tappable" onClick={() => setAiOpen((v) => !v)}>
            <div className="k">
              <span className="set-ic" style={{ background: "#e8775a" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l2 5 5 .5-4 3.5 1.3 5L12 19l-4.3 2 1.3-5L5 8.5 10 8z" /></svg>
              </span>AI 模型
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="v">{aiSummary}</span>
              <span className={`chev ${aiOpen ? "open" : ""}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
              </span>
            </div>
          </div>

          {aiOpen && (
            <div className="ai-panel">
              <label className="fld">
                <span className="fld-k">模型</span>
                <input
                  className="fld-in"
                  placeholder="如 gpt-4o-mini（留空用服务端默认）"
                  value={draftModel}
                  onChange={(e) => setDraftModel(e.target.value)}
                />
              </label>
              <label className="fld">
                <span className="fld-k">接口地址</span>
                <input
                  className="fld-in"
                  placeholder="https://api.openai.com/v1（留空用默认）"
                  value={draftBase}
                  onChange={(e) => setDraftBase(e.target.value)}
                />
              </label>
              <label className="fld">
                <span className="fld-k">API Key</span>
                <input
                  className="fld-in"
                  type="password"
                  autoComplete="off"
                  placeholder="sk-...（留空用服务端 Key）"
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  onPaste={(e) => {
                    const t = e.clipboardData.getData("text");
                    if (t) { e.preventDefault(); setDraftKey(t.trim()); }
                  }}
                />
              </label>
              <button className="ai-save" disabled={!dirty} onClick={saveAi}>
                {dirty ? "保存并生效" : "已是最新"}
              </button>
            </div>
          )}
        </div>
        <p style={{ fontSize: 11, color: "#9a9389", margin: "0 4px 16px", lineHeight: 1.6 }}>
          可在此自填模型 / 接口 / Key——仅保存在本机浏览器（IndexedDB），通过 Vercel 代理转发、不直连厂商、不上传第三方。
          填写后需点「保存并生效」。API Key 始终以密文显示、支持直接粘贴；三项均留空时，自动使用 Vercel 服务端环境变量（LLM_MODEL / LLM_BASE_URL / LLM_API_KEY）兜底。
        </p>

        <div className="sec">隐私</div>
        <div className="set-group">
          <div className="set-row">
            <div className="k">
              <span className="set-ic" style={{ background: "#34c759" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /></svg>
              </span>发送前预览
            </div>
            <Toggle on={s.previewBeforeSend} onClick={() => update({ previewBeforeSend: !s.previewBeforeSend })} />
          </div>
          <div className="set-row">
            <div className="k">
              <span className="set-ic" style={{ background: "#2b2824" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l2 5 5 .5-4 3.5 1.3 5L12 19l-4.3 2 1.3-5L5 8.5 10 8z" /></svg>
              </span>启用云端 AI
            </div>
            <Toggle on={s.aiEnabled} onClick={() => update({ aiEnabled: !s.aiEnabled })} />
          </div>
        </div>
        <p style={{ fontSize: 11, color: "#9a9389", margin: "0 4px 16px", lineHeight: 1.6 }}>
          语音转写使用浏览器自带能力（Web Speech），本地实时进行、零服务器成本；iOS Safari 支持有限，不可用时可改用手动输入或「优化表达」。
        </p>

        <div className="sec">提醒</div>
        <div className="set-group">
          {s.reminders.map((r) => (
            <div className="set-row" key={r.id}>
              <div className="k">
                <span className="set-ic" style={{ background: r.repeat === "daily" ? "#e8775a" : "#6c8cff" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7M10 21h4" /></svg>
                </span>
                {r.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="time"
                  value={r.time}
                  onChange={(e) => updateReminder(r.id, { time: e.target.value })}
                  style={{ border: "1px solid #ece7df", borderRadius: 8, padding: "4px 8px", fontSize: 13, color: "#5a544a" }}
                />
                <Toggle on={r.enabled} onClick={() => updateReminder(r.id, { enabled: !r.enabled })} />
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#9a9389", margin: "0 4px 16px", lineHeight: 1.6 }}>
          iOS 网页通知能力有限，提醒以应用内提示为主；在支持的系统上会请求系统通知权限。
        </p>

        <div className="sec">数据</div>
        <div className="set-group">
          <div className="set-row" onClick={() => exportData("md")}>
            <div className="k">
              <span className="set-ic" style={{ background: "#f0b429" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
              </span>导出 Markdown
            </div>
            <div className="v">›</div>
          </div>
          <div className="set-row" onClick={() => exportData("json")}>
            <div className="k">
              <span className="set-ic" style={{ background: "#6c8cff" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
              </span>导出 JSON
            </div>
            <div className="v">›</div>
          </div>
          <div className="set-row">
            <div className="k">
              <span className="set-ic" style={{ background: "#34c759" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6-8.5" /><path d="M21 4v5h-5" /></svg>
              </span>本地存储
            </div>
            <div className="v">{count} 条记录</div>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#b3aca2", marginTop: 8 }}>Trace · 本地优先 · V1</p>
      </div>
      <TabBar />
      {toastNode}
    </div>
  );
}
