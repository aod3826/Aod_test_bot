function doPost(e) {
  try {
    validateConfig();
    const update = JSON.parse(e.postData.contents);
    if (update.message) {
      handleMessage(update.message);
    } else if (update.callback_query) {
      handleCallbackQuery(update.callback_query);
    }
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    try {
      if (e.postData && e.postData.contents) {
        const update = JSON.parse(e.postData.contents);
        if (update.message && update.message.chat) {
          sendMessage(update.message.chat.id, "⚠️ Bot error: " + error.message);
        }
      }
    } catch (notifyError) {
      Logger.log("Could not notify user of error: " + notifyError.toString());
    }
  }
}

function doGet() {
  return ContentService.createTextOutput("Telegram Lead Management Bot is running!");
}

/**
 * Adds custom menu for quick configuration from the Sheet UI
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🤖 Telegram Bot")
    .addItem("Enter Bot Token 🔑", "menuEnterBotToken")
    .addItem("Enter Webhook URL 🌐", "menuEnterWebhookUrl")
    .addItem("Enter Spreadsheet ID 📊", "menuEnterSpreadsheetId")
    .addSeparator()
    .addItem("Set up Telegram Bot Integration ⚙️", "menuSetupIntegration")
    .addSeparator()
    .addItem("Check Webhook Status 🔍", "menuCheckWebhookStatus")
    .addItem(" Delete Webhook Integration 🔄", "deleteWebhookAndClearPendingUpdates")
    .addToUi();
}

function handlePromptInput(title, message, setterFunction, successMessage, emptyMessage) {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(title, message, ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() !== ui.Button.OK) return false;

  const input = (response.getResponseText() || "").trim();
  if (!input) {
    ui.alert(emptyMessage);
    return false;
  }

  setterFunction(input);
  ui.alert(successMessage);
  return true;
}

function menuEnterBotToken() {
  handlePromptInput("🔑 Enter Telegram Bot Token", "Paste the token from BotFather (starts with a number and a colon)", setBotToken, "✅ Bot token saved.", "Token was empty. No changes made.");
}

function menuEnterWebhookUrl() {
  handlePromptInput("🌐 Enter Webhook URL", "Paste your deployed Web App URL (ends with /exec)", setWebhookUrl, "✅ Webhook URL saved.", "Webhook URL was empty. No changes made.");
}

function menuEnterSpreadsheetId() {
  handlePromptInput("🔑 Enter Spreadsheet ID", "Paste the ID from the spreadsheet URL", setSpreadsheetId, "✅ Spreadsheet ID saved.", "Spreadsheet ID was empty. No changes made.");
}

function menuCheckWebhookStatus() {
  const ui = SpreadsheetApp.getUi();
  try {
    validateConfig();

    const webhookInfo = getWebhookInfo();
    const triggers = ScriptApp.getProjectTriggers();

    let message = "🔍 *Webhook Status Report*\n\n";

    if (webhookInfo.ok) {
      message += "✅ *Webhook Status:* Active\n";
      message += `📍 *URL:* ${webhookInfo.result.url || "Not set"}\n`;
      message += `📊 *Pending Updates:* ${webhookInfo.result.pending_update_count || 0}\n`;
      message += `🕐 *Last Error:* ${webhookInfo.result.last_error_date || "None"}\n`;
      message += `❌ *Last Error Message:* ${webhookInfo.result.last_error_message || "None"}\n\n`;
    } else {
      message += "❌ *Webhook Status:* Error\n";
      message += `❌ *Error:* ${webhookInfo.description}\n\n`;
    }

    message += `🤖 *Automated Triggers:* ${triggers.length} active\n`;
    if (triggers.length > 0) {
      message += "Triggers:\n";
      triggers.forEach((trigger, index) => {
        message += `  ${index + 1}. ${trigger.getHandlerFunction()}\n`;
      });
    }

    ui.alert("Webhook Status", message, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert("⚠️ Error checking webhook", String(err && err.message ? err.message : err), ui.ButtonSet.OK);
  }
}

/**
 * Validate config and set webhook
 */
