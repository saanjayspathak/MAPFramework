function validateRequired(value, fieldName) {

  try {

    if (value === null || value === undefined || String(value).trim() === '') {

      return failureResult(fieldName + ' is required.');

    }

    return successResult();

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}
function validateEmail(email) {

  try {

    if (email === '') {

      return failureResult('Email is required.');

    }

    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!pattern.test(email)) {

      return failureResult('Invalid email address.');

    }

    return successResult();

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}

function validateMobile(mobile) {

  try {

    if (!/^\d{10}$/.test(mobile)) {

      return failureResult('Mobile number must be 10 digits.');

    }

    return successResult();

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}
function validateMinLength(value, minLength, fieldName) {

  try {

    if (String(value).length < minLength) {

      return failureResult(fieldName + ' must be at least ' + minLength + ' characters.');

    }

    return successResult();

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}
function validateMaxLength(value, maxLength, fieldName) {

  try {

    if (String(value).length > maxLength) {

      return failureResult(fieldName + ' cannot exceed ' + maxLength + ' characters.');

    }

    return successResult();

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}
function validateMatch(value1, value2, message) {

  try {

    if (value1 !== value2) {

      return failureResult(message);

    }

    return successResult();

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}
function validateDuplicate(sheetName, fieldName, value) {

  try {

    // Call Database.gs function here
    // Return success if not found
    // Return failure if duplicate exists

  }

  catch (error) {

    ErrorLog(error);

    throw error;

  }

}
