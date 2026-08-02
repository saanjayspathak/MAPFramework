function getSetting(key){

  const sh = getSheet(SHEETS.SETTINGS);

  const data = sh.getDataRange().getValues();

  for(let i=1;i<data.length;i++){

      if(data[i][0]==key){

          return data[i][1];

      }

  }

  return "";

}

function getAppInfo(){

    return successResponse(

        "Configuration Loaded",

        {

            AppName : getSetting("APP_NAME"),

            Version : getSetting("APP_VERSION"),

            OTPMode : getSetting("OTP_MODE")

        }

    );

}

