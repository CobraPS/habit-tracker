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

