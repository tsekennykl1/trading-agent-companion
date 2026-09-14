import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "zh";

const STORAGE_KEY = "ta-language";

/** Every user-facing string in the workbench chrome. */
const EN = {
  "nav.workbench": "Workbench",
  "nav.setup": "Connect engine",
  "nav.about": "About the project",
  "app.tagline": "Workplace decision support for multi-agent financial analysis",
  "app.language": "Language",
  "footer.disclaimer":
    "Decision-support prototype for academic use. Not investment advice and not an autonomous trading system.",

  "home.title": "Multi-agent analysis, in one workspace",
  "home.intro":
    "A dashboard, visual analytics and reporting layer over the TradingAgents framework — so a non-technical colleague can run an analysis, see how the agents disagreed, and take a memo to a meeting.",
  "home.progressTitle": "Analysis in progress",
  "home.progressBody":
    "Everything the engine has finished so far appears below and keeps updating. The portfolio manager's decision arrives when the debate is complete.",
  "home.step": "step",
  "home.of": "of",
  "home.workingOn": "Working on",
  "home.sampleNotice": "Showing a saved sample run so the workbench is demonstrable offline.",
  "home.engineOffline": "Your engine is not reachable right now.",
  "home.backToLive": "Back to live run",
  "home.runError": "The engine reported an error during this run.",
  "home.confidenceTitle": "Recommendation confidence",
  "home.confidenceBody": "Available once the run completes.",
  "home.pendingTitle": "Recommendation pending",
  "home.pendingBody":
    "Analyst teams are reviewing the evidence. The portfolio manager's decision will appear when their debate is complete.",

  "snapshot.title": "Market snapshot",
  "snapshot.sessions": "sessions",
  "snapshot.lastClose": "Last close",
  "snapshot.change": "Change",
  "snapshot.ema20": "EMA 20",
  "snapshot.ema50": "EMA 50",
  "snapshot.rsi14": "RSI 14",
  "snapshot.waitingMarket": "Waiting for market data from the engine…",
  "snapshot.waitingChart": "The price chart appears here as soon as the engine has published its data.",
  "snapshot.interactive": "Interactive",
  "snapshot.image": "Image",
  "snapshot.openImage": "Open image",
  "snapshot.artifacts": "Artifacts",

  "ind.title": "Technical analysis",
  "ind.selectAll": "Select all",
  "ind.all": "All",
  "ind.Overlays": "Overlays",
  "ind.Panels": "Panels",
  "ind.Annotations": "Annotations",

  "export.title": "Manager-facing report",
  "export.body":
    "Executive summary, bull/bear points, agent contributions and the full audit trail.",
  "export.markdown": "Markdown",
  "export.html": "HTML",
  "export.print": "Print / PDF",
  "export.open": "Open detailed report",
  "export.openHint": "The full engine report opens on its own page.",

  "report.title": "Detailed report",
  "report.back": "Back to workbench",
  "report.original": "Original",
  "report.loading": "Preparing report",
  "report.failed": "Could not load the formatted report",
  "report.available": "Available",
  "report.missing": "No detailed report is available yet. Run an analysis first.",

  "reports.title": "Agent reports",
  "reports.showAll": "Show All",
  "reports.hideAll": "Hide All",
  "reports.show": "Show",
  "reports.hide": "Hide",
  "reports.available": "Available",
  "reports.inProgress": "In progress",
  "reports.notAvailable": "Not available",
  "reports.none": "No report sections are available.",
  "reports.writing": "Reports are still being written by the agents.",
  "reports.produced": "No reports were produced for this run.",

  "common.show": "Show",
  "common.hide": "Hide",

  "form.title": "New analysis",
  "form.subtitle": "Choose the market, date, research depth, and specialists for this run.",
  "form.ticker": "Ticker",
  "form.date": "Analysis date",
  "form.depth": "Research depth",
  "form.depthShallow": "Shallow — quick, few debate rounds",
  "form.depthMedium": "Medium — balanced debate",
  "form.depthDeep": "Deep — extended debate rounds",
  "form.language": "Report language",
  "form.languageHint": "The engine writes its reports in this language.",
  "form.team": "Analyst team",
  "form.selected": "{n} of {m} selected",
  "form.run": "Run analysis",
  "form.stop": "Stop run",
  "form.working": "Agents are working…",
  "form.needAnalyst": "Select at least one analyst.",

  "lang.English": "English",
  "lang.Traditional Chinese": "Traditional Chinese",
  "lang.Simplified Chinese": "Simplified Chinese",

  "analyst.Market Analyst": "Market Analyst",
  "analyst.Sentiment Analyst": "Sentiment Analyst",
  "analyst.News Analyst": "News Analyst",
  "analyst.Fundamentals Analyst": "Fundamentals Analyst",

  "agents.title": "Agent progress",
  "agents.count": "{n}/{m} agents",
  "agents.completed": "Completed",
  "agents.in progress": "In progress",
  "agents.pending": "Pending",
  "agents.error": "Error",
  "agents.notSelected": "Not selected",
  "agents.showDetails": "Show details",
  "agents.hideDetails": "Hide details",
  "stats.llmCalls": "LLM calls",
  "stats.toolCalls": "Tool calls",
  "stats.tokensIn": "Tokens in",
  "stats.tokensOut": "Tokens out",
  "stats.reports": "Reports",
  "stats.runtime": "Runtime",

  "decision.title": "Portfolio management decision",
  "decision.subtitle": "Available · {action} recommendation for {ticker}",
  "decision.heading": "{ticker} — portfolio management decision",
  "decision.confidenceLine": "Confidence {c}% · {k} consensus across agents",
  "decision.entry": "Entry",
  "decision.stopLoss": "Stop loss",
  "decision.summary": "Executive summary",
  "decision.sizing": "Position sizing",
  "decision.bull": "Key bullish signals",
  "decision.bear": "Key bearish risks",
  "decision.signals": "{n} signals available",
  "decision.notAvailable": "Not available",

  "charts.priceTitle": "Price trend and moving averages — {ticker}",
  "charts.priceBody": "Close versus 10-EMA, 20-SMA and 50-SMA over the analysis window.",
  "charts.stanceTitle": "Agent stance and consensus",
  "charts.stanceBody":
    "Interpretive score derived from each agent's output: −100 fully bearish to +100 fully bullish.",
  "charts.confTitle": "Recommendation confidence",
  "charts.confBody": "Confidence and agreement are interpretive proxies computed from agent alignment.",
  "charts.confidence": "confidence",
  "charts.bullAgents": "Bullish agents",
  "charts.neutralAgents": "Neutral agents",
  "charts.bearAgents": "Bearish agents",
  "charts.consensus": "Consensus level",

  "data.title": "Chart data ({rows} sessions · {series} series)",
  "data.received": "Series received",
  "data.missing": "Not sent by the engine",
  "data.date": "Date",
  "data.tail": "Showing the 20 most recent sessions, newest first.",

  "links.marketJson": "Market data JSON",
  "links.chartJson": "Price chart JSON",
  "links.chartPng": "Price chart PNG",
  "links.chartHtml": "Price chart HTML",
  "links.resultHtml": "Result HTML",
  "links.legacyPng": "Legacy chart PNG",
  "links.legacyHtml": "Legacy chart HTML",

  "toast.started": "Analysis started on your local engine",
  "toast.reportReady": "{name} report is ready",
  "toast.reportReadyBody": "Open it in the Agent reports section below.",
} as const;


