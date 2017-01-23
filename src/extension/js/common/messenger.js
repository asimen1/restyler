/* 
 TODOS:
    * Make it a node module [npm package] (that works in the browser with some packing... similar to react).
    * Rethink API (constructor instead 'initConnetion').
    * Validate not calling any api before 'initConnection' (initConnection can return the api...).
    * Test with popup extension part & with event page.
    * Test messages in the same extension part, for example content_script to content_script.
    * Rethink API (constructor instead 'initConnetion') + hub in background but still use initConnection in background (like any other extension part, then dont need sendmessagetohub, send hubmessage ?)
    * Seperate backgroundhub code to another file?
*/

/* NOTE DOCS: 

1 - In all background + devtool + content script
-------------------------------------------------------------------------------------
import Messenger from '../common/messenger.js';
let bgMessenger = new Messenger(); / let dtMessenger = new Messenger(); / let csMessenger = new Messenger();

2 - init hub using "initBackgroundHub(messageHandler, options)"
-------------------------------------------------------------------------------------
// background.js
let messageHandler = function(message, sender, sendResponse) {
    if (message.name === 'how are you?') {
        sendResponse('you know... running in the background...');
    }
};

bgMessenger.initBackgroundHub(messageHandler, {
    contentScriptConnectionInitHandler: function() {}, // optional - handler that will be called every time script tool inited a new connection.
    devtoolConnectionInitHandler: function() {}, // optional - handler that will be called every time devtool inited a new connection.
    devtoolDisconnectHandler: function() {} // optional - handler that will be called when devtool has closed/disconnected.
});

3 - init extension parts using "initConnection(extensionPart, connectionName, messageHandler)"
-------------------------------------------------------------------------------------
// devtool.js
let messageHandler = function(message, sender, sendResponse) {
    if (message.name === 'how are you?') {
        sendResponse('debugging all night long in the devtool...');
    }
};

dtMessenger.initConnection('devtool', 'dt-main', messageHandler);

// content_script.js
let messageHandler = function(message, sender, sendResponse) {
    if (message.name === 'how are you?') {
        sendResponse('I'm a content and I'm a script...');
    }
};

csMessenger.initConnection('content_script', 'cs-main', messageHandler);

4 - Start sending messages using the API:
"sendMessage(extensionPart, connectionName, message, responseCallback)" // between devtool & content script
"sendMessageToHub(message, responseCallback)" // from devtool/content script to background hub
"sendHubMessage(extensionPart, connectionName, tabId, message, responseCallback)" // from background hub to devtool/content script
-------------------------------------------------------------------------------------
// devtool -> content_script:
dtMessenger.sendMessage('content_script', 'cs-main', { name: 'how are you?' }, function(response) {
   console.log(response); // 'I'm a content and I'm a script...'
});

// content_script -> devtool:
csMessenger.sendMessage('devtool', 'dt-main' { name: 'how are you?' }, function(response) {
   console.log(response); // 'debugging all night long in the devtool...'
});

// devtool -> background:
dtMessenger.sendMessageToHub({ name: 'how are you?' }, function(response) {
   console.log(response); // 'you know... running in the background...'
});

// background -> devtool:
tabId = 150; // For hub sending message, specify which tab it should arrive to.
bgMessenger.sendHubMessage('devtool', 'dt-main', tabId, { name: 'how are you?' }, function(response) {
   console.log(response); // 'debugging all night long in the devtool...'
});

More:
-------------------------------------------------------------------------------------
* multiple 'toNames' to send message multiple names.

// background -> multiple content_script connections (will be sent by order in array):
bgMessenger.sendMessage('content_script', ['cs-main', 'cs-submodule'], { name: 'how are you?' });

* wildcard '*' toName, send to all names of this extension parts.

// content_script -> ALL devtool connections (order not guaranteed):
csMessenger.sendMessage('devtool', '*', { name: 'how are you?' });

Notes:
-------------------------------------------------------------------------------------
* all directions of messages are supported (bg -> dt/cs, cs->bg/dt, dt->bg/cs)
* using only long lived ports via chrome.runtime.* API (no chrome.tabs.*) [thats why can work with devtool].
* Messenger messageHandler and chrome.runtime.onMessage similarities and differences:
  Same:
  * "sender" object.
  + "sendResponse" - The argument should be any JSON-ifiable object.
  * "sendResponse" - With multiple message handler, the sendResponse() will work only for the first one to respond.
  Different:
  - Async sendResponse is supported directly (no need to return "true" value like chrome.runtime.onMessage usage).
*/

