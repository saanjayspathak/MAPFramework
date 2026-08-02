function processRequest(e) {

  try {

    const action = getAction(e);

    switch(action){

      case "PING":
        return ping();

  case "APPINFO":
    return getAppInfo();

     default:
        return errorResponse("Invalid Action");

    }

  }
  catch(err){

    return errorResponse(err.toString());

  }

}




function getAction(e){

    if(!e.parameter.action)
        return "";

    return e.parameter.action.toUpperCase();

}

function getSpreadsheet(){

    return SpreadsheetApp.getActiveSpreadsheet();

}





/******************************************************************************
 * MAP Framework v1.0
 * Module : Utility
 * File   : Utility.gs
 * Purpose: Common Utility Functions
 ******************************************************************************/

/******************************************************************************
 * Success Result
 ******************************************************************************/
function successResult(data, message) {

  return {
    success: true,
    message: message || '',
    data: data || null
  };

}


/******************************************************************************
 * Failure Result
 ******************************************************************************/
function failureResult(message, data) {

  return {
    success: false,
    message: message || '',
    data: data || null
  };

}


/**************************************************************************
 * Generate ID
 **************************************************************************/

function generateId(prefix) {

  try {

    const result = dbGetData(SHEETS.SEQUENCE_MASTER);

    if (!result.success) {
      return result;
    }

    const sequence = result.data.find(function(row) {
      return row.PREFIX === prefix;
    });

    if (!sequence) {
      return failureResult("Invalid Prefix : " + prefix);
    }

    const nextNumber = Number(sequence.LAST_NUMBER) + 1;

    const update = dbUpdate(
      SHEETS.SEQUENCE_MASTER,
      { PREFIX: prefix },
      { LAST_NUMBER: nextNumber }
    );

    if (!update.success) {
      return update;
    }

    return successResult(
      prefix + leftPad(nextNumber, 7)
    );

  }
  catch (error) {

    ErrorLog(error);

    throw error;

  }

}

/******************************************************************************
 * Left Pad
 ******************************************************************************/
function leftPad(number, length) {

  return String(number).padStart(length, '0');

}


/******************************************************************************
 * Is Blank
 ******************************************************************************/
function isBlank(value) {

  return value === null ||
         value === undefined ||
         String(value).trim() === '';

}


/******************************************************************************
 * Format Date
 ******************************************************************************/
function formatDate(date) {

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'dd-MMM-yyyy HH:mm:ss'
  );

}



/******************************************************************************
 * Safe Sheet Lookup
 ******************************************************************************/
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!sheetName) {
    throw new Error("Sheet name is null or undefined.");
  }

  // 1. Try exact match
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  // 2. Try common fallback names if initial lookup fails
  const fallbacks = ["USER_MASTER", "Users", "User_Master", "USERS", "UserMaster"];
  for (let i = 0; i < fallbacks.length; i++) {
    sheet = ss.getSheetByName(fallbacks[i]);
    if (sheet) return sheet;
  }

  // 3. Fallback to the first sheet in the document
  const allSheets = ss.getSheets();
  if (allSheets.length > 0) {
    return allSheets[0];
  }

  throw new Error("No sheet found in active spreadsheet named: " + sheetName);
}

/******************************************************************************
 * Safe dbGetData
 ******************************************************************************/
function dbGetData(sheetName) {
  try {
    const sheet = getSheet(sheetName);
    
    if (!sheet) {
      return failureResult("Spreadsheet tab '" + sheetName + "' could not be found.");
    }

    const data = sheet.getDataRange().getValues();

    if (!data || data.length <= 1) {
      return successResult([]); // Empty sheet or header only
    }

    const headers = data[0];
    const rows = data.slice(1);

    const result = rows.map(function(row) {
      const obj = {};
      headers.forEach(function(header, index) {
        obj[header] = row[index];
      });
      return obj;
    });

    return successResult(result);

  } catch (error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    return failureResult(error.message || error.toString());
  }
}
