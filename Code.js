/**
 * =====================================================
 * MAP Framework v1.0
 * Entry Point (Code.gs)
 * =====================================================
 */

function doPost(e) {
  return processRequest(e);
}

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('MAP Framework')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}

function getPage(pageName) {
  return HtmlService
    .createHtmlOutputFromFile(pageName)
    .getContent();
}

function logoutUser(sessionId) {
  try {
    return deleteSession(sessionId);
  } catch (error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    throw error;
  }
}

function getCurrentUser(sessionId) {
  try {
    if (!sessionId) {
      return failureResult('Session ID is missing.');
    }

    const sessionRes = isSessionValid(sessionId);
    if (!sessionRes || !sessionRes.success) {
      return failureResult('Session expired or invalid.');
    }

    const session = sessionRes.data;
    const userRes = dbGetData(SHEETS.USERS || 'USERS');
    if (!userRes || !userRes.success) {
      return userRes || failureResult('Users sheet could not be read.');
    }

    const user = userRes.data.find(function(u) {
      return String(u.USER_ID || u.UserId || '').trim() === String(session.USER_ID).trim();
    });

    if (!user) {
      return failureResult('User record not found.');
    }

    const loginTimeFormatted = session.LOGIN_TIME ? 
      (session.LOGIN_TIME instanceof Date ? formatDate(session.LOGIN_TIME) : String(session.LOGIN_TIME)) : '';

    return successResult({
      SESSION_ID: session.SESSION_ID,
      USER_ID: user.USER_ID,
      FULL_NAME: user.FULL_NAME,
      LOGIN_TIME: loginTimeFormatted
    });

  } catch (error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    return failureResult("Server Error: " + error.toString());
  }
}

/******************************************************************************
 * Fetch HOME_DATA Table Records (Date-Safe & Role-Based)
 ******************************************************************************/
function getDashboardTableData(sessionId) {
  try {
    if (!sessionId) {
      return failureResult("Session ID is missing.");
    }

    // 1. Resolve Session & User ID
    let currentUserId = "";
    try {
      const sessionRes = isSessionValid(sessionId);
      if (sessionRes && sessionRes.success && sessionRes.data) {
        currentUserId = String(sessionRes.data.USER_ID || "").trim();
      }
    } catch (e) {
      Logger.log("isSessionValid error: " + e.toString());
    }

    // Fallback: Check USER_SESSION sheet directly
    if (!currentUserId) {
      const sessionDb = dbGetData("USER_SESSION");
      if (sessionDb && sessionDb.success && sessionDb.data) {
        const foundSess = sessionDb.data.find(function(s) {
          return String(s.SESSION_ID).trim() === String(sessionId).trim();
        });
        if (foundSess) {
          currentUserId = String(foundSess.USER_ID).trim();
        }
      }
    }

    if (!currentUserId) {
      return failureResult("Session expired or invalid. Please log in again.");
    }

    // 2. Resolve User Role (ADMIN vs USER)

    let userRole = 'USER';
    const userDbNames = ["USERS", "USER_MASTER", "Users", "User_Master"];

    for (let u = 0; u < userDbNames.length; u++) {
      let uRes = dbGetData(userDbNames[u]);
      if (uRes && uRes.success && uRes.data) {
      let matchUser = uRes.data.find(function(row) {
      var uid = row.USER_ID || row.UserId || row.User_ID || "";
      return String(uid).trim().toLowerCase() === currentUserId.toLowerCase();
      });
      if (matchUser && matchUser.ROLE_ID) {
        userRole = String(matchUser.ROLE_ID).trim().toUpperCase();
        if (userRole.indexOf("ADMIN") !== -1) {
          userRole = "ADMIN";
        }
        break;
      }
    }
  }


    // 3. Dynamic Sheet Search for HOME_DATA
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    let targetSheet = null;
    let actualSheetName = "";

    for (let i = 0; i < sheets.length; i++) {
      let sName = sheets[i].getName().trim().toUpperCase().replace(/_/g, "").replace(/\s/g, "");
      if (sName === "HOMEDATA" || sName === "HOMEPAGEDATA" || sName === "DATA") {
        targetSheet = sheets[i];
        actualSheetName = sheets[i].getName();
        break;
      }
    }

    if (!targetSheet) {
      return failureResult("Sheet tab 'HOME_DATA' not found in spreadsheet. Found tabs: " + sheets.map(s => s.getName()).join(", "));
    }

    // Read Data Range
    const rawData = targetSheet.getDataRange().getValues();
    if (!rawData || rawData.length <= 1) {
      return successResult({
        ROLE: userRole,
        USER_ID: currentUserId,
        SHEET_NAME: actualSheetName,
        TOTAL_RECORDS: 0,
        RECORDS: []
      }, "HOME_DATA sheet is empty.");
    }

    const headers = rawData[0];
    const rows = rawData.slice(1);

    // 4. Sanitize and Convert Row Data (Fixes google.script.run Date serialization crash)
    const allRows = rows.map(function(row) {
      const obj = {};
      headers.forEach(function(header, idx) {
        if (header) {
          let val = row[idx];
          if (val instanceof Date) {
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
          } else if (val === null || val === undefined) {
            val = "";
          } else {
            val = String(val);
          }
          obj[String(header).trim()] = val;
        }
      });
      return obj;
    });

    // 5. Role-Based Data Filtering
    let filteredRows = [];
    if (userRole === 'ADMIN') {
      filteredRows = allRows;
    } else {
      filteredRows = allRows.filter(function(row) {
        if (!row) return false;
        var rUid = row.USER_ID || row.UserId || row.User_ID || row["USER ID"] || row["User Id"] || row.USERID || "";
        return String(rUid).trim().toLowerCase() === currentUserId.toLowerCase();
      });
    }

    return successResult({
      ROLE: userRole,
      USER_ID: currentUserId,
      SHEET_NAME: actualSheetName,
      TOTAL_RECORDS: filteredRows.length,
      RECORDS: filteredRows
    }, "Data retrieved successfully.");

  } catch (error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    return failureResult("Server Exception: " + error.toString());
  }
}
/******************************************************************************
 * Add New Entry to HOME_DATA (With Formula Auto-Copy)
 ******************************************************************************/
