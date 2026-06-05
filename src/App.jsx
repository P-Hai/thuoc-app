import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDLzLaOTLDxbIt9bSRGEelyGZUHwI-qOT0",
  authDomain: "thuoc-me.firebaseapp.com",
  databaseURL: "https://thuoc-me-default-rtdb.firebaseio.com",
  projectId: "thuoc-me",
  storageBucket: "thuoc-me.firebasestorage.app",
  messagingSenderId: "347234487546",
  appId: "1:347234487546:web:2a06a45ad27f2565fb0d43",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const MEDICINES = [
  { id: "sang", label: "🌅 Buổi Sáng", time: "08:00", hour: 8, minute: 0 },
  { id: "toi",  label: "🌙 Buổi Tối",  time: "18:40", hour: 18, minute: 40 },
];

const today = () => {
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(iso).toLocaleString("vi-VN");
};

const sendNotif = (title, body) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "https://cdn.jsdelivr.net/npm/twemoji@14/assets/72x72/1f48a.png",
      tag: "medicine-reminder",
      renotify: true,
    });
  }
};

export default function App() {
  const [status, setStatus]         = useState({});
  const [loading, setLoading]       = useState(true);
  const [animating, setAnimating]   = useState(null);
  const [view, setView]             = useState("home");
  const [history, setHistory]       = useState([]);
  const [currentDay, setCurrentDay] = useState(today());
  const [notifPerm, setNotifPerm]   = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const [showBanner, setShowBanner] = useState(false);
  const alreadyNotified = useRef({});
  const prevStatus      = useRef({});

  // ── Detect ngày mới mỗi 30s ───────────────
  useEffect(() => {
    const iv = setInterval(() => {
      const newDay = today();
      if (newDay !== currentDay) {
        setCurrentDay(newDay);
        setStatus({});
        prevStatus.current = {};
        alreadyNotified.current = {};
      }
    }, 30000);
    return () => clearInterval(iv);
  }, [currentDay]);

  // ── Realtime listener ──────────────────────
  useEffect(() => {
    setLoading(true);
    const todayRef = ref(db, `medicine/${currentDay}`);
    const unsub = onValue(todayRef, (snap) => {
      const val = snap.val() || {};
      MEDICINES.forEach((m) => {
        if (val[m.id] && !prevStatus.current[m.id]) {
          sendNotif("✅ Mạ đã uống thuốc!", `${m.label} lúc ${timeAgo(val[m.id]?.takenAt)} 🎉`);
        }
      });
      prevStatus.current = val;
      setStatus(val);
      checkOverdue(val);
      setLoading(false);
    });
    return () => unsub();
  }, [currentDay]);

  // ── Show permission banner ─────────────────
  useEffect(() => {
    if (Notification.permission === "default") setShowBanner(true);
  }, []);

  // ── Overdue checker every 60s ──────────────
  useEffect(() => {
    const iv = setInterval(() => checkOverdue(prevStatus.current), 60000);
    return () => clearInterval(iv);
  }, []);

  const checkOverdue = (s) => {
    const now = new Date();
    MEDICINES.forEach((m) => {
      if (s[m.id]) return;
      const scheduled = new Date();
      scheduled.setHours(m.hour, m.minute || 0, 0, 0);
      const diffMin = (now - scheduled) / 60000;
      const key = `${currentDay}_${m.id}`;
      if (diffMin >= 30 && diffMin < 180 && !alreadyNotified.current[key]) {
        alreadyNotified.current[key] = true;
        sendNotif(
          "⚠️ Mạ chưa uống thuốc!",
          `${m.label} (${m.time}) đã quá 30 phút. Nhắc mạ nhé! 💊`
        );
      }
    });
  };

  // ── Load 7-day history ─────────────────────
  const loadHistory = () => {
    const histRef = ref(db, "medicine");
    onValue(histRef, (snap) => {
      const all = snap.val() || {};
      const entries = Object.entries(all)
        .filter(([d]) => d !== currentDay)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 7)
        .map(([date, data]) => ({ date, data }));
      setHistory(entries);
    }, { onlyOnce: true });
  };

  // ── Toggle medicine ────────────────────────
  const toggle = async (id) => {
    const updated = { ...status };
    if (updated[id]) {
      delete updated[id];
    } else {
      updated[id] = { takenAt: new Date().toISOString() };
      setAnimating(id);
      setTimeout(() => setAnimating(null), 800);
    }
    await set(ref(db, `medicine/${currentDay}`), updated);
  };

  const requestNotif = async () => {
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    setShowBanner(false);
    if (perm === "granted")
      sendNotif("✅ Đã bật thông báo!", "Cả nhà sẽ nhận nhắc khi mạ quên uống thuốc 💊");
  };

  const takenCount = MEDICINES.filter((m) => status[m.id]).length;
  const allDone    = takenCount === MEDICINES.length;
  const pct        = Math.round((takenCount / MEDICINES.length) * 100);

  const isOverdue = (m) => {
    if (status[m.id]) return false;
    const scheduled = new Date();
    scheduled.setHours(m.hour, m.minute || 0, 0, 0);
    return (new Date() - scheduled) / 60000 >= 30;
  };

  return (
    <div style={s.root}>
      <div style={s.container}>

        {/* Permission Banner */}
        {showBanner && (
          <div style={s.permBanner}>
            <div style={s.permRow}>
              <span style={{ fontSize: 24 }}>🔔</span>
              <div>
                <div style={{ fontWeight: 700 }}>Bật thông báo cho cả nhà</div>
                <div style={{ fontSize: 13, color: "#92400e", marginTop: 2 }}>
                  Mỗi người mở web và bấm đồng ý để nhận nhắc khi mạ quên
                </div>
              </div>
            </div>
            <div style={s.permBtns}>
              <button onClick={requestNotif} style={s.btnYes}>Bật ngay 🔔</button>
              <button onClick={() => setShowBanner(false)} style={s.btnNo}>Để sau</button>
            </div>
          </div>
        )}

        {/* Notif status pill */}
        {!showBanner && (
          <div
            onClick={notifPerm !== "granted" ? requestNotif : undefined}
            style={{
              ...s.pill,
              background: notifPerm === "granted" ? "#dcfce7" : "#fee2e2",
              color: notifPerm === "granted" ? "#15803d" : "#b91c1c",
            }}
          >
            {notifPerm === "granted" ? "🔔 Thông báo đã bật" : "🔕 Chưa bật thông báo — bấm để bật"}
          </div>
        )}

        {/* Header */}
        <div style={s.header}>
          <div style={{ fontSize: 52 }}>💊</div>
          <h1 style={s.title}>Nhắc Uống Thuốc</h1>
          <p style={s.date}>
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </p>
        </div>

        {/* Progress */}
        <div style={s.card0}>
          <div style={s.progressLabel}>
            <span style={s.pText}>{takenCount}/{MEDICINES.length} lần hôm nay</span>
            <span style={{ ...s.pText, fontWeight: 700, color: allDone ? "#22c55e" : "#f97316" }}>
              {allDone ? "✅ Hoàn thành!" : `${pct}%`}
            </span>
          </div>
          <div style={s.track}>
            <div style={{
              ...s.fill,
              width: `${pct}%`,
              background: allDone
                ? "linear-gradient(90deg,#22c55e,#16a34a)"
                : "linear-gradient(90deg,#f97316,#ef4444)",
            }} />
          </div>
        </div>

        {/* Cards */}
        {loading ? (
          <div style={s.loading}>⏳ Đang kết nối...</div>
        ) : (
          <div style={s.cards}>
            {MEDICINES.map((m) => {
              const taken   = !!status[m.id];
              const overdue = isOverdue(m);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  style={{
                    ...s.card,
                    background: taken
                      ? "linear-gradient(135deg,#dcfce7,#bbf7d0)"
                      : overdue
                      ? "linear-gradient(135deg,#fff7ed,#fee2e2)"
                      : "white",
                    border: taken
                      ? "3px solid #22c55e"
                      : overdue
                      ? "3px solid #ef4444"
                      : "3px solid #e5e7eb",
                    transform: animating === m.id ? "scale(0.95)" : "scale(1)",
                  }}
                >
                  <span style={{ fontSize: 30 }}>
                    {taken ? "✅" : overdue ? "⚠️" : "⬜"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={s.medLabel}>{m.label}</div>
                    <div style={{ fontSize: 13, color: overdue && !taken ? "#ef4444" : "#6b7280" }}>
                      {taken
                        ? `Đã uống ${timeAgo(status[m.id]?.takenAt)}`
                        : overdue
                        ? `Quá giờ! Nên uống lúc ${m.time}`
                        : `Uống lúc ${m.time}`}
                    </div>
                  </div>
                  <div style={{
                    ...s.badge,
                    background: taken ? "#22c55e" : overdue ? "#ef4444" : "#d1d5db",
                    color: taken || overdue ? "white" : "#6b7280",
                  }}>
                    {taken ? "Xong" : overdue ? "Trễ!" : "Chưa"}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {allDone && (
          <div style={s.done}>🎉 Mạ đã uống thuốc đầy đủ hôm nay!</div>
        )}

        {/* History */}
        <button
          onClick={() => {
            if (view === "home") { setView("history"); loadHistory(); }
            else setView("home");
          }}
          style={s.histBtn}
        >
          {view === "home" ? "📅 Xem lịch sử 7 ngày" : "⬅ Quay lại"}
        </button>

        {view === "history" && (
          <div style={s.histBox}>
            <h2 style={s.histTitle}>Lịch sử uống thuốc</h2>
            {history.length === 0 ? (
              <div style={s.loading}>Chưa có dữ liệu ngày trước.</div>
            ) : history.map((h) => {
              const cnt = MEDICINES.filter((m) => h.data[m.id]).length;
              return (
                <div key={h.date} style={s.histRow}>
                  <span style={s.histDate}>
                    {new Date(h.date + "T00:00:00+07:00").toLocaleDateString("vi-VN", {
                      weekday: "short", day: "numeric", month: "numeric",
                    })}
                  </span>
                  <div style={s.dots}>
                    {MEDICINES.map((m) => (
                      <span key={m.id} style={{
                        ...s.dot,
                        background: h.data[m.id] ? "#22c55e" : "#e5e7eb",
                      }} />
                    ))}
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: cnt === MEDICINES.length ? "#22c55e" : cnt > 0 ? "#f97316" : "#ef4444",
                  }}>
                    {cnt}/{MEDICINES.length}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

const s = {
  root:          { minHeight: "100vh", background: "linear-gradient(160deg,#fff7ed,#fef3c7 50%,#ecfdf5)", fontFamily: "'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: "16px 16px 48px" },
  container:     { width: "100%", maxWidth: 480 },
  permBanner:    { background: "#fef3c7", border: "2px solid #fbbf24", borderRadius: 16, padding: "14px 16px", marginBottom: 12 },
  permRow:       { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 },
  permBtns:      { display: "flex", gap: 8 },
  btnYes:        { flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#f59e0b", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  btnNo:         { padding: "10px 14px", borderRadius: 10, border: "1.5px solid #d1d5db", background: "white", color: "#6b7280", fontSize: 13, cursor: "pointer" },
  pill:          { display: "inline-block", padding: "7px 14px", borderRadius: 99, fontSize: 13, fontWeight: 600, marginBottom: 12, cursor: "pointer" },
  header:        { textAlign: "center", marginBottom: 18 },
  title:         { fontSize: 26, fontWeight: 800, color: "#1f2937", margin: "4px 0" },
  date:          { fontSize: 14, color: "#6b7280", margin: 0, textTransform: "capitalize" },
  card0:         { background: "white", borderRadius: 20, padding: "14px 18px", marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,.07)" },
  progressLabel: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  pText:         { fontSize: 14, color: "#374151", fontWeight: 500 },
  track:         { height: 13, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" },
  fill:          { height: "100%", borderRadius: 99, transition: "width .5s ease" },
  loading:       { textAlign: "center", padding: 32, color: "#6b7280", fontSize: 16 },
  cards:         { display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 },
  card:          { display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderRadius: 20, cursor: "pointer", transition: "transform .15s", boxShadow: "0 2px 12px rgba(0,0,0,.07)", width: "100%", textAlign: "left" },
  medLabel:      { fontSize: 19, fontWeight: 700, color: "#111827", marginBottom: 2 },
  badge:         { padding: "5px 12px", borderRadius: 99, fontSize: 13, fontWeight: 700, flexShrink: 0 },
  done:          { background: "linear-gradient(135deg,#dcfce7,#bbf7d0)", border: "2px solid #22c55e", borderRadius: 16, padding: "14px", textAlign: "center", fontSize: 16, fontWeight: 600, color: "#15803d", marginBottom: 14 },
  histBtn:       { width: "100%", padding: "13px", borderRadius: 14, border: "2px solid #d1d5db", background: "white", fontSize: 15, fontWeight: 600, color: "#374151", cursor: "pointer", marginBottom: 14 },
  histBox:       { background: "white", borderRadius: 20, padding: "18px", boxShadow: "0 2px 12px rgba(0,0,0,.07)", marginBottom: 14 },
  histTitle:     { fontSize: 17, fontWeight: 700, color: "#1f2937", margin: "0 0 14px" },
  histRow:       { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f3f4f6" },
  histDate:      { fontSize: 13, color: "#374151", width: 75, flexShrink: 0, fontWeight: 500 },
  dots:          { display: "flex", gap: 8, flex: 1 },
  dot:           { width: 20, height: 20, borderRadius: "50%", display: "inline-block" },
  footer:        { textAlign: "center", fontSize: 11, color: "#9ca3af", margin: 0 },
};