export type TKey = keyof typeof EN;

const ZH: Record<TKey, string> = {
  "nav.workbench": "分析工作台",
  "nav.setup": "連接引擎",
  "nav.about": "關於本專案",
  "app.tagline": "多代理人金融分析的決策支援工作平台",
  "app.language": "語言",
  "footer.disclaimer":
    "此為學術用途的決策支援原型，並非投資建議，亦非自動交易系統。",

  "home.title": "多代理人分析，集中於同一工作台",
  "home.intro":
    "以 TradingAgents 框架為基礎的儀表板、視覺化分析與報告層，讓非技術同事也能執行分析、了解各代理人的分歧，並帶一份備忘錄開會。",
  "home.progressTitle": "分析進行中",
  "home.progressBody":
    "引擎已完成的內容會即時顯示於下方並持續更新。投資組合經理的決策會在辯論完成後出現。",
  "home.step": "步驟",
  "home.of": "／共",
  "home.workingOn": "正在分析",
  "home.sampleNotice": "目前顯示已儲存的示範分析，讓工作台在離線時仍可展示。",
  "home.engineOffline": "目前無法連接您的引擎。",
  "home.backToLive": "返回即時分析",
  "home.runError": "引擎在此次分析中回報了錯誤。",
  "home.confidenceTitle": "建議信心度",
  "home.confidenceBody": "分析完成後即可查看。",
  "home.pendingTitle": "建議尚未產生",
  "home.pendingBody":
    "分析師團隊正在檢視證據。辯論完成後將顯示投資組合經理的決策。",

  "snapshot.title": "市場概覽",
  "snapshot.sessions": "個交易日",
  "snapshot.lastClose": "最新收盤",
  "snapshot.change": "漲跌幅",
  "snapshot.ema20": "EMA 20",
  "snapshot.ema50": "EMA 50",
  "snapshot.rsi14": "RSI 14",
  "snapshot.waitingMarket": "正在等待引擎提供市場資料…",
  "snapshot.waitingChart": "引擎發佈資料後，價格圖表會立即顯示於此。",
  "snapshot.interactive": "互動圖表",
  "snapshot.image": "圖片",
  "snapshot.openImage": "開啟圖片",
  "snapshot.artifacts": "產出檔案",

  "ind.title": "技術分析",
  "ind.selectAll": "全選",
  "ind.all": "全選",
  "ind.Overlays": "疊加線",
  "ind.Panels": "副圖",
  "ind.Annotations": "標註",

  "export.title": "管理層報告",
  "export.body": "重點摘要、多空論點、各代理人貢獻與完整審計紀錄。",
  "export.markdown": "Markdown",
  "export.html": "HTML",
  "export.print": "列印／PDF",
  "export.open": "開啟詳細報告",
  "export.openHint": "完整的引擎報告會在獨立頁面開啟。",

  "report.title": "詳細報告",
  "report.back": "返回工作台",
  "report.original": "原始檔",
  "report.loading": "報告準備中",
  "report.failed": "無法載入已排版的報告",
  "report.available": "可供閱讀",
  "report.missing": "目前尚無詳細報告，請先執行一次分析。",

  "reports.title": "代理人報告",
  "reports.showAll": "全部展開",
  "reports.hideAll": "全部收合",
  "reports.show": "展開",
  "reports.hide": "收合",
  "reports.available": "已完成",
  "reports.inProgress": "產生中",
  "reports.notAvailable": "未提供",
  "reports.none": "目前沒有任何報告章節。",
  "reports.writing": "代理人仍在撰寫報告。",
  "reports.produced": "此次分析沒有產生報告。",
};

const DICTS: Record<Lang, Record<TKey, string>> = { en: EN, zh: ZH };

interface LanguageValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey) => string;
}

const LanguageContext = createContext<LanguageValue>({
  lang: "en",
  setLang: () => undefined,
  t: (key) => EN[key],
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start in English so the server and the first client render agree.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
  }, [lang]);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      setLang: (next) => {
        setLangState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Private browsing — the choice simply does not persist.
        }
      },
      t: (key) => DICTS[lang][key] ?? EN[key],
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  return useContext(LanguageContext);
}

export function useT(): (key: TKey) => string {
  return useContext(LanguageContext).t;
}