function addHomeDataEntry(sessionId, col1Value, col1Date) {
  try {
    if (!sessionId) {
      return failureResult("Session expired or missing.");
    }

    if (!col1Value || !col1Date) {
      return failureResult("Please fill in both Column 1 and Column Date 1.");
    }

    // 1. Verify Session & Get Logged-in User ID
    const sessionRes = isSessionValid(sessionId);
    if (!sessionRes || !sessionRes.success) {
      return failureResult("Invalid session. Please log in again.");
    }
    const currentUserId = String(sessionRes.data.USER_ID).trim();

    // 2. Locate HOME_DATA Sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    let targetSheet = null;

    for (let i = 0; i < sheets.length; i++) {
      let sName = sheets[i].getName().trim().toUpperCase().replace(/_/g, "").replace(/\s/g, "");
      if (sName === "HOMEDATA" || sName === "HOMEPAGEDATA" || sName === "DATA") {
        targetSheet = sheets[i];
        break;
      }
    }

    if (!targetSheet) {
      return failureResult("Sheet tab 'HOME_DATA' not found in spreadsheet.");
    }

    // 3. Find Column Indexes
    const rawData = targetSheet.getDataRange().getValues();
    if (!rawData || rawData.length === 0) {
      return failureResult("HOME_DATA sheet headers are missing.");
    }

    const headers = rawData[0].map(h => String(h).trim().toUpperCase());
    
    // Map required column indexes
    let userIdIdx = headers.findIndex(h => h === "USER_ID" || h === "USERID" || h === "USER ID");
    let col1Idx = headers.findIndex(h => h.includes("COLUMN 1") || h.includes("COLUMN1"));
    let colDateIdx = headers.findIndex(h => h.includes("DATE"));

    const lastRow = targetSheet.getLastRow();
    const newRowIndex = lastRow + 1;

    // Default row array with empty strings matching column length
    const newRowData = new Array(headers.length).fill("");

    // Populate user inputs
    if (userIdIdx !== -1) newRowData[userIdIdx] = currentUserId;
    if (col1Idx !== -1) newRowData[col1Idx] = col1Value;
    if (colDateIdx !== -1) newRowData[colDateIdx] = col1Date;

    // 4. Append New Row Data
    targetSheet.appendRow(newRowData);

    // 5. Copy Formulas from Previous Row (If applicable)
    if (lastRow > 1) {
      const prevRowRange = targetSheet.getRange(lastRow, 1, 1, headers.length);
      const prevFormulas = prevRowRange.getFormulas()[0];
      const newRowRange = targetSheet.getRange(newRowIndex, 1, 1, headers.length);

      // Copy formulas into columns that contain calculated fields
      for (let c = 0; c < prevFormulas.length; c++) {
        if (prevFormulas[c] !== "") {
          prevRowRange.getCell(1, c + 1).copyTo(newRowRange.getCell(1, c + 1), SpreadsheetApp.CopyPasteType.PASTE_FORMULA);
        }
      }
    }

    return successResult(null, "New entry added successfully!");

  } catch (error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    return failureResult("Server Error: " + error.toString());
  }
}

