/**
 * =====================================================
 * Function : dbGetSheet
 * Purpose  : Returns sheet object
 * =====================================================
 */
function dbGetSheet(sheetName){

  return SpreadsheetApp
         .getActiveSpreadsheet()
         .getSheetByName(sheetName);

}
/**
 * =====================================================
 * Function : dbGetData
 * Purpose  : Returns complete sheet data
 * =====================================================
 */


/******************************************************************************
 * Get Data
 ******************************************************************************/
function dbGetData(sheetName) {

  try {

    const sheet = dbGetSheet(sheetName);

    const values = sheet.getDataRange().getValues();

    if (values.length <= 1) {

      return successResult([]);

    }

    const headers = values[0];

    const data = [];

    for (let i = 1; i < values.length; i++) {

      const row = {};

      for (let j = 0; j < headers.length; j++) {

        row[headers[j]] = values[i][j];

      }

      data.push(row);

    }

    return successResult(data);

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/**
 * =====================================================
 * Function : dbInsert
 * Purpose  : Inserts one record
 * =====================================================
 */
/******************************************************************************
 * Insert Record
 ******************************************************************************/
function dbInsert(sheetName, rowData) {

  try {

    const sheet = dbGetSheet(sheetName);

    const headers = dbHeader(sheetName);

    const row = headers.map(function(header) {

      return rowData[header] !== undefined ? rowData[header] : '';

    });

    sheet.appendRow(row);

    return successResult();

  }

  catch(error) {

    ErrorLog(error);

    throw error;

  }

}
/**
 * =====================================================
 * Function : dbLastRow
 * Purpose  : Returns last row
 * =====================================================
 */
function dbLastRow(sheetName){

    return dbGetSheet(sheetName)
            .getLastRow();

}
/**
 * =====================================================
 * Function : dbHeader
 * Purpose  : Returns column headers
 * =====================================================
 */

function dbHeader(sheetName) {

  try {

    const sheet = dbGetSheet(sheetName);

    return sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];

  }
  catch (error) {

    ErrorLog(error);

    throw error;

  }

}

/**************************************************************************
 * Update Record
 **************************************************************************/

function dbUpdate(sheetName, where, updateData) {

  try {

    const sheet = dbGetSheet(sheetName);

    const values = sheet.getDataRange().getValues();

    if (values.length <= 1) {
      return failureResult("No data found.");
    }

    const headers = values[0];

    for (let i = 1; i < values.length; i++) {

      let match = true;

      for (const key in where) {

        const col = headers.indexOf(key);

        if (col === -1 || values[i][col] != where[key]) {
          match = false;
          break;
        }

      }

      if (match) {

        for (const key in updateData) {

          const col = headers.indexOf(key);

          if (col !== -1) {
            values[i][col] = updateData[key];
          }

        }

        sheet
          .getRange(i + 1, 1, 1, headers.length)
          .setValues([values[i]]);

        return successResult();

      }

    }

    return failureResult("Record not found.");

  }
  catch (error) {

    ErrorLog(error);

    throw error;

  }

}