'use strict';

// --------------------------------------------------------
// CONSTANTS
// --------------------------------------------------------

const extensionParts = {
    BACKGROUND: 'background',
    POPUP: 'popup',
    DEVTOOL: 'devtool',
    CONTENT_SCRIPT: 'content_script'
};

const messageTypes = {
    INIT: 'init',
    INIT_SUCCESS: 'init_success',
    MESSAGE: 'message',
    RESPONSE: 'response'
};

// Used to identify port connections from Messenger API and user "chrome.runtime.connect".
const MESSENGER_PORT_NAME_PREFIX = '__messenger__';

const TO_NAME_WILDCARD = '*';
const BACKGROUND_HUB_PORT_NAME = 'background_hub';

const PENDING_CB_SIZE_CLEANUP_TRIGGER = 100000;
const PENDING_CB_SIZE_CLEANUP_AMOUNT = 5000;

// --------------------------------------------------------
// THE MESSENGER !
// --------------------------------------------------------

let Messenger = function() {
    //console.log('messenger constructor!');

    // Autobinding to ensure correct 'this' from all types of function invocations.
    for (var key in this) {
        if (typeof this[key] === 'function') {
            this[key] = this[key].bind(this);
        }
    }

    this._myExtPart = null;
    this._myName = null;
    this._userMessageHandler = null;

    this._pendingCb = {};
    this._cbId = 0;
    this._pendingCbCleanupIndex = 0;

    // Return the exposed API.
    return this._getExposedApi();
};

Messenger.prototype.constructor = Messenger;

// Private methods - start.
// ------------------------------------------------------------

Messenger.prototype._getExposedApi = function() {
    let exposedApi = {
        initBackgroundHub: this.initBackgroundHub,
        initConnection: this.initConnection,
        sendMessage: this.sendMessage,
        sendMessageToHub: this.sendMessageToHub,
        sendHubMessage: this.sendHubMessage
    };

    return exposedApi;
};

// Pending callback will get populated by unresponded callbacks.
// Clean up at sensible sizes.
Messenger.prototype._attemptDeadCbCleanup = function() {
    //console.log('_attemptDeadCbCleanup()', Object.keys(this._pendingCb).length);
    if (Object.keys(this._pendingCb).length > PENDING_CB_SIZE_CLEANUP_TRIGGER) {
        //console.log('_attemptDeadCbCleanup() cleaning');
        let cleanUpToIndex = this._pendingCbCleanupIndex + PENDING_CB_SIZE_CLEANUP_AMOUNT;
        while (this._pendingCbCleanupIndex < cleanUpToIndex) {
            delete this._pendingCb[this._pendingCbCleanupIndex];
            this._pendingCbCleanupIndex++;
        }

        //console.log('_attemptDeadCbCleanup() cleaning done', Object.keys(this._pendingCb).length);
    }
};

// Generic post message with callback support.
Messenger.prototype._postMessage = function(port, message, options) {
    if (this._inited) {
        options = options || {};

        if (options.cb) {
            if (options.cbAddedId) {
                message.cbId = options.cbAddedId;
            } else {
                this._cbId++;
                this._pendingCb[this._cbId] = options.cb;
                message.cbId = this._cbId;
            }

            this._attemptDeadCbCleanup();
        }

        port.postMessage(message);
    } else {
        this._pendingInitPostMessages.push({ message: message, options: options });
    }
};

Messenger.prototype._sendMessage = function(port, toExtPart, toName, tabId, userMessage, options) {
    // Add our port name prefix to the user given name (if given and not wildcard).
    toName = this._addMessengerPortNamePrefix(toName);

    let message = {
        from: this._myExtPart,
        fromName: this._myName,
        to: toExtPart,
        toName: toName || TO_NAME_WILDCARD,
        type: messageTypes.MESSAGE,
        userMessage: userMessage
    };

    // Important for relay...
    if (this._myExtPart === extensionParts.DEVTOOL) {
        message.tabId = chrome.devtools.inspectedWindow.tabId;
    }

    this._postMessage(port, message, options);
};

