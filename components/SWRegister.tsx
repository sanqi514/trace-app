"use client";
import { useEffect } from "react";

/** 注册 Service Worker（仅生产环境 + 浏览器支持时），实现离线可用与秒开 */
export default function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // 开发环境（localhost 的 dev server）不注册，避免缓存干扰热更新
    if (process.env.NODE_ENV !== "production") return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* 注册失败不影响主流程 */
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
