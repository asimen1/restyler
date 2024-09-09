'use strict';

import Messenger from 'ext-messenger';

import messages from '../common/messages.js';

let _tabId = chrome.devtools.inspectedWindow.tabId;

let messenger = new Messenger(Messenger.EXT_PARTS.DEVTOOL);
let connection = messenger.initConnection('tab_helper');

let tabHelper = {
    getTabId: function() {
        return _tabId;
    },

    getTabUrl: function(cb) {
        connection.sendMessage('background:main', {
            name: messages.GET_TAB_URL,
            tabId: _tabId,
        }).then((response) => {
            cb(response);
        });
    },

    getTabStatus: function(cb) {
        connection.sendMessage('background:main', {
            name: messages.GET_TAB_STATUS,
            tabId: _tabId,
        }).then((response) => {
            cb(response);
        });
    },
};

export default tabHelper;