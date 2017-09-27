'use strict';

import Messenger from 'chrome-ext-messenger';
import Messages from '../common/messages.js';

let _tabId = chrome.devtools.inspectedWindow.tabId;

let messenger = new Messenger();
let connection = messenger.initConnection('tab_helper');

let TabHelper = {
    getTabId: function() {
        return _tabId;
    },

    getTabUrl: function(cb) {
        connection.sendMessage('background:main', {
            name: Messages.GET_TAB_URL,
            tabId: _tabId
        }).then((response) => {
            cb(response);
        });
    },

    getTabStatus: function(cb) {
        connection.sendMessage('background:main', {
            name: Messages.GET_TAB_STATUS,
            tabId: _tabId
        }).then((response) => {
            cb(response);
        });
    }
};

export default TabHelper;