export async function ensureNotificationsEnabled() {
  if (!("Notification" in window)) return { ok: false, reason: "unsupported" };
  if (Notification.permission === "granted") return { ok: true };

  const perm = await Notification.requestPermission();
  return { ok: perm === "granted", reason: perm };
}

export async function showHabitNotification(habit) {
  if (Notification.permission !== "granted") return;

  // Use SW if present so we can add actions
  const reg = await navigator.serviceWorker.getRegistration();
  const title = `Habit: ${habit.name}`;
  const options = {
    body: "Tap to open. Or mark done now.",
    data: { habitId: habit.id },
    actions: [{ action: "done", title: "Mark done" }],
  };

  if (reg) reg.showNotification(title, options);
  else new Notification(title, options);
}

