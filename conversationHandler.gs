function getUserConversationState(userId) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const stateJson = scriptProperties.getProperty(`conv_${userId}`);

  if (stateJson) {
    return JSON.parse(stateJson);
  }

  return null;
}

/**
 * Save conversation state for a user
 */
function setUserConversationState(userId, state) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty(`conv_${userId}`, JSON.stringify(state));
}

/**
 * Clear conversation state for a user
 */
function clearUserConversationState(userId) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteProperty(`conv_${userId}`);
}

/**
 * Start a new lead conversation
 */
function startNewLeadConversation(userId, chatId) {
  const state = {
    type: "new_lead",
    chatId: chatId,
    step: "client_name",
    data: {},
  };

  setUserConversationState(userId, state);
  sendMessage(chatId, "👤 Great! Let's add a new lead.\n\nWhat is the client's full name?");
}

/**
 * Handle conversation flow
 */
function handleConversation(userId, chatId, text, state) {
  if (state.type === "new_lead") {
    handleNewLeadConversation(userId, chatId, text, state);
  } else if (state.type === "add_note") {
    handleAddNoteConversation(userId, chatId, text, state);
  } else if (state.type === "schedule_followup") {
    handleScheduleFollowupConversation(userId, chatId, text, state);
  }
}

/**
 * Handle new lead conversation flow
 */
function handleNewLeadConversation(userId, chatId, text, state) {
  const { step, data } = state;

  switch (step) {
    case "client_name":
      data.clientName = text;
      state.step = "company";
      setUserConversationState(userId, state);
      sendMessage(chatId, "🏢 Got it! Which company do they work for?");
      break;

    case "company":
      data.company = text;
      state.step = "contact";
      setUserConversationState(userId, state);
      sendMessage(chatId, "📞 What is their phone number or email?");
      break;

    case "contact":
      data.contact = text;
      state.step = "lead_source";
      setUserConversationState(userId, state);
      sendMessage(chatId, "🔍 How did you find this lead?\n(e.g., Conference, Website, Referral, Cold Call)");
      break;

    case "lead_source":
      data.leadSource = text;
      state.step = "notes";
      setUserConversationState(userId, state);
      sendMessage(chatId, '📝 Any additional notes? (or type "skip" to skip)');
      break;

    case "notes":
      if (text.toLowerCase() !== "skip") {
        data.notes = text;
      }

      // Save the lead
      try {
        const lead = createLead(userId, data);
        clearUserConversationState(userId);

        const message = `✅ *Lead Added Successfully!*\n\n` + `*ID:* \`${lead.leadId}\`\n` + `*Name:* ${lead.clientName}\n` + `*Company:* ${lead.company}\n` + `*Contact:* ${lead.contact}\n` + `*Source:* ${lead.leadSource}\n\n` + `The lead has been added to your pipeline!`;

        sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        clearUserConversationState(userId);
        sendMessage(chatId, `❌ Error adding lead: ${error.message}\n\nPlease try again with /newlead`);
      }
      break;
  }
}

/**
 * Handle add note conversation
 */
function handleAddNoteConversation(userId, chatId, text, state) {
  const { leadId } = state.data;

  try {
    addNoteToLead(leadId, text);
    clearUserConversationState(userId);
    sendMessage(chatId, `✅ Note added to lead \`${leadId}\` successfully!`, { parse_mode: "Markdown" });
  } catch (error) {
    clearUserConversationState(userId);
    sendMessage(chatId, `❌ Error adding note: ${error.message}`);
  }
}

/**
 * Handle schedule follow-up conversation
 */
function handleScheduleFollowupConversation(userId, chatId, text, state) {
  const { leadId } = state.data;

  try {
    const followupDate = parseDate(text);

    if (!followupDate) {
      sendMessage(chatId, "❌ Invalid date format. Please use DD/MM/YYYY (e.g., 21/10/2025)");
      return;
    }

    scheduleFollowup(leadId, followupDate);
    clearUserConversationState(userId);

    sendMessage(chatId, `✅ Follow-up scheduled for lead \`${leadId}\` on ${followupDate}`, { parse_mode: "Markdown" });
  } catch (error) {
    clearUserConversationState(userId);
    sendMessage(chatId, `❌ Error scheduling follow-up: ${error.message}`);
  }
}

/**
 * Parse date from text input
 */
function parseDate(text) {
  let match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3];
    return `${day}/${month}/${year}`;
  }

  match = text.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, "0");
    const day = match[3].padStart(2, "0");
    return `${day}/${month}/${year}`;
  }

  return null;
}