Messenger.prototype._addMessengerPortNamePrefix = function(toName) {
    let retVal = toName;

    // Only add if 'toName' given.
    // If given an array, add to each.
    // Wildcards '*' should stay intact.
    if (toName) {
        if (Array.isArray(toName)) {
            retVal = [];
            toName.forEach(function(currToName) {
                if (currToName !== TO_NAME_WILDCARD) {
                    retVal.push(MESSENGER_PORT_NAME_PREFIX + currToName);    
                }
            }.bind(this));
        } else if (toName !== TO_NAME_WILDCARD) {
            retVal = MESSENGER_PORT_NAME_PREFIX + toName;
        }
    }

    return retVal;
};

Messenger.prototype._shouldHandle = function(to, toName) {
    return to === this._myExtPart &&
           (toName === this._myName || toName === TO_NAME_WILDCARD || to === extensionParts.BACKGROUND);
};

// Handles ALL COMMUNICATION coming from devtool and content_scripts.
// Relays messages between components if needed.
Messenger.prototype._onPortMessageHandler = function(message, fromPort) {
    //console.log('Messenger - _onPortMessageHandler()', arguments);

    switch (message.type) {
        // Init: save the port for two way communication.
        case messageTypes.INIT: {
            let doInit = function(tabId, portsObj, connectionInitHandler) {
                portsObj[tabId] = portsObj[tabId] ? portsObj[tabId] : [];
                portsObj[tabId].push(fromPort);

                if (this._myName === BACKGROUND_HUB_PORT_NAME && connectionInitHandler) {
                    connectionInitHandler(fromPort, tabId);
                }

                fromPort.postMessage({ from: extensionParts.BACKGROUND, type: messageTypes.INIT_SUCCESS });              
            }.bind(this);

            if (message.from === extensionParts.DEVTOOL) {
                doInit(message.tabId, this._devtoolPorts, this._devtoolConnectionInitHandler);
            } else if (message.from === extensionParts.CONTENT_SCRIPT) {
                doInit(fromPort.sender.tab.id, this._contentScriptPorts, this._contentScriptConnectionInitHandler);
            } else {
                throw new Error('Unknown "from" in message: ' + message.from);
            }

            break;
        }

        case messageTypes.INIT_SUCCESS: {
            this._inited = true;
            this._pendingInitPostMessages.forEach(function(pendingInitMessage) {
                this._postMessage(this._port, pendingInitMessage.message, pendingInitMessage.options);
            }.bind(this));

            break;
        }

        // This cases our similar except the actual handling.
        case messageTypes.MESSAGE:
        case messageTypes.RESPONSE: {
            if (!message.to) { throw new Error('Missing "to" in message'); }
            if (!message.toName) { throw new Error('Missing "toName" in message'); }

            let to = message.to;
            let toNames = Array.isArray(message.toName) ? message.toName : [message.toName];
            toNames.forEach(function(toName) {
                if (to === this._myExtPart) {
                    if (this._shouldHandle(to, toName)) {
                        if (message.type === messageTypes.MESSAGE) {
                            this._handleMessage(message, fromPort);
                        } else if (message.type === messageTypes.RESPONSE) {
                            this._handleResponse(message);
                        }
                    }
                } else {
                    this._relayMessage(message, fromPort, to, toName);
                }
            }.bind(this));

            break;
        }

        default: {
            throw new Error('Unknown message type: ' + message.type);
        }
    }
};

Messenger.prototype._relayMessage = function(message, fromPort, to, toName) {
    //console.log('Messenger (background) - _relayMessage()', arguments);

    let tabId;
    if (message.from === extensionParts.DEVTOOL) {
        tabId = message.tabId;
    } else if (message.from === extensionParts.CONTENT_SCRIPT) {
        tabId = fromPort.sender.tab.id;       
    } else {
        throw new Error('Unknown "from" in message: ' + message.from);        
    }

    // Port might not exist, it can happen when:
    // - devtool window is not open.
    // - content_script is not running because the page is of chrome:// type.
    let toPorts;
    if (to === extensionParts.DEVTOOL) {
        toPorts = this._devtoolPorts[tabId] ? this._devtoolPorts[tabId] : [];
    } else if (to === extensionParts.CONTENT_SCRIPT) {
        toPorts = this._contentScriptPorts[tabId] ? this._contentScriptPorts[tabId] : [];
    } else {
        throw new Error('Unknown "to": ' + to);
    }

    // Go over the ports for this tab and send only to relevant names.
    let matchingToPorts = [];
    toPorts.forEach(function(toPort) {
        if (toPort.name === toName || toName === TO_NAME_WILDCARD) {
            matchingToPorts.push(toPort);
        }
    }.bind(this));

    // Send the message/s.
    matchingToPorts.forEach(function(matchingToPort) {
        this._postMessage(matchingToPort, message);
    }.bind(this));

    if (toPorts.length === 0) {
        //console.log('INFO - NOT SENDING RELAY BECAUSE PORT DOESNT EXIST');
    } else {
        if (matchingToPorts.length === 0) {
            //console.log('WARNING - COULD NOT FIND CONNECTIONS WITH THIS NAME (probably no such name):', toName);
        }
    }
};

