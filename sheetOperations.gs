function createLead(userId, data) {
  const sheet = getLeadsSheet();
  const leadId = generateLeadId(sheet);
  const now = new Date();
  const dateAdded = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy");
  const lastUpdate = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy HH:mm");

  const rowData = new Array(11).fill("");
  rowData[COLUMNS.LEAD_ID] = leadId;
  rowData[COLUMNS.DATE_ADDED] = dateAdded;
  rowData[COLUMNS.LEAD_SOURCE] = data.leadSource || "";
  rowData[COLUMNS.SALES_REP] = userId.toString();
  rowData[COLUMNS.CLIENT_NAME] = data.clientName || "";
  rowData[COLUMNS.COMPANY] = data.company || "";
  rowData[COLUMNS.CONTACT] = data.contact || "";
  rowData[COLUMNS.STATUS] = STATUSES.NEW;
  rowData[COLUMNS.LAST_UPDATE] = lastUpdate;
  rowData[COLUMNS.FOLLOWUP_DATE] = data.followupDate || "";
  rowData[COLUMNS.NOTES] = data.notes || "";

  sheet.appendRow(rowData);

  return {
    leadId: leadId,
    dateAdded: dateAdded,
    leadSource: data.leadSource,
    salesRep: userId.toString(),
    clientName: data.clientName,
    company: data.company,
    contact: data.contact,
    status: STATUSES.NEW,
    lastUpdate: lastUpdate,
    followupDate: data.followupDate || "",
    notes: data.notes || "",
  };
}

/**
 * Generate a unique Lead ID
 */
function generateLeadId(sheet) {
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return LEAD_ID_PREFIX + LEAD_ID_START;
  }

  let maxId = LEAD_ID_START - 1;

  for (let i = 1; i < data.length; i++) {
    const leadId = data[i][COLUMNS.LEAD_ID];
    if (leadId && leadId.startsWith(LEAD_ID_PREFIX)) {
      const idNumber = parseInt(leadId.substring(LEAD_ID_PREFIX.length));
      if (!isNaN(idNumber) && idNumber > maxId) {
        maxId = idNumber;
      }
    }
  }

  return LEAD_ID_PREFIX + (maxId + 1);
}

function findLeads(searchTerm) {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();
  const leads = [];

  const searchLower = searchTerm.toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const leadId = row[COLUMNS.LEAD_ID];
    const clientName = row[COLUMNS.CLIENT_NAME] || "";
    const company = row[COLUMNS.COMPANY] || "";

    if (leadId.toLowerCase().includes(searchLower) || clientName.toLowerCase().includes(searchLower) || company.toLowerCase().includes(searchLower)) {
      leads.push(parseLeadFromRow(row, i + 1));
    }
  }

  return leads;
}

function getLeadById(leadId) {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.LEAD_ID] === leadId) {
      return parseLeadFromRow(data[i], i + 1);
    }
  }

  return null;
}

function getLeadsByUser(userId) {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();
  const leads = [];

  const userIdStr = userId.toString();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.SALES_REP] === userIdStr) {
      leads.push(parseLeadFromRow(data[i], i + 1));
    }
  }

  return leads;
}

function getRecentLeads(count = 5) {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();
  const leads = [];

  // Start from the end (most recent)
  const startRow = Math.max(1, data.length - count);

  for (let i = data.length - 1; i >= startRow; i--) {
    if (i > 0) {
      // Skip header
      leads.push(parseLeadFromRow(data[i], i + 1));
    }
  }

  return leads;
}

/**
 * Get leads by status
 */
function getLeadsByStatus(status) {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();
  const leads = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.STATUS].toLowerCase() === status.toLowerCase()) {
      leads.push(parseLeadFromRow(data[i], i + 1));
    }
  }

  return leads;
}

function getStaleLeads() {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();
  const leads = [];
  const now = new Date();
  const staleDate = new Date(now.getTime() - STALE_LEAD_DAYS * 24 * 60 * 60 * 1000);

  for (let i = 1; i < data.length; i++) {
    const status = data[i][COLUMNS.STATUS];
    const lastUpdateStr = data[i][COLUMNS.LAST_UPDATE];

    if (status === STATUSES.NEW || status === STATUSES.CONTACTED) {
      try {
        const lastUpdate = parseLastUpdateDate(lastUpdateStr);

        if (lastUpdate && lastUpdate < staleDate) {
          leads.push(parseLeadFromRow(data[i], i + 1));
        }
      } catch (error) {
        Logger.log("Error parsing date for row " + i + ": " + error.toString());
      }
    }
  }

  return leads;
}