/******************************************************************************
 * Update Existing Entry in HOME_DATA (Admin Only)
 ******************************************************************************/
function updateHomeDataEntry(sessionId, rowIndex, updatedDataObj) {
  try {
    if (!sessionId || !rowIndex || !updatedDataObj) {
      return failureResult("Invalid request parameters.");
    }

    // 1. Verify Session & Get Logged-in User ID
    const sessionRes = isSessionValid(sessionId);
    if (!sessionRes || !sessionRes.success) {
      return failureResult("Invalid session. Please log in again.");
    }
    const currentUserId = String(sessionRes.data.USER_ID).trim();

    // 2. Verify ADMIN Role
    let userRole = 'USER';
    const userDbNames = ["USERS", "USER_MASTER", "Users", "User_Master"];
    for (let u = 0; u < userDbNames.length; u++) {
      let uRes = dbGetData(userDbNames[u]);
      if (uRes && uRes.success && uRes.data) {
        let matchUser = uRes.data.find(function(row) {
          var uid = row.USER_ID || row.UserId || row.User_ID || "";
          return String(uid).trim().toLowerCase() === currentUserId.toLowerCase();
        });
        if (matchUser && matchUser.ROLE_ID) {
          userRole = String(matchUser.ROLE_ID).trim().toUpperCase();
          break;
        }
      }
    }

    if (userRole !== 'ADMIN') {
      return failureResult("Access denied. Only ADMIN users can modify table records.");
    }

    // 3. Locate HOME_DATA Sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    let targetSheet = null;

    for (let i = 0; i < sheets.length; i++) {
      let sName = sheets[i].getName().trim().toUpperCase().replace(/_/g, "").replace(/\s/g, "");
      if (sName === "HOMEDATA" || sName === "HOMEPAGEDATA" || sName === "DATA") {
        targetSheet = sheets[i];
        break;
      }
    }

    if (!targetSheet) {
      return failureResult("Sheet tab 'HOME_DATA' not found in spreadsheet.");
    }

    const targetRowIndex = parseInt(rowIndex, 10);
    if (isNaN(targetRowIndex) || targetRowIndex <= 1 || targetRowIndex > targetSheet.getLastRow()) {
      return failureResult("Invalid row index provided.");
    }

    // 4. Update Non-Formula Cells in Row
    const headers = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
    const existingFormulas = targetSheet.getRange(targetRowIndex, 1, 1, headers.length).getFormulas()[0];

    headers.forEach(function(header, colIdx) {
      const cleanHeader = String(header).trim();
      
      // Only update if column does not contain a formula and a new value is passed
      if (existingFormulas[colIdx] === "" && updatedDataObj.hasOwnProperty(cleanHeader)) {
        let val = updatedDataObj[cleanHeader];
        targetSheet.getRange(targetRowIndex, colIdx + 1).setValue(val);
      }
    });

    return successResult(null, "Record on Row " + targetRowIndex + " updated successfully!");

  } catch (error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    return failureResult("Server Error: " + error.toString());
  }
}
