import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "zh";

const STORAGE_KEY = "ta-language";

/** Every user-facing string in the workbench chrome. */
const EN = {
  "nav.workbench": "Dashboard",
  "nav.setup": "Connect engine",
  "nav.about": "About the project",
  "nav.history": "History",
  "history.title": "Run history",
  "history.intro": "Past analyses from the connected engine, with status, decision and report readiness.",
  "history.refresh": "Refresh",
  "history.empty": "No past runs yet. Start an analysis on the workbench.",
  "history.unavailable": "The engine did not return a run list, so history is unavailable.",
  "history.colTicker": "Stock",
  "history.colDate": "Analysis date",
  "history.colStarted": "Started",
  "history.colStatus": "Status",
  "history.colDecision": "Decision",
  "history.colReports": "Reports",
  "history.reportsReady": "Ready",
  "history.reportsPending": "Preparing",
  "history.open": "Open report",
  "history.colDetails": "Details",
  "history.showDetails": "Show details",
  "history.hideDetails": "Hide details",
  "app.tagline": "Workplace decision support for multi-agent financial analysis",
  "app.language": "Language",
  "footer.disclaimer":
    "Decision-support prototype for academic use. Not investment advice and not an autonomous trading system.",

  "home.title": "Multi-Agent Financial Analysis",
  "home.intro": "An academic workbench for TradingAgents analysis, consensus, and reporting.",
  "home.progressTitle": "Analysis in progress",
  "home.progressBody":
    "Everything the engine has finished so far appears below and keeps updating. The portfolio manager's decision arrives when the debate is complete.",
  "home.step": "step",
  "home.of": "of",
  "home.workingOn": "Working on",
  "home.sampleNotice": "Showing a saved sample run so the workbench is demonstrable offline.",
  "home.engineOffline": "Your engine is not reachable right now.",
  "home.backToLive": "Back to live run",
  "home.newAnalysis": "New Analysis",
  "home.clear": "Clear",
  "home.sample": "Sample",
  "company.source": "Alpha Vantage",
  "company.price": "Last price",
  "company.change": "Day change",
  "company.marketCap": "Market cap",
  "company.pe": "P/E ratio",
  "company.dividend": "Dividend yield",
  "company.range52": "52-week range",
  "company.earnings": "Recent earnings (EPS)",
  "company.quarter": "Quarter",
  "company.reported": "Reported",
  "company.estimated": "Estimate",
  "company.surprise": "Surprise",



  "home.hideForm": "Hide Analysis detail",
  "home.showForm": "Show Analysis detail",
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

  "export.title": "Detail Report",
  "export.body":
    "Executive summary, bull/bear points, agent contributions and the full audit trail.",
  "export.markdown": "Markdown",
  "export.html": "HTML",
  "export.print": "Print / PDF",
  "export.open": "Detail Report",
  "export.openHint": "The full engine report opens on its own page.",
  "export.preparing": "Report in progress — exports unlock when it is ready.",
  "export.linkUnavailable": "Report ready, but its link is not available from this page.",

  "report.title": "Detailed report",
  "report.back": "Back to Dashboard",
  "report.original": "Original",
  "report.retry": "Try again",
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
  "form.ticker": "Stocks",
  "form.market": "Market",
  "form.marketHK": "HK",
  "form.marketOther": "Others",
  "form.hkDigits": "HK codes must be 1–4 digits (0–9).",
  "form.date": "Analysis date",
  "form.depth": "Research depth",
  "form.llm": "LLM",
  "form.llmUnavailable": "Using the engine's current LLM",
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
  "form.stages": "Research & decision stages",
  "form.stagesHint": "Unselected stages are skipped, which makes the run faster.",
  "form.researchDebate": "Bull & Bear Researcher",
  "form.riskDebate": "Aggressive + Conservative + Neutral Analyst",

  "lang.English": "English",
  "lang.Traditional Chinese": "Traditional Chinese",
  "lang.Simplified Chinese": "Simplified Chinese",

  "analyst.Market Analyst": "Market Analyst",
  "analyst.Sentiment Analyst": "Sentiment Analyst",
  "analyst.News Analyst": "News Analyst",
  "analyst.Fundamentals Analyst": "Fundamentals Analyst",

  "role.Bull Researcher": "Bull Researcher",
  "role.Bear Researcher": "Bear Researcher",
  "role.Research Manager": "Research Manager",
  "role.Trader": "Trader",
  "role.Aggressive Analyst": "Aggressive Analyst",
  "role.Conservative Analyst": "Conservative Analyst",
  "role.Neutral Analyst": "Neutral Analyst",
  "role.Portfolio Manager": "Portfolio Manager",
  "role.Company Of Interest": "Company of Interest",
  "role.Asset Type": "Asset Type",
  "role.Instrument Context": "Instrument Context",
  "role.Trade Date": "Trade Date",
  "role.Sender": "Sender",
  "role.Trader Investment Plan": "Trader Investment Plan",
  "role.Final Trade Decision": "Final Trade Decision",
  "role.Engine Log": "Engine Log",
  "team.Analyst Team": "Analyst Team",
  "team.Research Team": "Research Team",
  "team.Trading Team": "Trading Team",
  "team.Risk Team": "Risk Team",
  "team.Portfolio Management": "Portfolio Management",
  "team.Engine": "Engine",

  "agents.title": "Agent progress",
  "agents.count": "{n}/{m} agents",
  "agents.completed": "Completed",
  "agents.in progress": "In progress",
  "agents.pending": "Pending",
  "agents.error": "Error",
  "agents.notSelected": "Not selected",
  "agents.showDetails": "Show details",
  "agents.hideDetails": "Hide details",
  "agents.hideCompleted": "Hide completed",
  "agents.showCompleted": "Show completed",
  "agents.stageTiming": "Stage timing",
  "agents.slowest": "Slowest",
  "agents.started": "Started",
  "agents.ended": "Ended",
  "agents.duration": "Duration",
  "agents.notStarted": "Not started",
  "chart.range": "Range",
  "chart.all": "All",
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
  "decision.target": "Target",
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
  "charts.stancePending": "Available when agent stance data arrives.",
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
  "toast.rejected": "The engine rejected the run settings",
  "toast.unreachable": "Could not reach the engine",
  "toast.checkSetup": "Check the connection on the Connect engine page.",
  "toast.stopRequested": "Stop requested",
  "toast.stopFailed": "Could not stop the run",
  "toast.reportReady": "{name} report is ready",
  "toast.reportReadyBody": "Open it in the Agent reports section below.",
  "report.detailName": "Detail",
} as const;