Messenger.prototype._postResponse = function(responsePort, responseValue, origMessage) {
    let response = {
        from: this._myExtPart,
        to: origMessage.from,
        toName: origMessage.fromName,
        type: messageTypes.RESPONSE,
        cbId: origMessage.cbId,
        cbValue: responseValue
    };

    // Important for relay...
    if (this._myExtPart === extensionParts.DEVTOOL) {
        response.tabId = chrome.devtools.inspectedWindow.tabId;
    }

    this._postMessage(responsePort, response);
};

Messenger.prototype._handleMessage = function(message, fromPort) {
    let sendResponse = function(response) {
        // Message has callback... respond to it.
        if (message.cbId) {
            this._postResponse(fromPort, response, message);
        }
    }.bind(this);

    this._userMessageHandler(message.userMessage, fromPort.sender, sendResponse);
};

Messenger.prototype._handleResponse = function(response) {
    if (this._pendingCb[response.cbId]) {
        let cb = this._pendingCb[response.cbId];
        delete this._pendingCb[response.cbId];

        cb(response.cbValue);
    } else {
        //console.log('INFO - ignoring response sending because callback doesnt exist (probably already been called)');
    }
};

Messenger.prototype._onPortDisconnectionHandler = function(disconnectedPort) {
    //console.log('Messenger (background) - _onPortDisconnectionHandler()', arguments);

    // Remove our message listener.
    disconnectedPort.onMessage.removeListener(this._onPortMessageHandler);  

    let removePort = function(portsObj, disconnectedPort, disconnectHandler) {
        // NOTE: portKeys is the tab ids.
        let portKeys = Object.keys(portsObj);
        for (let i = 0; i < portKeys.length; i++) {
            let currPortKey = portKeys[i];

            // Remove according matching port, traverse backward to be able to remove them on th go.
            let portsArr = portsObj[currPortKey];
            let portsArrLength = portsArr.length;
            for (var j = portsArrLength; j >= 0; j--) {
                let port = portsArr[j];
                if (port === disconnectedPort) {
                    //console.log('Messenger (background) - _onPortDisconnectionHandler() - remove connection of port for tab id: ', currPortKey);
                    portsArr.splice(j, 1);
                }                
            }

            // If all ports removed, remove it from our stored ports object and
            // invoke disconnect handler if given.
            if (portsObj[currPortKey].length === 0) {
                //console.log('Messenger (background) - _onPortDisconnectionHandler() - removing empty ports object');
                delete portsObj[currPortKey];

                // Invoke handler if given (only background hub can use this).
                if (disconnectHandler) {
                    //console.log('Messenger (background) - _onPortDisconnectionHandler() - calling disconnect handler');

                    // Lets pass the tab id for which this port was working for (and
                    // not the devtool sender tab id which is "-1").
                    let tabId = parseInt(currPortKey);
                    disconnectHandler(disconnectedPort, tabId);
                }
            }
        }
    }.bind(this);

    removePort(this._devtoolPorts, disconnectedPort, this._devtoolDisconnectHandler);
    removePort(this._contentScriptPorts, disconnectedPort);
};

// Private methods - end.
// ------------------------------------------------------------

// Exposed API - start.
// ------------------------------------------------------------

