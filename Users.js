/******************************************************************************
 * MAP Framework v1.0
 * Module : User
 * File   : User.gs
 * Purpose: User Management
 ******************************************************************************/

/******************************************************************************
 * Register User
 ******************************************************************************/
function registerUser(user) {
  try {
    Logger.log("Step 1 - registerUser started");

    let result;

    result = validateRequired(user.FULL_NAME, 'Full Name');
    if (!result.success) return result;

    result = validateRequired(user.MOBILE, 'Mobile');
    if (!result.success) return result;

    result = validateMobile(user.MOBILE);
    if (!result.success) return result;

    result = validateRequired(user.EMAIL, 'Email');
    if (!result.success) return result;

    result = validateEmail(user.EMAIL);
    if (!result.success) return result;

    result = validateRequired(user.PASSWORD, 'Password');
    if (!result.success) return result;

    result = validateMinLength(
      user.PASSWORD,
      SECURITY.PASSWORD_MIN_LENGTH,
      'Password'
    );
    if (!result.success) return result;

    // Make sure sheet reference matches your constants (USERS)
    const sheetKey = SHEETS.USERS;
    const users = dbGetData(sheetKey);

    if (!users.success) {
      return users;
    }

    const duplicate = users.data.find(function(row) {
      return String(row.MOBILE) === String(user.MOBILE) ||
             String(row.EMAIL).toLowerCase() === String(user.EMAIL).toLowerCase();
    });

    if (duplicate) {
      return failureResult('Mobile or Email is already registered.');
    }

    Logger.log("Step 2 - Validation completed");
    Logger.log("Step 3 - Generating User ID");

    const userIdRes = generateId('USR');

    if (!userIdRes || !userIdRes.success) {
      Logger.log("ID Generation Failed:", userIdRes);
      return userIdRes || failureResult("Failed to generate User ID.");
    }

    const newUserId = userIdRes.data;

    const rowData = {
      USER_ID : newUserId,
      FULL_NAME : user.FULL_NAME,
      MOBILE : user.MOBILE,
      EMAIL : user.EMAIL,
      PASSWORD : typeof hashPassword === 'function' ? hashPassword(user.PASSWORD) : user.PASSWORD,
      ROLE_ID : 'USER',
      STATUS : 'ACTIVE'
    };

    result = dbInsert(sheetKey, rowData);

    if (!result.success) {
      return result;
    }

    Logger.log("Step 4 - User inserted successfully");

    return successResult(
      { USER_ID: newUserId },
      'User registered successfully.'
    );

  } catch(error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    return failureResult(error.toString());
  }
}




/******************************************************************************
 * Logout User
 ******************************************************************************/

function logoutUser(sessionId){

  try{

    return deleteSession(sessionId);

  }

  catch(error){

    ErrorLog(error);

    throw error;

  }

}


/******************************************************************************
 * Change Password
 ******************************************************************************/

function changePassword(){

  return failureResult('Not Implemented.');

}


/******************************************************************************
 * Reset Password
 ******************************************************************************/

function resetPassword(){

  return failureResult('Not Implemented.');

}


/******************************************************************************
 * Verify OTP
 ******************************************************************************/

function verifyOTP(){

  return failureResult('Not Implemented.');

}



/******************************************************************************
 * Get OTP Settings from SETTINGS Sheet
 ******************************************************************************/
function getOtpSettings() {
  try {
    const settingsRes = dbGetData('SETTINGS');
    let emailOtp = '123456';
    let mobileOtp = '654321';

    if (settingsRes && settingsRes.success && settingsRes.data) {
      settingsRes.data.forEach(function(row) {
        if (row.Key === 'EMAIL_OTP') emailOtp = String(row.Value).trim();
        if (row.Key === 'MOBILE_OTP') mobileOtp = String(row.Value).trim();
      });
    }

    return {
      EMAIL_OTP: emailOtp,
      MOBILE_OTP: mobileOtp
    };
  } catch (err) {
    return { EMAIL_OTP: '123456', MOBILE_OTP: '654321' };
  }
}

