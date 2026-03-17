
function handleFindCommand(chatId, searchTerm) {
  if (!searchTerm || searchTerm.trim() === "") {
    sendMessage(chatId, "❌ Please provide a search term.\nUsage: /find [name or company]");
    return;
  }

  try {
    const leads = findLeads(searchTerm);

    if (leads.length === 0) {
      sendMessage(chatId, `📭 No leads found matching "${searchTerm}".`);
      return;
    }

    if (leads.length === 1) {
      const lead = leads[0];
      const message = formatLeadMessage(lead);
      const keyboard = createStatusUpdateKeyboard(lead.leadId);

      sendMessageWithKeyboard(chatId, message, keyboard, { parse_mode: "Markdown" });
    } else {
      const message = formatLeadsList(leads, `Search Results for "${searchTerm}"`);
      sendMessage(chatId, message, { parse_mode: "Markdown" });
    }
  } catch (error) {
    Logger.log("Error in handleFindCommand: " + error.toString());
    sendMessage(chatId, "❌ Error searching for leads. Please try again.");
  }
}

/**
 * Handle /myleads command
 */
function handleMyLeadsCommand(chatId, userId) {
  try {
    const leads = getLeadsByUser(userId);

    if (leads.length === 0) {
      sendMessage(chatId, "📭 You don't have any leads yet.\n\nUse /newlead to add your first lead!");
      return;
    }

    const grouped = {};
    leads.forEach((lead) => {
      if (!grouped[lead.status]) {
        grouped[lead.status] = [];
      }
      grouped[lead.status].push(lead);
    });

    let message = `📊 *Your Leads (${leads.length} total)*\n\n`;

    Object.keys(grouped).forEach((status) => {
      message += `*${status}* (${grouped[status].length}):\n`;
      grouped[status].forEach((lead) => {
        message += `  • ${lead.clientName} - ${lead.company} (\`${lead.leadId}\`)\n`;
      });
      message += "\n";
    });

    message += "\n💡 Use /find [name/company] to view and update a specific lead.";

    sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    Logger.log("Error in handleMyLeadsCommand: " + error.toString());
    sendMessage(chatId, "❌ Error retrieving your leads. Please try again.");
  }
}

/**
 * Handle /recentleads command
 */
function handleRecentLeadsCommand(chatId, count) {
  if (count < 1 || count > 20) {
    sendMessage(chatId, "❌ Please specify a number between 1 and 20.");
    return;
  }

  try {
    const leads = getRecentLeads(count);

    if (leads.length === 0) {
      sendMessage(chatId, "📭 No leads found.");
      return;
    }

    const message = formatLeadsList(leads, `${leads.length} Most Recent Leads`);
    sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    Logger.log("Error in handleRecentLeadsCommand: " + error.toString());
    sendMessage(chatId, "❌ Error retrieving recent leads. Please try again.");
  }
}

/**
 * Handle /status command
 */
function handleStatusCommand(chatId, status) {
  if (!status || status.trim() === "") {
    const statusList = Object.values(STATUSES).join(", ");
    sendMessage(chatId, `❌ Please specify a status.\n\nAvailable statuses: ${statusList}\n\nUsage: /status [status]`);
    return;
  }

  try {
    const leads = getLeadsByStatus(status);

    if (leads.length === 0) {
      sendMessage(chatId, `📭 No leads found with status "${status}".`);
      return;
    }

    const message = formatLeadsList(leads, `Leads with status "${status}"`);
    sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    Logger.log("Error in handleStatusCommand: " + error.toString());
    sendMessage(chatId, "❌ Error retrieving leads by status. Please try again.");
  }
}

/**
 * Handle /stalereport command
 */
function handleStaleReportCommand(chatId) {
  try {
    const leads = getStaleLeads();

    if (leads.length === 0) {
      sendMessage(chatId, `✅ Great news! No stale leads found.\n\nAll leads have been updated within the last ${STALE_LEAD_DAYS} days.`);
      return;
    }

    let message = `⚠️ *Stale Leads Report*\n\n`;
    message += `Found ${leads.length} leads that haven't been updated in over ${STALE_LEAD_DAYS} days:\n\n`;

    leads.forEach((lead, index) => {
      message += `${index + 1}. *${lead.clientName}* (${lead.company})\n`;
      message += `   ID: \`${lead.leadId}\` | Status: ${lead.status}\n`;
      message += `   Last Update: ${lead.lastUpdate}\n`;
      message += `   Assigned to: ${lead.salesRep}\n\n`;
    });

    message += "\n💡 Use /find [name/company] to review and update these leads.";

    sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    Logger.log("Error in handleStaleReportCommand: " + error.toString());
    sendMessage(chatId, "❌ Error generating stale leads report. Please try again.");
  }
}

/**
 * Handle callback queries from inline keyboards
 */
function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  Logger.log("Callback query data: " + data);

  const parts = data.split("_");
  const action = parts[0];
  const leadId = parts[1];

  try {
    if (action === "status") {
      const newStatus = parts.slice(2).join("_");

      const success = updateLeadStatus(leadId, newStatus);

      if (success) {
        answerCallbackQuery(callbackQuery.id, "Status updated!");

        const lead = getLeadById(leadId);
        const updatedMessage = formatLeadMessage(lead) + `\n\n✅ Status updated to *${newStatus}*`;
        const keyboard = createStatusUpdateKeyboard(leadId);

        editMessage(chatId, messageId, updatedMessage, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: keyboard },
        });
      } else {
        answerCallbackQuery(callbackQuery.id, "Error updating status", true);
      }
    } else if (action === "followup") {
      answerCallbackQuery(callbackQuery.id, "Enter follow-up date");

      const state = {
        type: "schedule_followup",
        chatId: chatId,
        data: { leadId: leadId },
      };

      setUserConversationState(userId, state);
      sendMessage(chatId, "📅 Please enter the follow-up date in DD/MM/YYYY format (e.g., 21/10/2025):");
    } else if (action === "note") {
      answerCallbackQuery(callbackQuery.id, "Enter your note");

      const state = {
        type: "add_note",
        chatId: chatId,
        data: { leadId: leadId },
      };

      setUserConversationState(userId, state);
      sendMessage(chatId, "📝 Please enter your note for this lead:");
    }
  } catch (error) {
    Logger.log("Error in handleCallbackQuery: " + error.toString());
    answerCallbackQuery(callbackQuery.id, "Error processing request", true);
  }
}
