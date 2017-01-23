//import {} from '../common/logWithDate.js';
import Messenger from '../common/messenger.js';
import Messages from '../common/messages.js';
import { startInspect, stopInspect } from './inspect.js';

let messenger = new Messenger();
let isRestylerReady = false;
let isTopPage;
try {
    isTopPage = window.self === window.top;
} catch (e) {
    isTopPage = false;
}

Restyler.init();

let messageHandler = function(message, sender, sendResponse) {
    //console.log('content_script messageHandler()', arguments);

    if (message.name === Messages.ACTION) {
        // Check that we are ready to receive action messages...
        if (isRestylerReady) {
            //console.log('[got message from extension]', message);

            if (message.method) {
                applyRestylerMethod(message.method, message.arguments);
            }

            // Let only the top window (not iframes) return the responses.
            if (isTopPage) {
                sendResponse({
                    rules: Restyler.getRules(),
                    isEnabled: Restyler.isEnabled()
                });
            }
        }
    } else if (message.name === Messages.START_INSPECT) {
        startInspect();
    } else if (message.name === Messages.STOP_INSPECT) {
        stopInspect();
    }

    // Messages that only the top page should handle (not iframes).
    if (isTopPage) {
        if (message.name === Messages.IS_RESTYLER_READY) {
            sendResponse(isRestylerReady);
        }
    }
};

messenger.initConnection('content_script', 'main', messageHandler);

// Passing through the background page because devtool window might be closed
// and we won't know because no response will be sent.
messenger.sendMessageToHub({ name: Messages.GET_CURRENT_STATE }, function(response) {
    //console.log('content_script getCurrentState response', arguments);

    Restyler.setRules(response.rules);
    if (response.enabled) {
        Restyler.applyAll();
    } else {
        Restyler.disableAll();
    }

    if (response.textEditingEnabled) {
        Restyler.enableTextEditing();
    }

    // Set 'ready' and if we are the top page, send the 'restylerReady' event.
    isRestylerReady = true;
    if (isTopPage) {
        messenger.sendMessage('devtool', 'main', { name: Messages.RESTYLER_READY });    
    }
});

let applyRestylerMethod = function(method, args) {
    if (typeof Restyler[method] === 'function') {
        Restyler[method].apply(null, args);
    } else {
        throw new Error('Error - no method exists in Restyler: ' + method);
    }
};