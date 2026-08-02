/**************************************************************************
 * MAP Framework v1.0
 * Module : Security
 * File   : Security.gs
 * Purpose: Generic Security Functions
 **************************************************************************/


/**************************************************************************
 * Hash Password
 **************************************************************************/


function hashPassword(password) {

  try {

    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password
    );

    return bytes.map(function(b) {

      const value = (b < 0) ? b + 256 : b;

      return ('0' + value.toString(16)).slice(-2);

    }).join('');

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/**************************************************************************
 * Verify Password
 **************************************************************************/

function verifyPassword(password, storedHash) {

  try {

    return hashPassword(password) === storedHash;

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/**************************************************************************
 * Generate OTP
 **************************************************************************/

function generateOTP(length) {

  try {

    length = length || SECURITY.OTP_LENGTH;

    let otp = '';

    for (let i = 0; i < length; i++) {

      otp += Math.floor(Math.random() * 10);

    }

    return otp;

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/**************************************************************************
 * Generate UUID
 **************************************************************************/

function generateUUID() {

  try {

    return Utilities.getUuid();

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/**************************************************************************
 * Generate Session ID
 **************************************************************************/

function generateSessionId() {

  try {

    return generateUUID();

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/**************************************************************************
 * Generate Random Number
 **************************************************************************/

function generateRandomNumber(length) {

  try {

    let number = '';

    for (let i = 0; i < length; i++) {

      number += Math.floor(Math.random() * 10);

    }

    return number;

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/**************************************************************************
 * Generate Random String
 **************************************************************************/

function generateRandomString(length) {

  try {

    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    let text = '';

    for (let i = 0; i < length; i++) {

      text += chars.charAt(Math.floor(Math.random() * chars.length));

    }

    return text;

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/**************************************************************************
 * Generate Token
 **************************************************************************/

function generateToken(length) {

  try {

    length = length || SECURITY.TOKEN_LENGTH;

    return generateRandomString(length);

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/**************************************************************************
 * Current Timestamp
 **************************************************************************/

function getCurrentTimestamp() {

  try {

    return new Date();

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}


/**************************************************************************
 * Expiry Timestamp
 **************************************************************************/

function getExpiryTimestamp(minutes) {

  try {

    const expiry = new Date();

    expiry.setMinutes(expiry.getMinutes() + minutes);

    return expiry;

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}
