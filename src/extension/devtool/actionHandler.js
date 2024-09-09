'use strict';

import PubSub from 'pubsub-js';

import Messenger from 'ext-messenger';

import actions from './actions.js';
import helpers from './helpers.js';
import messages from '../common/messages.js';

import exportCSSTemplate from './templates/export_css.handlebars';

let _devtoolSetState;
PubSub.subscribe('devtool.componentWillMount', function(msg, { setState }) {
    _devtoolSetState = setState;
});

let _devtoolState;
PubSub.subscribe('devtool.stateChanged', function(msg, { state }) {
    _devtoolState = state;
});

let _undoStack = [];
let _redoStack = [];

// Flag and queue to make sure we don't send a request before
// the previous has been responded.
let waitingResponse = false;
let pendingMessages = [];

// Some actions need to be grouped so will only be 1 undo/redo for them.
// We store them in an array until requested to executed (since they are async).
let isInGroupActions = false;
let groupMessages = [];

let messenger = new Messenger(Messenger.EXT_PARTS.DEVTOOL);
let connection = messenger.initConnection('action_handler');

function handleResponse(response, disableAddUndo, disableResetRedo) {
    //console.log('[actionHandler - response from content script]', response);

    if (!disableAddUndo) {
        _undoStack.push(_devtoolState);
    }

    if (!disableResetRedo) {
        _redoStack = [];
    }

    // Set new state.
    _devtoolSetState({
        rules: response.rules,
        enabled: response.isEnabled,
        undoStack: _undoStack,
        redoStack: _redoStack,
    });

    // Handle pending actions if exist.
    waitingResponse = false;
    if (pendingMessages.length > 0) {
        let nextMessage = pendingMessages.shift();
        sendMessage.call(this, nextMessage.message, nextMessage.options);
    }
}

function sendMessage(message, options) {
    // If not waiting for previous response, send the message.
    // Otherwise, append the message to be handled next.
    if (!waitingResponse && !isInGroupActions) {
        //console.log('[actionHandler - sending message]', arguments);
        waitingResponse = true;

        options = options || {};
        let method = message.method;
        let argsArr = message.argsArr || [];
        let disableAddUndo = options.disableAddUndo || false; // Default false (will stay false if given explicitly)
        let disableResetRedo = options.disableResetRedo || false; // Default false will stay false (will stay false if given explicitly).

        connection.sendMessage('content_script:main', {
            name: messages.ACTION,
            method: method,
            arguments: argsArr,
        }).then((response) => {
            handleResponse(response, disableAddUndo, disableResetRedo);
        });
    } else if (waitingResponse) {
        if (isInGroupActions) {
            groupMessages.push({ message: message, options: options });
        } else {
            pendingMessages.push({ message: message, options: options });
        }
    } else if (isInGroupActions) {
        groupMessages.push({ message: message, options: options });
    }
}