export type TKey = keyof typeof EN;

const ZH: Record<TKey, string> = {
  "nav.workbench": "儀表板",
  "nav.setup": "連接引擎",
  "nav.about": "關於本專案",
  "nav.history": "歷史紀錄",
  "history.title": "分析紀錄",
  "history.intro": "已連接引擎的歷史分析，包含狀態、決策與報告完成情況。",
  "history.refresh": "重新整理",
  "history.empty": "尚無歷史分析，請於工作台開始一次分析。",
  "history.unavailable": "引擎未提供分析列表，因此無法顯示紀錄。",
  "history.colTicker": "股票",
  "history.colDate": "分析日期",
  "history.colStarted": "開始時間",
  "history.colStatus": "狀態",
  "history.colDecision": "決策",
  "history.colReports": "報告",
  "history.reportsReady": "已完成",
  "history.reportsPending": "準備中",
  "history.open": "開啟報告",
  "history.colDetails": "詳情",
  "history.showDetails": "顯示詳情",
  "history.hideDetails": "隱藏詳情",
  "app.tagline": "多代理人金融分析的決策支援工作平台",
  "app.language": "語言",
  "footer.disclaimer":
    "此為學術用途的決策支援原型，並非投資建議，亦非自動交易系統。",

  "home.title": "多代理人金融分析",
  "home.intro": "用於 TradingAgents 分析、共識與報告的學術工作台。",
  "home.progressTitle": "分析進行中",
  "home.progressBody":
    "引擎已完成的內容會即時顯示於下方並持續更新。投資組合經理的決策會在辯論完成後出現。",
  "home.step": "步驟",
  "home.of": "／共",
  "home.workingOn": "正在分析",
  "home.sampleNotice": "目前顯示已儲存的示範分析，讓工作台在離線時仍可展示。",
  "home.engineOffline": "目前無法連接您的引擎。",
  "home.backToLive": "返回即時分析",
  "home.newAnalysis": "新增分析",
  "home.clear": "清除",
  "home.sample": "示範",
  "company.source": "Alpha Vantage",
  "company.price": "最新價格",
  "company.change": "當日漲跌",
  "company.marketCap": "市值",
  "company.pe": "市盈率",
  "company.dividend": "股息率",
  "company.range52": "52週區間",
  "company.earnings": "近期業績（每股盈利）",
  "company.quarter": "季度",
  "company.reported": "實際",
  "company.estimated": "預期",
  "company.surprise": "差異",



  "home.hideForm": "隱藏分析細節",
  "home.showForm": "顯示分析細節",
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

  "export.title": "詳細報告",
  "export.body": "重點摘要、多空論點、各代理人貢獻與完整審計紀錄。",
  "export.markdown": "Markdown",
  "export.html": "HTML",
  "export.print": "列印／PDF",
  "export.open": "開啟詳細報告",
  "export.openHint": "完整的引擎報告會在獨立頁面開啟。",
  "export.preparing": "報告產生中 — 完成後即可匯出。",
  "export.linkUnavailable": "報告已完成，但此頁面無法使用其連結。",

  "report.title": "詳細報告",
  "report.back": "返回儀表板",
  "report.original": "原始檔",
  "report.retry": "重試",
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

  "common.show": "展開",
  "common.hide": "收合",

  "form.title": "新增分析",
  "form.subtitle": "選擇標的、日期、研究深度與參與的分析師。",
  "form.ticker": "股票",
  "form.market": "市場",
  "form.marketHK": "香港",
  "form.marketOther": "其他",
  "form.hkDigits": "港股代號必須為 1–4 位數字（0–9）。",
  "form.date": "分析日期",
  "form.depth": "研究深度",
  "form.llm": "LLM",
  "form.llmUnavailable": "使用引擎目前的 LLM",
  "form.depthShallow": "淺層 — 快速，辯論回合較少",
  "form.depthMedium": "中等 — 平衡的辯論",
  "form.depthDeep": "深入 — 延長辯論回合",
  "form.language": "報告語言",
  "form.languageHint": "引擎將以此語言撰寫報告。",
  "form.team": "分析師團隊",
  "form.selected": "已選 {n}／共 {m}",
  "form.run": "執行分析",
  "form.stop": "停止分析",
  "form.working": "代理人分析中…",
  "form.needAnalyst": "請至少選擇一位分析師。",
  "form.stages": "研究與決策階段",
  "form.stagesHint": "未選擇的階段會略過，分析速度更快。",
  "form.researchDebate": "看多及看空研究員",
  "form.riskDebate": "進取型 + 保守型 + 中立型風險分析師",

  "lang.English": "英文",
  "lang.Traditional Chinese": "繁體中文",
  "lang.Simplified Chinese": "簡體中文",

  "analyst.Market Analyst": "市場分析師",
  "analyst.Sentiment Analyst": "情緒分析師",
  "analyst.News Analyst": "新聞分析師",
  "analyst.Fundamentals Analyst": "基本面分析師",

  "role.Bull Researcher": "看多研究員",
  "role.Bear Researcher": "看空研究員",
  "role.Research Manager": "研究經理",
  "role.Trader": "交易員",
  "role.Aggressive Analyst": "進取型風險分析師",
  "role.Conservative Analyst": "保守型風險分析師",
  "role.Neutral Analyst": "中立型風險分析師",
  "role.Portfolio Manager": "投資組合經理",
  "role.Company Of Interest": "目標公司",
  "role.Asset Type": "資產類別",
  "role.Instrument Context": "金融工具背景",
  "role.Trade Date": "交易日期",
  "role.Sender": "發送者",
  "role.Trader Investment Plan": "交易員投資計劃",
  "role.Final Trade Decision": "最終交易決策",
  "role.Engine Log": "引擎記錄",
  "team.Analyst Team": "分析師團隊",
  "team.Research Team": "研究團隊",
  "team.Trading Team": "交易團隊",
  "team.Risk Team": "風險團隊",
  "team.Portfolio Management": "投資組合管理",
  "team.Engine": "引擎",

  "agents.title": "代理人進度",
  "agents.count": "{n}／{m} 位代理人",
  "agents.completed": "已完成",
  "agents.in progress": "進行中",
  "agents.pending": "等待中",
  "agents.error": "錯誤",
  "agents.notSelected": "未選取",
  "agents.showDetails": "顯示明細",
  "agents.hideDetails": "隱藏明細",
  "agents.hideCompleted": "隱藏已完成",
  "agents.showCompleted": "顯示已完成",
  "agents.stageTiming": "階段時間",
  "agents.slowest": "最慢",
  "agents.started": "開始",
  "agents.ended": "結束",
  "agents.duration": "耗時",
  "agents.notStarted": "尚未開始",
  "chart.range": "範圍",
  "chart.all": "全部",
  "stats.llmCalls": "LLM 呼叫",
  "stats.toolCalls": "工具呼叫",
  "stats.tokensIn": "輸入 Token",
  "stats.tokensOut": "輸出 Token",
  "stats.reports": "報告",
  "stats.runtime": "執行時間",

  "decision.title": "投資組合管理決策",
  "decision.subtitle": "已產生 · 對 {ticker} 的{action}建議",
  "decision.heading": "{ticker} — 投資組合管理決策",
  "decision.confidenceLine": "信心度 {c}% · 代理人共識：{k}",
  "decision.entry": "進場價",
  "decision.target": "目標價",
  "decision.stopLoss": "停損價",
  "decision.summary": "重點摘要",
  "decision.sizing": "部位配置",
  "decision.bull": "主要看多訊號",
  "decision.bear": "主要看空風險",
  "decision.signals": "共 {n} 項訊號",
  "decision.notAvailable": "未提供",

  "charts.priceTitle": "價格走勢與移動平均 — {ticker}",
  "charts.priceBody": "分析期間的收盤價與 10-EMA、20-SMA、50-SMA 比較。",
  "charts.stanceTitle": "代理人立場與共識",
  "charts.stanceBody": "依各代理人輸出推導的評分：−100 為極度看空，+100 為極度看多。",
  "charts.stancePending": "代理人立場資料到達後即可查看。",
  "charts.confTitle": "建議信心度",
  "charts.confBody": "信心度與一致性為依代理人立場推算的參考指標。",
  "charts.confidence": "信心度",
  "charts.bullAgents": "看多代理人",
  "charts.neutralAgents": "中立代理人",
  "charts.bearAgents": "看空代理人",
  "charts.consensus": "共識程度",

  "data.title": "圖表資料（{rows} 個交易日 · {series} 條序列）",
  "data.received": "已接收序列",
  "data.missing": "引擎未提供",
  "data.date": "日期",
  "data.tail": "顯示最近 20 個交易日，由新到舊。",

  "links.marketJson": "市場資料 JSON",
  "links.chartJson": "價格圖表 JSON",
  "links.chartPng": "價格圖表 PNG",
  "links.chartHtml": "價格圖表 HTML",
  "links.resultHtml": "結果 HTML",
  "links.legacyPng": "舊版圖表 PNG",
  "links.legacyHtml": "舊版圖表 HTML",

  "toast.started": "已在本機引擎啟動分析",
  "toast.rejected": "引擎拒絕了此次分析設定",
  "toast.unreachable": "無法連接引擎",
  "toast.checkSetup": "請於「連接引擎」頁面檢查連線設定。",
  "toast.stopRequested": "已送出停止要求",
  "toast.stopFailed": "無法停止此次分析",
  "toast.reportReady": "{name} 報告已完成",
  "toast.reportReadyBody": "可於下方「代理人報告」區開啟。",
  "report.detailName": "詳細",
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

  // Mirrored outside React so non-component code (toasts fired from data
  // loaders) can translate without adding a hook.
  activeLang = lang;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

let activeLang: Lang = "en";

/** Translate outside a component render. Prefer useT() inside components. */
export function translate(key: TKey): string {
  return DICTS[activeLang][key] ?? EN[key];
}

export function useLanguage(): LanguageValue {
  return useContext(LanguageContext);
}

export function useT(): (key: TKey) => string {
  return useContext(LanguageContext).t;
}


/** Fills {name} placeholders in a translated template. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