Messenger.prototype.initBackgroundHub = function(messageHandler, options) {
    //console.log('Messenger (background) - initBackgroundHub()', arguments);

    this._inited = true;

    // Hold all connection ports made for each tab.
    this._devtoolPorts = {};
    this._contentScriptPorts = {};

    this._myExtPart = extensionParts.BACKGROUND;
    this._myName = BACKGROUND_HUB_PORT_NAME;
    this._userMessageHandler = messageHandler || function() {};

    this._contentScriptConnectionInitHandler = options.contentScriptConnectionInitHandler || function() {};
    this._devtoolConnectionInitHandler = options.devtoolConnectionInitHandler || function() {};
    this._devtoolDisconnectHandler = options.devtoolDisconnectHandler || function() {};

    // Listen to port connections.
    chrome.runtime.onConnect.addListener(function(port) {
        //console.log('Messenger (background) - runtime.onConnect', arguments);

        // Handle this port only if came from our API.
        if (port.name.indexOf(MESSENGER_PORT_NAME_PREFIX) === 0) {
            // Handle all incoming port messages.
            port.onMessage.addListener(this._onPortMessageHandler);

            // Cleanup on port disconnections, this takes care of all disconnections
            // (other extension parts create the connection with this port).
            port.onDisconnect.addListener(this._onPortDisconnectionHandler);
        }
    }.bind(this));
};

Messenger.prototype.initConnection = function(extPart, name, messageHandler) {
    //console.log('Nessenger - initConnection()', arguments);

    this._port = null;

    // MY TODO: validate connection not inited already and all needed parameters given.
    this._myExtPart = extPart;
    this._myName = MESSENGER_PORT_NAME_PREFIX + name;
    this._userMessageHandler = messageHandler || function() {};

    switch (extPart) {
        case extensionParts.POPUP: {
            throw new Error('not implemented yet...');
            break;
        }

        case extensionParts.DEVTOOL:
        case extensionParts.CONTENT_SCRIPT: {
            this._inited = false;
            this._pendingInitPostMessages = [];

            var doInitConnection = function() {
                this._port = chrome.runtime.connect({ name: this._myName });
                this._port.onMessage.addListener(this._onPortMessageHandler);

                let initMessage = {
                    from: extPart,
                    type: messageTypes.INIT
                };

                // Unlike content script which have the tab id in the "sender" object,
                // for devtool we need to set the tab id ourself.
                if (extPart === extensionParts.DEVTOOL) {
                    initMessage.tabId = chrome.devtools.inspectedWindow.tabId;
                }

                this._port.postMessage(initMessage);
            }.bind(this);

            doInitConnection();

            // NOTE: The init connection from the extension parts can be called before the 
            // NOTE: background hub has inited and started listening to connections.
            // NOTE: Retry init until we get the init success response from the background.
            // MY TODO: maybe can think of a better solution, like initConnection will return promise/callback when actually inited.
            var initInterval = setInterval(function() {
                if (!this._inited) {
                    this._port.disconnect();
                    doInitConnection();
                } else {
                    clearInterval(initInterval);
                }
            }.bind(this), 100);

            break;
        }

        default: {
            throw new Error('Unknown extension part: ' + extPart);
        }
    }
};

Messenger.prototype.sendMessage = function(toExtPart, toName, userMessage, cb) {
    this._sendMessage(this._port, toExtPart, toName, null, userMessage, { cb: cb });
};

Messenger.prototype.sendMessageToHub = function(userMessage, cb) {
    this._sendMessage(this._port, extensionParts.BACKGROUND, TO_NAME_WILDCARD, null, userMessage, { cb: cb });
};

Messenger.prototype.sendHubMessage = function(toExtPart, toName, tabId, userMessage, cb) {
    let portsObj;
    if (toExtPart === extensionParts.POPUP) {
        throw new Error('not implemented yet...');
    } else if (toExtPart === extensionParts.DEVTOOL) {
        portsObj = this._devtoolPorts;
    } else if (toExtPart === extensionParts.CONTENT_SCRIPT) {
        portsObj = this._contentScriptPorts;
    }

    // Get the ports for this tab, they might not exist if not inited yet.
    let portsArr = portsObj[tabId];
    if (portsArr) {
        portsArr.forEach(function(port) {
            // Add callback manually (and pass forward the id) in order for the callback to be added only once.
            // This also protects cases where a one response deleted the callback and the next message added it again.
            if (cb) {
                this._cbId++;
                this._pendingCb[this._cbId] = cb;
            }

            this._sendMessage(port, toExtPart, toName, tabId, userMessage, { cb: cb, cbAddedId: this._cbId });
        }.bind(this));
    } else {
        //console.log('INFO - NOT SENDING HUB MESSAGE BECAUSE PORTS DONT EXIST');
    }
};

// Exposed API - end.
// ------------------------------------------------------------

export default Messenger;