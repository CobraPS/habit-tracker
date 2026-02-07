import { openDB } from "idb";

const DB_NAME = "habit_tracker_db";
const DB_VERSION = 1;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("habits")) {
        db.createObjectStore("habits", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("logs")) {
        // key: `${habitId}:${yyyy-mm-dd}`
        db.createObjectStore("logs", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    },
  });
}

export function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isScheduledToday(habit) {
  // schedule: { type: "daily" } or { type: "weekly", days: [0..6] } (0=Sun)
  if (habit.schedule?.type === "daily") return true;
  if (habit.schedule?.type === "weekly") {
    const day = new Date().getDay();
    return habit.schedule.days.includes(day);
  }
  return true;
}

export function monthStartEndISO(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const toISO = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  return { start: toISO(start), end: toISO(end) };
}

export function isoToDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0=Sun
}

export async function getHabitLogsForMonth(habitId, date = new Date()) {
  const db = await getDB();
  const { start, end } = monthStartEndISO(date);

  const startKey = `${habitId}:${start}`;
  const endKey = `${habitId}:${end}`;

  const logs = await db.getAll("logs");
  // logs store is small; filter in memory for simplicity
  // If it grows large, switch to an index on habitId/date.
  const set = new Set(
    logs
      .filter((l) => l.habitId === habitId && l.date >= start && l.date <= end)
      .map((l) => l.date)
  );

  return { start, end, doneDates: set };
}

