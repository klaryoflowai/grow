const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function notify(message) {
  if (!TOKEN || !CHAT_ID) {
    console.log("[Telegram] Neconfigurat — mesaj sarit:", message.slice(0, 80));
    return;
  }

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML" }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Telegram] Eroare trimitere:", err);
  }
}
