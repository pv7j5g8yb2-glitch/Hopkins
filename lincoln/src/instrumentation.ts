// Starts Lincoln's background work when the server starts: mailbox checks every two minutes,
// reminders and approaching deadlines. One run at a time.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { tick } = await import("./lib/agent");
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await tick();
    } catch (e) {
      console.error("Lincoln background work failed", e);
    } finally {
      running = false;
    }
  };
  setTimeout(run, 15_000);
  setInterval(run, 120_000);
}