function menuSetupIntegration() {
  const ui = SpreadsheetApp.getUi();
  try {
    validateConfig();
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) {
      ui.alert("Please set the Webhook URL first using the menu.");
      return;
    }
    const resultMessage = setWebhook();
    ui.alert("🎯 Setup Complete", resultMessage, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert("⚠️ Setup failed", String(err && err.message ? err.message : err), ui.ButtonSet.OK);
  }
}

/**
 * Handle incoming messages
 */
function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text || "";

  const conversationState = getUserConversationState(userId);

  if (conversationState) {
    handleConversation(userId, chatId, text, conversationState);
    return;
  }

  if (text.startsWith("/")) {
    handleCommand(chatId, userId, text);
  } else {
    sendMessage(chatId, "❓ I didn't understand that. Type /help to see available commands.");
  }
}

/**
 * Handle bot commands
 */
function handleCommand(chatId, userId, text) {
  const parts = text.split(" ");
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case "/start":
      sendWelcomeMessage(chatId);
      break;

    case "/help":
      sendHelpMessage(chatId);
      break;

    case "/newlead":
      startNewLeadConversation(userId, chatId);
      break;

    case "/find":
      handleFindCommand(chatId, args.join(" "));
      break;

    case "/myleads":
      handleMyLeadsCommand(chatId, userId);
      break;

    case "/recentleads":
      const count = parseInt(args[0]) || 5;
      handleRecentLeadsCommand(chatId, count);
      break;

    case "/status":
      handleStatusCommand(chatId, args.join(" "));
      break;

    case "/stalereport":
      handleStaleReportCommand(chatId);
      break;

    case "/cancel":
      clearUserConversationState(userId);
      sendMessage(chatId, "❌ Operation cancelled.");
      break;

    default:
      sendMessage(chatId, "❓ Unknown command. Type /help to see available commands.");
  }
}

/**
 * Send welcome message
 */
function sendWelcomeMessage(chatId) {
  const message = `👋 *Welcome to Lead Management Bot!*

I'm your personal assistant for managing sales leads. I can help you:

📝 Add new leads
🔍 Search and find leads
📊 View your leads and reports
📅 Get follow-up reminders
✅ Update lead status

Type /help to see all available commands!`;

  sendMessage(chatId, message, { parse_mode: "Markdown" });
}

/**
 * Send help message
 */
function sendHelpMessage(chatId) {
  const message = `🤖 *Available Commands:*

*Lead Management:*
/newlead - Add a new lead
/find [name/company] - Find a lead
/myleads - View all your leads
/recentleads [number] - View recent leads
/status [status] - View leads by status

*Reporting:*
/stalereport - View stale leads

*General:*
/help - Show this help message
/cancel - Cancel current operation

*Available Statuses:*
• New
• Contacted
• Qualified
• Proposal Sent
• Negotiation
• Won
• Lost`;

  sendMessage(chatId, message, { parse_mode: "Markdown" });
}

/**
 * Set webhook for the bot
 */
function setWebhook() {
  validateConfig();
  const webAppUrl = getWebhookUrl();
  if (!webAppUrl) {
    throw new Error("Webhook URL not configured. Use the Sheet menu to set it.");
  }

  const url = `${getTelegramUrl()}/setWebhook?url=${encodeURIComponent(webAppUrl)}`;
  const response = UrlFetchApp.fetch(url);
  const result = JSON.parse(response.getContentText());

  if (result.ok) {
    return "Webhook set successfully to: " + webAppUrl;
  } else {
    throw new Error("Failed to set webhook: " + result.description);
  }
}