function updateLeadStatus(leadId, newStatus) {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.LEAD_ID] === leadId) {
      const rowNumber = i + 1;

      sheet.getRange(rowNumber, COLUMNS.STATUS + 1).setValue(newStatus);

      const now = new Date();
      const timestamp = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy HH:mm");
      sheet.getRange(rowNumber, COLUMNS.LAST_UPDATE + 1).setValue(timestamp);

      return true;
    }
  }

  return false;
}

function addNoteToLead(leadId, note) {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.LEAD_ID] === leadId) {
      const rowNumber = i + 1;
      const existingNotes = data[i][COLUMNS.NOTES] || "";

      const now = new Date();
      const timestamp = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy HH:mm");
      const newNote = `[${timestamp}] ${note}`;
      const updatedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;

      sheet.getRange(rowNumber, COLUMNS.NOTES + 1).setValue(updatedNotes);

      sheet.getRange(rowNumber, COLUMNS.LAST_UPDATE + 1).setValue(timestamp);

      return true;
    }
  }

  return false;
}

/**
 * Schedule a follow-up for a lead
 */
function scheduleFollowup(leadId, followupDate) {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.LEAD_ID] === leadId) {
      const rowNumber = i + 1;

      sheet.getRange(rowNumber, COLUMNS.FOLLOWUP_DATE + 1).setValue(followupDate);

      const now = new Date();
      const timestamp = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy HH:mm");
      sheet.getRange(rowNumber, COLUMNS.LAST_UPDATE + 1).setValue(timestamp);

      return true;
    }
  }

  return false;
}

/**
 * Get leads with follow-ups due today
 */
function getFollowupsDueToday() {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();
  const leads = [];
  const today = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy");

  for (let i = 1; i < data.length; i++) {
    const followupDate = data[i][COLUMNS.FOLLOWUP_DATE];

    if (followupDate === today) {
      leads.push(parseLeadFromRow(data[i], i + 1));
    }
  }

  return leads;
}

/**
 * Parse a lead object from a sheet row
 */
function parseLeadFromRow(row, rowNumber) {
  return {
    rowNumber: rowNumber,
    leadId: row[COLUMNS.LEAD_ID] || "",
    dateAdded: row[COLUMNS.DATE_ADDED] || "",
    leadSource: row[COLUMNS.LEAD_SOURCE] || "",
    salesRep: row[COLUMNS.SALES_REP] || "",
    clientName: row[COLUMNS.CLIENT_NAME] || "",
    company: row[COLUMNS.COMPANY] || "",
    contact: row[COLUMNS.CONTACT] || "",
    status: row[COLUMNS.STATUS] || "",
    lastUpdate: row[COLUMNS.LAST_UPDATE] || "",
    followupDate: row[COLUMNS.FOLLOWUP_DATE] || "",
    notes: row[COLUMNS.NOTES] || "",
  };
}

/**
 * Parse last update date string to Date object
 */
function parseLastUpdateDate(dateStr) {
  if (!dateStr) return null;

  const parts = dateStr.split(" ");
  if (parts.length !== 2) return null;

  const dateParts = parts[0].split("/");
  if (dateParts.length !== 3) return null;

  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const year = parseInt(dateParts[2]);

  const timeParts = parts[1].split(":");
  const hour = parseInt(timeParts[0]);
  const minute = parseInt(timeParts[1]);

  return new Date(year, month, day, hour, minute);
}

/**
 * Get statistics for daily report
 */
function getDailyStatistics() {
  const sheet = getLeadsSheet();
  const data = sheet.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy");

  const stats = {
    newLeadsAdded: 0,
    contacted: 0,
    qualified: 0,
    won: 0,
    lost: 0,
  };

  for (let i = 1; i < data.length; i++) {
    const dateAdded = data[i][COLUMNS.DATE_ADDED];
    const status = data[i][COLUMNS.STATUS];

    if (dateAdded === today) {
      stats.newLeadsAdded++;
    }

    const lastUpdate = data[i][COLUMNS.LAST_UPDATE];
    if (lastUpdate && lastUpdate.startsWith(today)) {
      switch (status) {
        case STATUSES.CONTACTED:
          stats.contacted++;
          break;
        case STATUSES.QUALIFIED:
          stats.qualified++;
          break;
        case STATUSES.WON:
          stats.won++;
          break;
        case STATUSES.LOST:
          stats.lost++;
          break;
      }
    }
  }

  return stats;
}
