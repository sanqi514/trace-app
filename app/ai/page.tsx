"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import { useToast, getWeekRange, formatTime } from "@/components/util";
import {
  getRecords, getReflections, getWeeklyReports,
  saveReflection, saveWeeklyReport, getSettings, uid,
} from "@/lib/store";
import { generateReflection, generateWeekly, previewReflectionPayload } from "@/lib/llm";
import { buildWeeklyPrompt } from "@/lib/templates";
import { REFLECTION_TEMPLATES } from "@/lib/templates";
import {
  TraceRecord, Reflection, WeeklyReport, ReflectionTemplate, TYPE_META,
} from "@/lib/types";

type Step = "idle" | "pickRecords" | "pickTemplate" | "preview" | "weeklyPreview";

export default function AIPage() {
  const router = useRouter();
  const { showToast, toastNode } = useToast();

  const [records, setRecords] = useState<TraceRecord[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [weeklies, setWeeklies] = useState<WeeklyReport[]>([]);

  const [step, setStep] = useState<Step>("idle");
  const [selected, setSelected] = useState<string[]>([]);
  const [template, setTemplate] = useState<ReflectionTemplate>("A");
  const [previewText, setPreviewText] = useState("");
  const [loading, setLoading] = useState(false);

  const reload = () => {
    getRecords().then(setRecords);
    getReflections().then(setReflections);
    getWeeklyReports().then(setWeeklies);
  };
  useEffect(reload, []);

  const week = useMemo(() => getWeekRange(), []);
  const weekRecords = useMemo(
    () => records.filter((r) => r.createdAt >= week.start && r.createdAt <= week.end),
    [records, week]
  );

  const toRecPayload = (recs: TraceRecord[]) =>
    recs.map((r) => ({ text: r.text, createdAt: r.createdAt, type: TYPE_META[r.type].label }));

  // ---- 复盘流程 ----
  const startReflection = () => {
    if (records.length === 0) return showToast("还没有记录可复盘");
    setSelected([]);
    setStep("pickRecords");
  };
  const toggleSel = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const goTemplate = () => {
    if (selected.length === 0) return showToast("请至少选 1 条记录");
    setStep("pickTemplate");
  };

  const goPreview = async () => {
    const s = await getSettings();
    const recs = records.filter((r) => selected.includes(r.id));
    const payload = previewReflectionPayload(template, toRecPayload(recs));
    setPreviewText(payload);
    if (s.previewBeforeSend) setStep("preview");
    else confirmReflection();
  };

  const confirmReflection = async () => {
    const s = await getSettings();
    if (!s.aiEnabled) return showToast("AI 已关闭，请到设置开启");
    setLoading(true);
    try {
      const recs = records.filter((r) => selected.includes(r.id));
      const { title, sections } = await generateReflection(template, toRecPayload(recs));
      const refl: Reflection = {
        id: uid(), createdAt: Date.now(), template, title,
        sourceRecordIds: selected, sections,
      };
      await saveReflection(refl);
      setStep("idle");
      reload();
      showToast("复盘已生成并保存");
    } catch (e: any) {
      showToast(e.message || "生成失败");
    } finally {
      setLoading(false);
    }
  };

  // ---- 周报流程 ----
  const startWeekly = async () => {
    if (weekRecords.length === 0) return showToast("本周还没有记录");
    const s = await getSettings();
    const payload = buildWeeklyPrompt(week.label, toRecPayload(weekRecords));
    setPreviewText(payload);
    if (s.previewBeforeSend) setStep("weeklyPreview");
    else confirmWeekly();
  };

  const confirmWeekly = async () => {
    const s = await getSettings();
    if (!s.aiEnabled) return showToast("AI 已关闭，请到设置开启");
    setLoading(true);
    try {
      const res = await generateWeekly(week.label, toRecPayload(weekRecords));
      const report: WeeklyReport = {
        id: uid(), createdAt: Date.now(), weekRange: week.label,
        sourceCount: weekRecords.length, ...res,
      };
      await saveWeeklyReport(report);
      setStep("idle");
      reload();
      showToast("本周总结已生成");
    } catch (e: any) {
      showToast(e.message || "生成失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="app-body">
        <div className="h-row">
          <div>
            <h2>AI 整理</h2>
            <div className="date">手动触发 · 数据本地优先</div>
          </div>
        </div>

        <div className="ai-hero">
          <h3>把零散记录变成结构化复盘</h3>
          <p>选择记录 → 选模板 → 发送前预览 → 生成。原始数据始终留在本地，仅本次所需文本会发送给你配置的模型。</p>
        </div>

        <div className="ai-actions">
          <button className="ai-act" onClick={startReflection}>
            <div className="ic a">
              <svg viewBox="0 0 24 24" fill="none" stroke="#e8775a" strokeWidth="2">
                <path d="M9 11l3 3 8-8M4 12v6a2 2 0 0 0 2 2h12" />
              </svg>
            </div>
            <h4>生成复盘</h4>
            <p>单条 / 多条合并，模板 A·B 可选</p>
          </button>
          <button className="ai-act" onClick={startWeekly}>
            <div className="ic b">
              <svg viewBox="0 0 24 24" fill="none" stroke="#6c8cff" strokeWidth="2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 9h18M8 14h5" />
              </svg>
            </div>
            <h4>本周总结</h4>
            <p>本周 {weekRecords.length} 条 · 灵感/复盘/做了啥/状态</p>
          </button>
        </div>

        <div className="sec">最近的 AI 产出</div>
        {reflections.length === 0 && weeklies.length === 0 ? (
          <div className="empty">还没有 AI 产出。<br />选择记录生成你的第一份结构化复盘吧。</div>
        ) : (
          <>
            {weeklies.map((w) => (
              <div key={w.id} className="card" onClick={() => router.push(`/ai/weekly/${w.id}`)} style={{ cursor: "pointer" }}>
                <div className="top">
                  <span className="tag-type t-idea">● 周报</span>
                  <span className="time">{w.weekRange}</span>
                </div>
                <div className="txt">本周总结 · 来源 {w.sourceCount} 条记录</div>
              </div>
            ))}
            {reflections.map((r) => (
              <div key={r.id} className="card" onClick={() => router.push(`/ai/reflection/${r.id}`)} style={{ cursor: "pointer" }}>
                <div className="top">
                  <span className="tag-type t-review">● 复盘 · 模板{r.template}</span>
                  <span className="time">{formatTime(r.createdAt)}</span>
                </div>
                <div className="txt">{r.title}</div>
                <div className="meta"><span className="pill">来源 {r.sourceRecordIds.length} 条记录</span></div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 选择记录 */}
      {step === "pickRecords" && (
        <div className="sheet-mask" onClick={() => setStep("idle")}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bar" />
            <h3>选择要复盘的记录</h3>
            <p className="warn">可选单条或多条；多条会合并为一份复盘。</p>
            <div style={{ overflowY: "auto", flex: 1, marginBottom: 14 }}>
              {records.map((r) => (
                <div key={r.id} className="card" style={{ marginBottom: 9 }} onClick={() => toggleSel(r.id)}>
                  <div className="top">
                    <span className={`tag-type t-${r.type}`}>● {TYPE_META[r.type].label}</span>
                    <span style={{ fontSize: 18 }}>{selected.includes(r.id) ? "✅" : "⬜️"}</span>
                  </div>
                  <div className="txt" style={{ fontSize: 13 }}>{r.text || "（语音未转写）"}</div>
                </div>
              ))}
            </div>
            <div className="sheet-btns">
              <div className="sec-b" onClick={() => setStep("idle")}>取消</div>
              <button className="pri-b" onClick={goTemplate}>下一步（已选 {selected.length}）</button>
            </div>
          </div>
        </div>
      )}

      {/* 选择模板 */}
      {step === "pickTemplate" && (
        <div className="sheet-mask" onClick={() => setStep("idle")}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bar" />
            <h3>选择复盘模板</h3>
            <div style={{ marginBottom: 14 }}>
              {(["A", "B"] as ReflectionTemplate[]).map((t) => (
                <div
                  key={t}
                  className="rfl-block"
                  style={{ cursor: "pointer", borderColor: template === t ? "#e8775a" : undefined, background: template === t ? "#fff7f4" : "#fff" }}
                  onClick={() => setTemplate(t)}
                >
                  <div className="step">
                    <div className="num" style={{ background: template === t ? "#e8775a" : "#c9c1b6" }}>{t}</div>
                    <h4>{REFLECTION_TEMPLATES[t].name}</h4>
                  </div>
                  <p style={{ fontSize: 13, color: "#8c857b" }}>{REFLECTION_TEMPLATES[t].desc}</p>
                </div>
              ))}
            </div>
            <div className="sheet-btns">
              <div className="sec-b" onClick={() => setStep("pickRecords")}>上一步</div>
              <button className="pri-b" onClick={goPreview}>下一步</button>
            </div>
          </div>
        </div>
      )}

      {/* 发送前预览：复盘 */}
      {step === "preview" && (
        <div className="sheet-mask" onClick={() => !loading && setStep("idle")}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bar" />
            <h3>发送前预览</h3>
            <p className="warn">以下内容将发送至你配置的模型用于生成复盘。音频不会上传，仅发送文本。</p>
            <div className="send-box">{previewText}</div>
            <div className="info">🔒 仅本次发送 · 经 Vercel 代理转发 · 音频不上传</div>
            <div className="sheet-btns">
              <div className="sec-b" onClick={() => !loading && setStep("pickTemplate")}>取消</div>
              <button className="pri-b" onClick={confirmReflection} disabled={loading}>
                {loading ? <span className="spinner" /> : "确认发送"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 发送前预览：周报 */}
      {step === "weeklyPreview" && (
        <div className="sheet-mask" onClick={() => !loading && setStep("idle")}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bar" />
            <h3>发送前预览 · 本周总结</h3>
            <p className="warn">将发送本周 {weekRecords.length} 条记录的文本用于生成周报。音频不上传。</p>
            <div className="send-box">{previewText}</div>
            <div className="info">🔒 仅本次发送 · 经 Vercel 代理转发</div>
            <div className="sheet-btns">
              <div className="sec-b" onClick={() => !loading && setStep("idle")}>取消</div>
              <button className="pri-b" onClick={confirmWeekly} disabled={loading}>
                {loading ? <span className="spinner" /> : "确认发送"}
              </button>
            </div>
          </div>
        </div>
      )}

      <TabBar />
      {toastNode}
    </div>
  );
}