/******************************************************************************
 * Verify Both Email & Mobile Dummy OTPs
 ******************************************************************************/
function verifyDummyOTP(emailOtp, mobileOtp, userId) {
  try {
    if (!emailOtp || !mobileOtp) {
      return failureResult('Please enter both Email and Mobile OTPs.');
    }

    const expected = getOtpSettings();

    // Validate Email OTP
    if (String(emailOtp).trim() !== expected.EMAIL_OTP) {
      return failureResult('Invalid Email OTP. (Hint: ' + expected.EMAIL_OTP + ')');
    }

    // Validate Mobile OTP
    if (String(mobileOtp).trim() !== expected.MOBILE_OTP) {
      return failureResult('Invalid Mobile OTP. (Hint: ' + expected.MOBILE_OTP + ')');
    }

    // Create active session upon successful double OTP verification
    const sessionRes = createSession(userId);
    if (!sessionRes || !sessionRes.success) {
      return failureResult('Failed to create user session.');
    }

    return successResult({
      SESSION_ID: sessionRes.data,
      USER_ID: userId
    }, 'OTP Verification Successful!');

  } catch (error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    return failureResult('OTP Verification Error: ' + error.toString());
  }
}


/******************************************************************************
 * Login User (Hash-Safe Version)
 ******************************************************************************/
function loginUser(loginId, password) {
  try {
    if (!loginId || String(loginId).trim() === "") {
      return failureResult("Please enter Mobile or Email.");
    }
    if (!password || String(password).trim() === "") {
      return failureResult("Please enter Password.");
    }

    // 1. Fetch Users Sheet
    const sheetKey = (typeof SHEETS !== 'undefined' && SHEETS.USERS) ? SHEETS.USERS : 'USERS';
    const dbResult = dbGetData(sheetKey);

    if (!dbResult || !dbResult.success) {
      return failureResult("Database Error: Could not read sheet '" + sheetKey + "'.");
    }

    // 2. Search for User
    const searchKey = String(loginId).trim().toLowerCase();
    
    const user = dbResult.data.find(function(row) {
      if (!row) return false;
      const mob = row.MOBILE ? String(row.MOBILE).trim().toLowerCase() : "";
      const email = row.EMAIL ? String(row.EMAIL).trim().toLowerCase() : "";
      return mob === searchKey || email === searchKey;
    });

    if (!user) {
      return failureResult("Invalid Mobile/Email or Password.");
    }

    if (user.STATUS && String(user.STATUS).toUpperCase() !== 'ACTIVE') {
      return failureResult("User account is inactive.");
    }

    // 3. Password Hashing & Verification
    const inputPass = String(password).trim();
    const dbPass = user.PASSWORD ? String(user.PASSWORD).trim() : "";

    let isMatch = false;

    if (typeof verifyPassword === 'function') {
      isMatch = verifyPassword(inputPass, dbPass);
    } else if (typeof hashPassword === 'function') {
      // Hash the entered password before comparing with DB SHA-256 hash
      isMatch = (hashPassword(inputPass) === dbPass) || (inputPass === dbPass);
    } else {
      isMatch = (inputPass === dbPass);
    }

    if (!isMatch) {
      return failureResult("Invalid Mobile/Email or Password.");
    }

    // 4. Trigger Dummy OTP Flow
    const otpSettings = getOtpSettings();

    return successResult({
      REQUIRES_OTP: true,
      USER_ID: user.USER_ID,
      EMAIL: user.EMAIL,
      MOBILE: user.MOBILE,
      HINT_EMAIL_OTP: otpSettings.EMAIL_OTP,
      HINT_MOBILE_OTP: otpSettings.MOBILE_OTP
    }, "Credentials verified. Please complete OTP verification.");

  } catch (err) {
    if (typeof ErrorLog === 'function') ErrorLog(err);
    return failureResult("Server Error: " + err.toString());
  }
}


/******************************************************************************
 * Forgot Password - Verify Identity & Send OTP Hint
 ******************************************************************************/
