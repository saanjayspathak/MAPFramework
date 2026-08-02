function successResponse(message,data){

    return ContentService
        .createTextOutput(
            JSON.stringify({
                success:true,
                message:message,
                data:data
            })
        )
        .setMimeType(ContentService.MimeType.JSON);

}

function errorResponse(message){

    return ContentService
        .createTextOutput(
            JSON.stringify({
                success:false,
                message:message,
                data:null
            })
        )
        .setMimeType(ContentService.MimeType.JSON);

}