let actionHandler = {
    handle: function(action, argsArr, options) {
        if (!action) {
            throw new Error('[ERROR - actionHandler - missing action name to handle]');
        }

        if (argsArr && !Array.isArray(argsArr)) {
            throw new Error('[ERROR - actionHandler - args must be wrapped in array]');
        }

        //console.log('[actionHandler - handling action]', action, argsArr);
        sendMessage({ method: action, argsArr: argsArr }, options);
    },

    undo: function() {
        if (_undoStack.length > 0) {
            let wasEnabled = _devtoolState.enabled;

            _redoStack.push(_devtoolState);
            let state = _undoStack.pop();
            _devtoolSetState(state);

            let isEnabled = state.enabled;

            this.saveGroup();
            if (wasEnabled !== isEnabled) {
                sendMessage({
                    method: isEnabled ? actions.ENABLE_ALL : actions.DISABLE_ALL,
                }, {
                    disableAddUndo: true,
                    disableResetRedo: true,
                });
            }

            sendMessage({
                method: actions.SET_RULES,
                argsArr: [state.rules], // Since setState() is async, better to use the state here and not "_devtoolState"
            }, {
                disableAddUndo: true,
                disableResetRedo: true,
            });

            sendMessage({
                method: actions.APPLY_ALL,
            }, {
                disableAddUndo: true,
                disableResetRedo: true,
            });
            this.execGroup();
        } else {
            throw new Error('[ERROR - actionHandler attempting to undo from empty undo stack]');
        }
    },

    redo: function() {
        if (_redoStack.length > 0) {
            let wasEnabled = _devtoolState.enabled;

            _undoStack.push(_devtoolState);
            let state = _redoStack.pop();
            _devtoolSetState(state);

            let isEnabled = state.enabled;

            this.saveGroup();
            if (wasEnabled !== isEnabled) {
                sendMessage({
                    method: isEnabled ? actions.ENABLE_ALL : actions.DISABLE_ALL,
                }, {
                    disableAddUndo: true,
                    disableResetRedo: true,
                });
            }

            sendMessage({
                method: actions.SET_RULES,
                argsArr: [state.rules], // Since setState() is async, better to use the state here and not _devtoolState
            }, {
                disableAddUndo: true,
                disableResetRedo: true,
            });

            sendMessage({
                method: actions.APPLY_ALL,
            }, {
                disableAddUndo: true,
                disableResetRedo: true,
            });
            this.execGroup();
        } else {
            throw new Error('[ERROR - actionHandler attempting to redo from empty redo stack]');
        }
    },

    import: function() {
        let $importInput = $('<input type="file" accept=".json">');
        $importInput.on('change', function(e) {
            if (e.target.files && e.target.files.length === 1) {
                let fileReader = new FileReader();
                fileReader.onload = function(event) {
                    let result = event.target.result;
                    let rules = JSON.parse(result);

                    actionHandler.saveGroup();
                    actionHandler.handle(actions.SET_RULES, [rules]);
                    actionHandler.handle(actions.APPLY_ALL);
                    actionHandler.execGroup();
                };

                fileReader.readAsText(e.target.files.item(0));
            }
        });

        $importInput.click();
    },

    export: function(asCSS) {
        // Save to file.
        let date = new Date();
        let year = helpers.pad(date.getFullYear(), 4);
        let month = helpers.pad(date.getMonth() + 1, 2);
        let day = helpers.pad(date.getDate(), 2);
        let hours = helpers.pad(date.getHours(), 2);
        let minutes = helpers.pad(date.getMinutes(), 2);
        let seconds = helpers.pad(date.getSeconds(), 2);
        let formattedTime = [year, month, day, hours, minutes, seconds].join('');
        let extension = asCSS ? '.css' : '.json';
        let fileName = 'restyler_config-' + formattedTime + extension;
        let $downloadLink = $('<a target="_blank" title="Download Restyler Config" download="' + fileName + '">');

        let blobData;
        if (asCSS) {
            blobData = '';
            let selectors = {};
            _devtoolState.rules.forEach(function(rule) {
                // Only store enabled rules.
                if (rule.options.enabled) {
                    let selector = rule.options.selector || 'body';
                    selectors[selector] = selectors[selector] || {};
                    selectors[selector].rules = selectors[selector].rules || [];
                    selectors[selector].rules.push({ attr: rule.attr, newVal: rule.newVal });
                }
            });

            for (let key in selectors) {
                blobData += exportCSSTemplate({ selector: key, rules: selectors[key].rules });
            }
        } else {
            blobData = JSON.stringify(_devtoolState.rules, null, 2);
        }

        let blob = new Blob([blobData], { type: 'text/plain' });
        $downloadLink.attr('href', URL.createObjectURL(blob));
        $(document.body).append($downloadLink);
        $downloadLink[0].click(); // NOTE: jquery click() doesn't work for some reason...
        $downloadLink.remove();
    },

    saveGroup: function() {
        // NOTE: Probably not the best solution to use global flag for this
        // NOTE: (what if handling previous group and now starting another group) but should work for now...
        isInGroupActions = true;
    },

    execGroup: function() {
        isInGroupActions = false;

        let isFirstGroupMessage = true;
        while (groupMessages.length > 0) {
            let nextMessage = groupMessages.shift();

            // Enable undo only for first message, disable the the undo in the next ones.
            if (!isFirstGroupMessage) {
                nextMessage.options = nextMessage.options || {};
                nextMessage.options.disableAddUndo = true;
            }

            sendMessage.call(this, nextMessage.message, nextMessage.options);
            isFirstGroupMessage = false;
        }
    },
};

export default actionHandler;
