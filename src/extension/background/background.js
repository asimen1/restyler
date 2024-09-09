//import {} from '../common/logWithDate.js';
import Messenger from 'ext-messenger';
import Messages from '../common/messages.js';

let messenger = new Messenger(Messenger.EXT_PARTS.BACKGROUND);
let devtoolInited = {};

function openHelpPage() {
    chrome.tabs.create({ url: 'https://asimen1.github.io/restyler/help.html' });
}

// Show help page on first install.
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        openHelpPage();
    }
});

messenger.initBackgroundHub({
    connectedHandler: connectedHandler,
    disconnectedHandler: disconnectedHandler,
});

let connection = messenger.initConnection('main', messageHandler);

function messageHandler(message, from, sender, sendResponse) {
    //console.log('background - messageHandler()', arguments);

    if (message.name === Messages.GET_CURRENT_STATE) {
        if (devtoolInited[sender.tab.id]) {
            connection.sendMessage(`devtool:main:${sender.tab.id}`, {
                name: Messages.GET_CURRENT_STATE,
            }).then((response) => {
                sendResponse(response);
            });
        } else {
            // Devtool isn't open/inited yet, initial state is good.
            sendResponse({
                rules: [],
                enabled: true,
                textEditingEnabled: false,
            });
        }
    } else if (message.name === Messages.GET_TAB_URL) {
        chrome.tabs.get(message.tabId, function(tab) {
            sendResponse(tab.url);
        });
    } else if (message.name === Messages.GET_TAB_STATUS) {
        chrome.tabs.get(message.tabId, function(tab) {
            sendResponse(tab.status);
        });
    } else if (message.name === Messages.FOCUS_TAB) {
        chrome.tabs.get(message.tabId, function(tab) {
            chrome.windows.update(tab.windowId, { focused: true }, function() {
                chrome.tabs.update(message.tabId, { active: true });
            });
        });
    } else if (message.name === Messages.SHOW_HELP) {
        openHelpPage();
    }
}

function connectedHandler(extPart, name, tabId) {
    if (extPart === Messenger.EXT_PARTS.DEVTOOL) {
        devtoolInited[tabId] = true;
    }
}

function disconnectedHandler(extPart, name, tabId) {
    if (extPart === Messenger.EXT_PARTS.DEVTOOL) {
        delete devtoolInited[tabId];

        // Reset current tab restyling when devtool closes/disconnects.
        connection.sendMessage(`content_script:main:${tabId}`, {
            name: Messages.ACTION,
            method: 'reset',
        });

        // Stop inspecting in case started.
        connection.sendMessage(`content_script:main:${tabId}`, {
            name: Messages.STOP_INSPECT,
        });
    }
}

// Notify devtool when tab updated (reload, navigation, ...).
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    //console.log('tab onupdated', arguments);

    connection.sendMessage(`devtool:main,rules_adder:${tabId}`, {
        name: Messages.TAB_ON_UPDATED,
        tabId: tabId,
        changeInfo: changeInfo,
        tab: tab,
    });
});