import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  daysInMonth,
  firstDayOfMonth,
  getHabitLogsForMonth,
  monthStartEndISO,
} from "./db";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthLabel(date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export default function CalendarView({ habits, selectedHabitId, onSelectHabit }) {
  const [month, setMonth] = useState(() => new Date());
  const [doneDates, setDoneDates] = useState(new Set());

  const selectedHabit = useMemo(
    () => habits.find((h) => h.id === selectedHabitId) ?? habits[0],
    [habits, selectedHabitId]
  );

  useEffect(() => {
    if (!selectedHabit?.id) return;
    (async () => {
      const res = await getHabitLogsForMonth(selectedHabit.id, month);
      setDoneDates(res.doneDates);
    })();
  }, [selectedHabit?.id, month]);

  const dim = daysInMonth(month);
  const first = firstDayOfMonth(month); // 0..6
  const cells = [];

  for (let i = 0; i < first; i++) cells.push(null);
  for (let day = 1; day <= dim; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const year = month.getFullYear();
  const mon = month.getMonth() + 1;

  const dayIso = (day) => {
    const mm = String(mon).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const { start, end } = monthStartEndISO(month);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginTop: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setMonth((d) => addMonths(d, -1))} style={{ padding: "6px 10px" }}>
            Prev
          </button>
          <div style={{ fontWeight: 600 }}>{monthLabel(month)}</div>
          <button onClick={() => setMonth((d) => addMonths(d, 1))} style={{ padding: "6px 10px" }}>
            Next
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Habit
            <select
              value={selectedHabit?.id ?? ""}
              onChange={(e) => onSelectHabit(e.target.value)}
              style={{ padding: 6 }}
            >
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div style={{ marginTop: 8, color: "#444" }}>
        Showing logs from {start} to {end}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 10 }}>
        {DOW.map((d) => (
          <div key={d} style={{ fontSize: 12, color: "#555", padding: "4px 2px" }}>
            {d}
          </div>
        ))}

        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} style={{ padding: 10 }} />;

          const iso = dayIso(day);
          const done = doneDates.has(iso);

          return (
            <div
              key={idx}
              title={done ? "Done" : "Not done"}
              style={{
                border: "1px solid #eee",
                borderRadius: 10,
                padding: 10,
                minHeight: 42,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                fontWeight: 600,
                opacity: 1,
              }}
            >
              <span>{day}</span>
              <span style={{ fontSize: 14 }}>{done ? "✓" : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