function deleteWebhookAndClearPendingUpdates() {
  try {
    // First, remove all automated triggers to stop scheduled messages
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach((trigger) => {
      ScriptApp.deleteTrigger(trigger);
    });
    Logger.log(`Removed ${triggers.length} automated triggers`);

    // Clear all conversation states to stop stuck conversations
    const scriptProperties = PropertiesService.getScriptProperties();
    const allProperties = scriptProperties.getProperties();
    const conversationKeys = Object.keys(allProperties).filter((key) => key.startsWith("conv_"));
    conversationKeys.forEach((key) => {
      scriptProperties.deleteProperty(key);
    });
    Logger.log(`Cleared ${conversationKeys.length} conversation states`);

    // Delete webhook and clear pending updates
    const url = `${getTelegramUrl()}/deleteWebhook?drop_pending_updates=true`;
    const response = UrlFetchApp.fetch(url);
    const result = JSON.parse(response.getContentText());

    Logger.log("Webhook removed: " + JSON.stringify(result));

    // If there are still pending updates, try to get them and acknowledge them
    if (result.ok) {
      const webhookInfo = getWebhookInfo();
      if (webhookInfo.ok && webhookInfo.result.pending_update_count > 0) {
        Logger.log(`Still ${webhookInfo.result.pending_update_count} pending updates. Attempting to clear...`);

        // Try to get updates and acknowledge them
        const getUpdatesUrl = `${getTelegramUrl()}/getUpdates?offset=-1&limit=100`;
        const updatesResponse = UrlFetchApp.fetch(getUpdatesUrl);
        const updatesResult = JSON.parse(updatesResponse.getContentText());

        if (updatesResult.ok && updatesResult.result.length > 0) {
          Logger.log(`Found ${updatesResult.result.length} updates to acknowledge`);
          // Get the highest update_id and acknowledge all updates up to that point
          const maxUpdateId = Math.max(...updatesResult.result.map((update) => update.update_id));
          const acknowledgeUrl = `${getTelegramUrl()}/getUpdates?offset=${maxUpdateId + 1}`;
          UrlFetchApp.fetch(acknowledgeUrl);
          Logger.log(`Acknowledged all updates up to ID ${maxUpdateId}`);
        }
      }

      Logger.log("✅ SUCCESS: Flood stopped!");
      Logger.log("Pending updates cleared: " + (result.result ? "Yes" : "No"));
      return "✅ FLOOD STOPPED!\n\n• Removed all automated triggers\n• Cleared all conversation states\n• Webhook deleted\n• Pending updates cleared\n\nYou can now fix the SPREADSHEET_ID and redeploy.";
    } else {
      return "❌ Error: " + result.description;
    }
  } catch (error) {
    Logger.log("❌ Error stopping flood: " + error.toString());
    return "❌ Error: " + error.toString();
  }
}
function getWebhookInfo() {
  const url = `${getTelegramUrl()}/getWebhookInfo`;
  const response = UrlFetchApp.fetch(url);
  const result = JSON.parse(response.getContentText());
  return result;
}

/**
 * Test function to verify the bot is working correctly
 */
function testBotSetup() {
  try {
    validateConfig();

    const webhookInfo = getWebhookInfo();
    const triggers = ScriptApp.getProjectTriggers();

    Logger.log("=== Bot Setup Test ===");
    Logger.log("Bot Token: " + (getBotToken() ? "✅ Set" : "❌ Not set"));
    Logger.log("Spreadsheet ID: " + (getSpreadsheetId() ? "✅ Set" : "❌ Not set"));
    Logger.log("Webhook URL: " + (getWebhookUrl() ? "✅ Set" : "❌ Not set"));
    Logger.log("Webhook Status: " + (webhookInfo.ok ? "✅ Active" : "❌ Inactive"));
    Logger.log("Pending Updates: " + (webhookInfo.result?.pending_update_count || 0));
    Logger.log("Active Triggers: " + triggers.length);

    return "Bot setup test completed. Check logs for details.";
  } catch (error) {
    Logger.log("Test failed: " + error.toString());
    return "Test failed: " + error.message;
  }
}
