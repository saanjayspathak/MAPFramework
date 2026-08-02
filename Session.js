/******************************************************************************
 * MAP Framework v1.0
 * Module : Session
 * File   : Session.gs
 * Purpose: User Session Management
 ******************************************************************************/

/******************************************************************************
 * Create Session
 ******************************************************************************/
function createSession(userId) {

  try {

    const sessionId = generateUUID();

    const now = new Date();

    const rowData = {

      SESSION_ID: sessionId,
      USER_ID: userId,
      LOGIN_TIME: now,
      LAST_ACTIVITY: now,
      STATUS: 'ACTIVE'

    };

    const result = dbInsert(SHEETS.USER_SESSION, rowData);

    if (!result.success) {

      return result;

    }

    return successResult(sessionId);

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/******************************************************************************
 * Get Session
 ******************************************************************************/
function getSession(sessionId) {

  try {

    const result = dbGetData(SHEETS.USER_SESSION);

    if (!result.success) {

      return result;

    }

    const session = result.data.find(function(row) {

      return row.SESSION_ID === sessionId;

    });

    if (!session) {

      return failureResult('Session not found.');

    }

    return successResult(session);

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/******************************************************************************
 * Is Session Valid
 ******************************************************************************/
function isSessionValid(sessionId) {


  try {

    const result = getSession(sessionId);

    if (!result.success) {

      return result;

    }

    const session = result.data;

    if (session.STATUS !== 'ACTIVE') {

      return failureResult('Session is inactive.');

    }

    const lastActivity = new Date(session.LAST_ACTIVITY);

    const now = new Date();

    const minutes = (now - lastActivity) / 60000;

    if (minutes > SECURITY.SESSION_TIMEOUT) {

      return failureResult('Session expired.');

    }

    return successResult(session);

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/******************************************************************************
 * Update Session
 ******************************************************************************/
function updateSession(sessionId) {

  try {

    return dbUpdate(
      SHEETS.USER_SESSION,
      { SESSION_ID: sessionId },
      {
        LAST_ACTIVITY: new Date()
      }
    );

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/******************************************************************************
 * Delete Session
 ******************************************************************************/
/******************************************************************************
 * Delete Session
 ******************************************************************************/

function deleteSession(sessionId) {

  try {

    return dbUpdate(

      SHEETS.USER_SESSION,

      { SESSION_ID: sessionId },

      {

        STATUS: "LOGOUT",

        LAST_ACTIVITY: new Date()

      }

    );

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}