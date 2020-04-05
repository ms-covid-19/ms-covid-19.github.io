'use strict';

function ajax(url, responseType) {
    if (url.__proto__ == Array.prototype) {
        var promises = new Array(url.length);
        for (var i = 0; i < url.length; ++i) {
            if (url[i].__proto__ == String.prototype) {
                promises[i] = ajax(url[i]);
            } else {
                promises[i] = ajax(url[i].url, url[i].responseType);
            }
        }
        
        return Promise.all(promises);
    }
    
    return new Promise(function(resolve, reject) {
        var ajaxResponse = new XMLHttpRequest();

        var isFinishedRequest = false;
        var bytesRecievedOnLastQuant = 0;
        
        function internalAjaxCallback(e) {
            if (isFinishedRequest) {
                return;
            }
            
            if (ajaxResponse.readyState !== 4) {
                return;
            }
            
            isFinishedRequest = true;
            
            if (ajaxResponse.status !== 200 ||
                ajaxResponse.response === null) {
                
                reject(ajaxResponse);
                return;
            }
            
            resolve(ajaxResponse);
        }
        
        ajaxResponse.open('GET', url, /*async=*/true);
        ajaxResponse.onreadystatechange = internalAjaxCallback;
        if (responseType) {
            ajaxResponse.responseType = responseType;
        }
        
        ajaxResponse.send(null);
        
        return ajaxResponse;
    });
}