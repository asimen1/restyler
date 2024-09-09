'use strict';
import './Devtool.scss';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import PubSub from 'pubsub-js';

import Messenger from 'ext-messenger';

import Header from '../Header/Header.jsx';
import RulesAdder from '../RulesAdder/RulesAdder.jsx';
import Rules from '../Rules/Rules.jsx';
import Overlay from '../Overlay/Overlay.jsx';
//import {} from '../common/logWithDate.js';
import tabHelper from '../../tabHelper.js';
import actionHandler from '../../actionHandler.js';
import actions from '../../actions.js';
import messages from '../../../common/messages.js';

// Unhide the page on load.
let uncloakInterval = 150;
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
    show: { delay: 300 },
});

const messenger = new Messenger(Messenger.EXT_PARTS.DEVTOOL);
const UNRESTYLEABLE_PAGE_MESSAGE = 'Restyler cannot work on this page... sorry :)';

const Devtools = () => {
    const [state, setState] = useState({
        rules: [],
        undoStack: [],
        redoStack: [],
        enabled: true,
        textEditingEnabled: false,
        ready: false,
        overlayShown: true,
        overlayPopup: 'message',
        overlayMessage: 'Loading...',
    });

    const connection = useRef(null);

    useEffect(() => {
        connection.current = messenger.initConnection('main', messageHandler);

        PubSub.publish('devtool.componentWillMount', { setState });

        const enableTextEditingToken = PubSub.subscribe('header.enableTextEditing', enableTextEditing);
        const disableTextEditingToken = PubSub.subscribe('header.disableTextEditing', disableTextEditing);
        const aboutToken = PubSub.subscribe('header.about', showAboutPopup);
        const closeToken = PubSub.subscribe('popup.close', closePopup);

        tryActivate();

        return () => {
            PubSub.unsubscribe(enableTextEditingToken);
            PubSub.unsubscribe(disableTextEditingToken);
            PubSub.unsubscribe(aboutToken);
            PubSub.unsubscribe(closeToken);
        };
    }, []);

    useEffect(() => {
        PubSub.publish('devtool.stateChanged', { state });

        // TODO: doesn't always happen (show dialog) when dev tools is closed... investigate...
        window.onbeforeunload = (e) => {
            // Show dialog only if rules currently exist.
            if (state.rules.length > 0) {
                // NOTE: Chrome removed support for custom string for onbeforeunload Dialogs.
                // NOTE: (https://www.chromestatusIndicator.com/feature/5349061406228480)
                let message = 'Restyler changes you have made will not be saved';
                (e || window.event).returnValue = message;
                return message;
            }
        };
    }, [state]);

    const messageHandler = useCallback((message, from, sender, sendResponse) => {
        if (message.name === messages.GET_CURRENT_STATE) {
            // NOTE: Not sending entire state since can cause "Converting circular structure to JSON".
            sendResponse({
                rules: state.rules,
                enabled: state.enabled,
                textEditingEnabled: state.textEditingEnabled,
            });
        } else if (message.name === messages.RESTYLER_READY) {
            tabHelper.getTabUrl((tabUrl) => {
                if (checkUrlRestylable(tabUrl)) {
                    setActive();
                } else {
                    setDisabled(UNRESTYLEABLE_PAGE_MESSAGE);
                }
            });
        } else if (message.name === messages.TAB_ON_UPDATED) {
            let tabId = message.tabId;
            let changeInfo = message.changeInfo;

            if (tabId === tabHelper.getTabId()) {
                if (changeInfo.status === 'loading') {
                    showMessagePopup('Waiting page load...');
                } else if (changeInfo.status === 'complete') {
                    // Clear all rules when page is reloaded.
                    setState((prevState) => ({
                        ...prevState,
                        rules: [],
                    }));

                    // NOTE: Not sure why but sometimes another loading change status occurs
                    // NOTE: after restyler reported ready, listening to the 'complete' and
                    // NOTE: checking ready state should resolve it.
                    // NOTE: tested on http://www.bing.com/images/explore?FORM=ILPSTR
                    tryActivate();
                }
            }
        }
    }, [state]);

    const tryActivate = useCallback(() => {
        tabHelper.getTabUrl((tabUrl) => {
            // If this is a non restylable page, we probably won't get the content script restyler ready event.
            if (checkUrlRestylable(tabUrl)) {
                connection.current.sendMessage('content_script:main', {
                    name: messages.IS_RESTYLER_READY,
                }).then((response) => {
                    if (response === true) {
                        setActive();
                    }
                });
            } else {
                setDisabled(UNRESTYLEABLE_PAGE_MESSAGE);
            }
        });
    }, [connection]);

    const enableTextEditing = useCallback(() => {
        actionHandler.handle(actions.ENABLE_TEXT_EDITING, null, {
            disableAddUndo: true,
            disableResetRedo: true,
        });

        setTimeout(() => {
            // Toggle the value.
            // NOTE: Let menu fade out animation end so won't see text changing live.
            setState((prevState) => ({
                ...prevState,
                textEditingEnabled: !prevState.textEditingEnabled,
            }));
        }, 500);
    }, []);

    const disableTextEditing = useCallback(() => {
        actionHandler.handle(actions.DISABLE_TEXT_EDITING, null, {
            disableAddUndo: true,
            disableResetRedo: true,
        });

        setTimeout(() => {
            // Toggle the value.
            // NOTE: Let menu fade out animation end so won't see text changing live.
            setState((prevState) => ({
                ...prevState,
                textEditingEnabled: !prevState.textEditingEnabled,
            }));
        }, 500);
    }, []);

    const checkUrlRestylable = (url) => {
        // NOTE: 'chrome://*' is' not restylable (except 'chrome://newtab' is)
        return (url.indexOf('chrome://') === -1 && url.indexOf('chrome-devtools://') === -1 || url.indexOf('chrome://newtab') !== -1);
    };

    const setDisabled = (message) => {
        showMessagePopup(message);
    };

    const showMessagePopup = (message) => {
        setState((prevState) => ({
            ...prevState,
            overlayShown: true,
            overlayMessage: message,
            overlayPopup: 'message',
        }));
    };

    const showAboutPopup = () => {
        setState((prevState) => ({
            ...prevState,
            overlayShown: true,
            overlayPopup: 'about',
        }));
    };

    const closePopup = () => {
        setState((prevState) => ({
            ...prevState,
            overlayShown: false,
        }));
    };

    const setActive = () => {
        setState((prevState) => ({
            ...prevState,
            overlayShown: false,
        }));
    };

    const { rules, undoStack, redoStack, textEditingEnabled, overlayShown, overlayPopup, overlayMessage } = state;

    return (
        <div id='devtool'>
            <div>
                <div id='topPart'>
                    <Header hasUndo={undoStack.length > 0}
                            hasRedo={redoStack.length > 0}
                            hasExport={rules.length > 0}
                            textEditingEnabled={textEditingEnabled} />
                    <RulesAdder />
                </div>
                <div>
                    <Rules rules={rules}
                           enabled={state.enabled}
                           hasReset={rules.length > 0} />
                </div>
            </div>
            <Overlay isVisible={overlayShown}
                     popup={overlayPopup}
                     message={overlayMessage} />
        </div>
    );
};

const container = document.getElementById('devtoolContainer');
const root = createRoot(container);
root.render(<Devtools />);
