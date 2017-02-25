'use strict';
import '../../stylesheets/devtool/devtool.scss';

import React from 'react';
import ReactDOM from 'react-dom';
import PubSub from 'pubsub-js';

import Header from './header.jsx';
import RulesAdder from './rules_adder.jsx';
import Rules from './rules.jsx';
import Overlay from './overlay.jsx';

//import {} from '../common/logWithDate.js';
import TabHelper from './tab_helper.jsx';
import ActionHandler from './action_handler.jsx';
import Actions from './actions.jsx';
import Messenger from 'chrome-ext-messenger';
import Messages from '../common/messages.js';

// Unhide the page on load.
var uncloakInterval = 150;
function uncloak() {
    // Sometimes the body hasn't loaded by now, so delay once more.
    if (document.body) {
        document.body.classList.add('uncloak');
    } else {
        setTimeout(uncloak, uncloakInterval);
    }
}
setTimeout(uncloak, uncloakInterval);

// JQuery tooltip plugin.
$(document).tooltip({
    position: { my: 'left top', at: 'right+8 top' },
    show: { delay: 300 }
});

let messenger = new Messenger();
let UNRESTYLEABLE_PAGE_MESSAGE = 'Restyler cannot work on this page... sorry :)';

let Devtools = React.createClass({
    getInitialState() {
        return {
            rules: [],
            undoStack: [],
            redoStack: [],
            enabled: true,
            textEditingEnabled: false,
            ready: false,
            overlayShown: true,
            overlayPopup: 'message',
            overlayMessage: 'Loading...'
        };
    },

    render: function() {
        let hasUndo = this.state.undoStack.length > 0;
        let hasRedo = this.state.redoStack.length > 0;
        let hasExport = this.state.rules.length > 0;
        let hasReset = this.state.rules.length > 0;

        return (
            <div id = 'devtool' >
                <div>
                    <div id = 'topPart' >
                        <Header   hasUndo = { hasUndo }
                                  hasRedo = { hasRedo }
                                  hasExport = { hasExport }
                                  textEditingEnabled = { this.state.textEditingEnabled }/>
                        <RulesAdder />
                    </div>
                    <div>
                        <Rules rules = { this.state.rules }
                               enabled = { this.state.enabled }
                               hasReset = { hasReset }/>
                    </div>
                </div>
                <Overlay isVisible = { this.state.overlayShown }
                         popup = { this.state.overlayPopup }
                         message = { this.state.overlayMessage }/>
            </div>
        );
    },

    componentWillMount: function() {
        PubSub.publish('devtool.componentWillMount', this);

        PubSub.subscribe('header.enableTextEditing', this.enableTextEditing);
        PubSub.subscribe('header.disableTextEditing', this.disableTextEditing);
        PubSub.subscribe('header.about', this.showAboutPopup);
        PubSub.subscribe('popup.close', this.closePopup);

        this.connection = messenger.initConnection('main', this.messageHandler);

        // MY TODO: doesn't always happen (show dialog) when dev tools is closed... investigate...
        window.onbeforeunload = function(e) {
            // Show dialog only if rules currently exist.
            if (this.state.rules.length > 0) {
                // NOTE: Chrome removed support for custom string for onbeforeunload Dialogs.
                // NOTE: (https://www.chromestatusIndicator.com/feature/5349061406228480)
                let message = 'Restyler changes you have made will not be saved';
                (e || window.event).returnValue = message;
                return message;
            }
        }.bind(this);

        this.tryActivate();
    },

    messageHandler: function(message, from, sender, sendResponse) {
        //console.log('devtools got message', message);

        if (message.name === Messages.GET_CURRENT_STATE) {
            // NOTE: Not sending entire state since can cause "Converting circular structure to JSON".
            sendResponse({
                rules: this.state.rules,
                enabled: this.state.enabled,
                textEditingEnabled: this.state.textEditingEnabled
            });
        } else if (message.name === Messages.RESTYLER_READY) {
            TabHelper.getTabUrl(function(tabUrl) {
                if (this.checkUrlRestylable(tabUrl)) {
                    this.setActive();
                } else {
                    this.setDisabled(UNRESTYLEABLE_PAGE_MESSAGE);
                }
            }.bind(this));
        } else if (message.name === Messages.TAB_ON_UPDATED) {
            let tabId = message.tabId;
            let changeInfo = message.changeInfo;

            if (tabId === TabHelper.getTabId()) {
                if (changeInfo.status === 'loading') {
                    this.showMessagePopup('Waiting page load...');
                } else if (changeInfo.status === 'complete') {
                    // NOTE: Not sure why but sometimes another loading change status occurs
                    // NOTE: after restyler reported ready, listening to the 'complete' and
                    // NOTE: checking ready state should resolve it.
                    // NOTE: tested on http://www.bing.com/images/explore?FORM=ILPSTR
                    this.tryActivate();
                }
            }
        }
    },

    tryActivate: function() {
        TabHelper.getTabUrl(function(tabUrl) {
            // If this is a non restylable page, we probably won't get the content script restyler ready event.
            if (this.checkUrlRestylable(tabUrl)) {
                this.connection.sendMessage('content_script:main', {
                    name: Messages.IS_RESTYLER_READY
                }, function(response) {
                    if (response === true) {
                        this.setActive();
                    }
                }.bind(this));
            } else {
                this.setDisabled(UNRESTYLEABLE_PAGE_MESSAGE);
            }
        }.bind(this));
    },

    enableTextEditing: function() {
        ActionHandler.handle(Actions.ENABLE_TEXT_EDITING, null, {
            disableAddUndo: true,
            disableResetRedo: true
        });

        // Toggle the value.
        // NOTE: Let menu fade out animation end so won't see text changing live.
        setTimeout(function() {
            this.setState({ textEditingEnabled: !this.state.textEditingEnabled });    
        }.bind(this), 500);
    },

    disableTextEditing: function() {
        ActionHandler.handle(Actions.DISABLE_TEXT_EDITING, null, {
            disableAddUndo: true,
            disableResetRedo: true
        });

        // Toggle the value.
        // NOTE: Let menu fade out animation end so won't see text changing live.
        setTimeout(function() {
            this.setState({ textEditingEnabled: !this.state.textEditingEnabled });    
        }.bind(this), 500);
    },

    checkUrlRestylable: function(url) {
        // NOTE: 'chrome://*' is' not restylable (except 'chrome://newtab' is)
        return (url.indexOf('chrome://') === -1 && url.indexOf('chrome-devtools://') === -1 || url.indexOf('chrome://newtab') !== -1);
    },

    setDisabled: function(message) {
        this.showMessagePopup(message);
    },

    showMessagePopup: function(message) {
        this.setState({ overlayShown: true, overlayMessage: message, overlayPopup: 'message' });
    },

    showAboutPopup: function() {
        this.setState({ overlayShown: true, overlayPopup: 'about' });
    },

    closePopup: function() {
        this.setState({ overlayShown: false });  
    },

    setActive: function() {
        this.setState({ overlayShown: false });
    }
});

ReactDOM.render(<Devtools />, $('#devtoolContainer')[0]);