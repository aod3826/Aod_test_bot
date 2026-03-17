const SHEET_NAME = "Leads";
const LEAD_ID_PREFIX = "LD";
const LEAD_ID_START = 1001;


const COLUMNS = {
  LEAD_ID: 0, // Column A
  DATE_ADDED: 1, // Column B
  LEAD_SOURCE: 2, // Column C
  SALES_REP: 3, // Column D
  CLIENT_NAME: 4, // Column E
  COMPANY: 5, // Column F
  CONTACT: 6, // Column G
  STATUS: 7, // Column H
  LAST_UPDATE: 8, // Column I
  FOLLOWUP_DATE: 9, // Column J
  NOTES: 10, // Column K
};


const STATUSES = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};


const REPORT_CHAT_ID = "";


const TIMEZONE = "Asia/Kolkata";


const STALE_LEAD_DAYS = 7;


function getTelegramUrl() {
  const token = getBotToken();
  return `https://api.telegram.org/bot${token}`;
}


function getSpreadsheet() {
  return SpreadsheetApp.openById(getSpreadsheetId());
}


function getLeadsSheet() {
  return getSpreadsheet().getSheetByName(SHEET_NAME);
}


function validateConfig() {
  const errors = [];

  const token = getBotToken();
  if (!token || token === "YOUR_BOT_TOKEN_HERE") {
    errors.push("BOT_TOKEN is not configured");
  }

  if (getSpreadsheetId() === "YOUR_SPREADSHEET_ID_HERE" || !getSpreadsheetId()) {
    errors.push("SPREADSHEET_ID is not configured");
  }

  if (errors.length > 0) {
    throw new Error("Configuration errors:\n" + errors.join("\n"));
  }

  return true;
}

// ============================================
// Script Properties helpers
// ============================================

function getScriptProperties() {
  return PropertiesService.getScriptProperties();
}

function setBotToken(token) {
  if (!token) throw new Error("Bot token is empty");
  getScriptProperties().setProperty("BOT_TOKEN", token);
}

function getBotToken() {
  return getScriptProperties().getProperty("BOT_TOKEN") || "YOUR_BOT_TOKEN_HERE";
}


function setWebhookUrl(url) {
  if (!url) throw new Error("Webhook URL is empty");
  getScriptProperties().setProperty("WEBHOOK_URL", url);
}

function getWebhookUrl() {
  return getScriptProperties().getProperty("WEBHOOK_URL") || "";
}

function setSpreadsheetId(id) {
  if (!id) throw new Error("Spreadsheet ID is empty");
  getScriptProperties().setProperty("SPREADSHEET_ID", id);
}

function getSpreadsheetId() {
  return getScriptProperties().getProperty("SPREADSHEET_ID") || "YOUR_SPREADSHEET_ID_HERE";
}
