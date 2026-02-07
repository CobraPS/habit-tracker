import { useEffect, useMemo, useState } from "react";
import { getDB, todayISO, isScheduledToday } from "./db";
import { ensureNotificationsEnabled, showHabitNotification } from "./notifications";
import CalendarView from "./CalendarView";


function uid() {
  return crypto.randomUUID();
}

async function loadAll() {
  const db = await getDB();
  const habits = await db.getAll("habits");
  return habits.sort((a, b) => a.createdAt - b.createdAt);
}

async function getLog(habitId, date) {
  const db = await getDB();
  return db.get("logs", `${habitId}:${date}`);
}

async function setLog(habitId, date, done) {
  const db = await getDB();
  const key = `${habitId}:${date}`;
  if (!done) {
    await db.delete("logs", key);
    return;
  }
  await db.put("logs", { key, habitId, date, done: true, ts: Date.now() });
}

async function getSettings() {
  const db = await getDB();
  const s = await db.get("settings", "global");
  return s?.value ?? { reminderTime: "09:00" };
}

async function setSettings(value) {
  const db = await getDB();
  await db.put("settings", { key: "global", value });
}

function timeToMsUntilNext(timeHHMM) {
  const [hh, mm] = timeHHMM.split(":").map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hh, mm, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export default function App() {
  const [habits, setHabits] = useState([]);
  const [doneMap, setDoneMap] = useState({});
  const [name, setName] = useState("");
  const [notifStatus, setNotifStatus] = useState(null);
  const [settings, setSettingsState] = useState({ reminderTime: "09:00" });
  const [selectedHabitId, setSelectedHabitId] = useState("");


  const today = useMemo(() => todayISO(), []);

  const todaysHabits = useMemo(
    () => habits.filter((h) => isScheduledToday(h)),
    [habits]
  );


    useEffect(() => {
  (async () => {
    const hs = await loadAll();
    setHabits(hs);
    setSettingsState(await getSettings());
    if (hs.length > 0) setSelectedHabitId(hs[0].id);
  })();
}, []);


  useEffect(() => {
    (async () => {
      const map = {};
      for (const h of todaysHabits) {
        const log = await getLog(h.id, today);
        map[h.id] = !!log;
      }
      setDoneMap(map);
    })();
  }, [todaysHabits, today]);

  // Listen for notification action messages from service worker
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    navigator.serviceWorker.addEventListener("message", async (event) => {
      const msg = event.data;
      if (msg?.type === "NOTIF_ACTION" && msg.action === "done" && msg.habitId) {
        await setLog(msg.habitId, todayISO(), true);
        // Refresh today state
        const log = await getLog(msg.habitId, todayISO());
        setDoneMap((m) => ({ ...m, [msg.habitId]: !!log }));
      }
    });
  }, []);

  // Daily reminder automation (simple in-app scheduler)
  useEffect(() => {
    let t1, t2;
    (async () => {
      // ask permission once user opts in
      // schedule a timeout to fire next reminder, then repeat daily
      const ms = timeToMsUntilNext(settings.reminderTime);
      t1 = setTimeout(async () => {
        const scheduled = (await loadAll()).filter(isScheduledToday);
        for (const h of scheduled) await showHabitNotification(h);
        t2 = setInterval(async () => {
          const scheduled2 = (await loadAll()).filter(isScheduledToday);
          for (const h of scheduled2) await showHabitNotification(h);
        }, 24 * 60 * 60 * 1000);
      }, ms);
    })();
    return () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
  }, [settings.reminderTime]);

  async function addHabit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const habit = {
      id: uid(),
      name: trimmed,
      createdAt: Date.now(),
      schedule: { type: "daily" },
    };

    const db = await getDB();
    await db.put("habits", habit);
    setHabits(await loadAll());
    setName("");
  }

  async function toggleDone(habitId) {
    const next = !doneMap[habitId];
    await setLog(habitId, today, next);
    setDoneMap((m) => ({ ...m, [habitId]: next }));
  }

  async function enableNotifs() {
    const res = await ensureNotificationsEnabled();
    setNotifStatus(res);
  }

  async function updateReminderTime(t) {
    const next = { ...settings, reminderTime: t };
    setSettingsState(next);
    await setSettings(next);
  }

  return (
    <div style={{ maxWidth: 680, margin: "24px auto", padding: 16, fontFamily: "system-ui, Arial" }}>
      <h2 style={{ margin: 0 }}>Habit Tracker</h2>
      <p style={{ marginTop: 8 }}>Today: {today}</p>

      <form onSubmit={addHabit} style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New habit (e.g., Study 10 minutes)"
          style={{ flex: 1, padding: 10 }}
        />
        <button type="submit" style={{ padding: "10px 14px" }}>Add</button>
      </form>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <button onClick={enableNotifs} style={{ padding: "8px 12px" }}>
          Enable notifications
        </button>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Reminder time
          <input
            type="time"
            value={settings.reminderTime}
            onChange={(e) => updateReminderTime(e.target.value)}
          />
        </label>
        {notifStatus && (
          <span>
            Notifications: {notifStatus.ok ? "enabled" : `not enabled (${notifStatus.reason})`}
          </span>
        )}
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
        {todaysHabits.length === 0 ? (
          <p style={{ margin: 0 }}>No habits scheduled for today. Add one above.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {todaysHabits.map((h) => (
              <li
                key={h.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 6px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <span>{h.name}</span>
                <button onClick={() => toggleDone(h.id)} style={{ padding: "6px 10px" }}>
                  {doneMap[h.id] ? "Done" : "Mark done"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {habits.length > 0 && (
  <CalendarView
    habits={habits}
    selectedHabitId={selectedHabitId || habits[0].id}
    onSelectHabit={setSelectedHabitId}
  />
)}


      <p style={{ marginTop: 16, color: "#444" }}>
        Tip: Install it as an app (browser menu → “Install app”) for fastest access.
      </p>
    </div>
  );
}

