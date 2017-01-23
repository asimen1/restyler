'use strict';

import Messenger from '../common/messenger.js';
import Messages from '../common/messages.js';

let _tabId = chrome.devtools.inspectedWindow.tabId;

let messenger = new Messenger();
messenger.initConnection('devtool', 'tab_helper');

let TabHelper = {
    getTabId: function() {
        return _tabId;
    },

    getTabUrl: function(cb) {
        messenger.sendMessageToHub({
            name: Messages.GET_TAB_URL,
            tabId: _tabId
        }, function(response) {
            cb(response);
        });
    },

    getTabStatus: function(cb) {
        messenger.sendMessageToHub({
            name: Messages.GET_TAB_STATUS,
            tabId: _tabId
        }, function(response) {
            cb(response);
        });
    }
};

export default TabHelper;