function processForgotPasswordRequest(email, mobile) {
  try {
    if (!email || !mobile) {
      return failureResult("Please enter both registered Email and Mobile Number.");
    }

    const usersRes = dbGetData(SHEETS.USERS || "USERS");
    if (!usersRes || !usersRes.success) {
      return failureResult("Failed to access USERS database.");
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMobile = String(mobile).trim().toLowerCase();

    const user = usersRes.data.find(function(u) {
      const e = u.EMAIL ? String(u.EMAIL).trim().toLowerCase() : "";
      const m = u.MOBILE ? String(u.MOBILE).trim().toLowerCase() : "";
      return e === cleanEmail && m === cleanMobile;
    });

    if (!user) {
      return failureResult("No account found matching this Email and Mobile combination.");
    }

    const otpSettings = getOtpSettings();

    return successResult({
      USER_ID: user.USER_ID,
      HINT_EMAIL_OTP: otpSettings.EMAIL_OTP,
      HINT_MOBILE_OTP: otpSettings.MOBILE_OTP
    }, "Identity verified. Please enter the OTPs sent to your Email and Mobile.");

  } catch (error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    return failureResult("Server Error: " + error.toString());
  }
}

/******************************************************************************
 * Forgot Password - Update New Password in Spreadsheet
 ******************************************************************************/
function resetUserPassword(userId, newPassword) {
  try {
    if (!userId || !newPassword) {
      return failureResult("User ID or New Password missing.");
    }

    const sheetName = SHEETS.USERS || "USERS";
    const sheet = getSheet(sheetName);
    if (!sheet) {
      return failureResult("USERS sheet not found.");
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return failureResult("USERS sheet has no records.");
    }

    const headers = data[0];
    const userIdIdx = headers.indexOf("USER_ID");
    const passIdx = headers.indexOf("PASSWORD");

    if (userIdIdx === -1 || passIdx === -1) {
      return failureResult("Required column headers USER_ID or PASSWORD missing.");
    }

    let userRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][userIdIdx]).trim() === String(userId).trim()) {
        userRowIndex = i + 1; // 1-based index for Apps Script range
        break;
      }
    }

    if (userRowIndex === -1) {
      return failureResult("User record not found in database.");
    }

    // Hash password if hashPassword function exists, else save raw
    let finalPass = String(newPassword).trim();
    if (typeof hashPassword === 'function') {
      finalPass = hashPassword(finalPass);
    }

    // Update cell in USERS sheet
    sheet.getRange(userRowIndex, passIdx + 1).setValue(finalPass);

    return successResult(null, "Password updated successfully! You can now log in with your new password.");

  } catch (error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    return failureResult("Server Error: " + error.toString());
  }
}

/******************************************************************************
 * Forgot User ID - Recover Registered User ID
 ******************************************************************************/
function recoverUserId(email, mobile) {
  try {
    if (!email || !mobile) {
      return failureResult("Please enter both registered Email and Mobile Number.");
    }

    const usersRes = dbGetData(SHEETS.USERS || "USERS");
    if (!usersRes || !usersRes.success) {
      return failureResult("Failed to access USERS database.");
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMobile = String(mobile).trim().toLowerCase();

    const user = usersRes.data.find(function(u) {
      const e = u.EMAIL ? String(u.EMAIL).trim().toLowerCase() : "";
      const m = u.MOBILE ? String(u.MOBILE).trim().toLowerCase() : "";
      return e === cleanEmail && m === cleanMobile;
    });

    if (!user) {
      return failureResult("No account found matching this Email and Mobile combination.");
    }

    const otpSettings = getOtpSettings();

    return successResult({
      USER_ID: user.USER_ID,
      FULL_NAME: user.FULL_NAME,
      HINT_EMAIL_OTP: otpSettings.EMAIL_OTP,
      HINT_MOBILE_OTP: otpSettings.MOBILE_OTP
    }, "Identity verified. Please complete OTP verification to view your User ID.");

  } catch (error) {
    if (typeof ErrorLog === 'function') ErrorLog(error);
    return failureResult("Server Error: " + error.toString());
  }
}
