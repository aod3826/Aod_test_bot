function sendMessage(t, e, n = {}) {
  const a = `${getTelegramUrl()}/sendMessage`,
    o = { chat_id: t, text: e, ...n },
    r = { method: "post", contentType: "application/json", payload: JSON.stringify(o), muteHttpExceptions: !0 };
  try {
    const t = UrlFetchApp.fetch(a, r),
      e = JSON.parse(t.getContentText());
    e.ok || Logger.log("Error sending message: " + JSON.stringify(e));
  } catch (t) {
    return Logger.log("Exception sending message: " + t.toString()), null;
  }
}
function sendMessageWithKeyboard(t, e, n, a = {}) {
  return sendMessage(t, e, { reply_markup: { inline_keyboard: n }, ...a });
}
function editMessage(t, e, n, a = {}) {
  const o = `${getTelegramUrl()}/editMessageText`,
    r = { chat_id: t, message_id: e, text: n, ...a },
    s = { method: "post", contentType: "application/json", payload: JSON.stringify(r), muteHttpExceptions: !0 };
  try {
    UrlFetchApp.fetch(o, s);
  } catch (t) {
    return Logger.log("Error editing message: " + t.toString()), null;
  }
}
function answerCallbackQuery(t, e = "", n = !1) {
  const a = `${getTelegramUrl()}/answerCallbackQuery`,
    o = { callback_query_id: t, text: e, show_alert: n },
    r = { method: "post", contentType: "application/json", payload: JSON.stringify(o), muteHttpExceptions: !0 };
  try {
    UrlFetchApp.fetch(a, r);
  } catch (t) {
    return Logger.log("Error answering callback query: " + t.toString()), null;
  }
}
function createInlineButton(t, e) {
  return { text: t, callback_data: e };
}
function formatLeadMessage(t) {
  let e = "📋 *Lead Details*\n\n";
  return (
    (e += `*ID:* \`${t.leadId}\`\n`),
    (e += `*Name:* ${t.clientName}\n`),
    (e += `*Company:* ${t.company}\n`),
    (e += `*Contact:* ${t.contact}\n`),
    (e += `*Status:* ${t.status}\n`),
    (e += `*Source:* ${t.leadSource}\n`),
    (e += `*Date Added:* ${t.dateAdded}\n`),
    t.followupDate && (e += `*Follow-up:* ${t.followupDate}\n`),
    t.notes && (e += `*Notes:* ${t.notes}\n`),
    e
  );
}
function formatLeadsList(t, e = "Leads") {
  if (!t || 0 === t.length) return "📭 No leads found.";
  let n = `📊 *${e}*\n\n`;
  return (
    t.forEach((t, e) => {
      (n += `${e + 1}. *${t.clientName}* (${t.company})\n`), (n += `   ID: \`${t.leadId}\` | Status: ${t.status}\n`), (n += `   Contact: ${t.contact}\n\n`);
    }),
    n
  );
}
function createStatusUpdateKeyboard(t) {
  return [
    [createInlineButton("✅ Contacted", `status_${t}_Contacted`), createInlineButton("⭐ Qualified", `status_${t}_Qualified`)],
    [createInlineButton("📝 Proposal Sent", `status_${t}_Proposal Sent`), createInlineButton("💼 Negotiation", `status_${t}_Negotiation`)],
    [createInlineButton("🎉 Won", `status_${t}_Won`), createInlineButton("❌ Lost", `status_${t}_Lost`)],
    [createInlineButton("📅 Schedule Follow-up", `followup_${t}`), createInlineButton("📝 Add Note", `note_${t}`)],
  ];
}
function escapeMarkdown(t) {
  return t ? t.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&") : "";
}
