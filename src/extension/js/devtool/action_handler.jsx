'use strict';

import PubSub from 'pubsub-js';

import Actions from './actions.jsx';
import Helpers from './helpers.jsx';
import Messenger from 'chrome-ext-messenger';
import Messages from '../common/messages.js';

import exportCSSTemplate from './templates/export_css.handlebars';

let _devtool;
PubSub.subscribe('devtool.componentWillMount', function(msg, devtool) {
    _devtool = devtool;
});

let _undoStack = [];
let _redoStack = [];

// Flag and queue to make sure we don't send a request before
// the previous has been responded.
let waitingReponse = false;
let pendingMessages = [];

// Some actions need to be grouped so will only be 1 undo/redo for them.
// We store them in an array until requested to executed (since they are async).
let isInGroupActions = false;
let groupMessages = [];

let messenger = new Messenger();
let connection = messenger.initConnection('action_handler');

function handleResponse(response, disableAddUndo, disableResetRedo) {
    //console.log('[ActionHandler - response from content script]', response);

    if (!disableAddUndo) {
        _undoStack.push(_devtool.state);
    }

    if (!disableResetRedo) {
        _redoStack = [];
    }

    // Set new state.
    _devtool.setState({
        rules: response.rules,
        enabled: response.isEnabled,
        undoStack: _undoStack,
        redoStack: _redoStack
    });

    // Handle pending actions if exist.
    waitingReponse = false;
    if (pendingMessages.length > 0) {
        let nextMessage = pendingMessages.shift();
        sendMessage.call(this, nextMessage.message, nextMessage.options);
    }
}

function sendMessage(message, options) {
    // If not waiting for previous response, send the message.
    // Otherwise, append the message to be handled next.
    if (!waitingReponse && !isInGroupActions) {
        //console.log('[ActionHandler - sending message]', arguments);
        waitingReponse = true;

        options = options || {};
        let method = message.method;
        let argsArr = message.argsArr || [];
        let disableAddUndo = options.disableAddUndo || false; // Default false (will stay false if given explicitly)
        let disableResetRedo = options.disableResetRedo || false; // Default false will stay false (will stay false if given explicitly).

        connection.sendMessage('content_script:main', {
            name: Messages.ACTION,
            method: method,
            arguments: argsArr
        }, function(response) {
            handleResponse(response, disableAddUndo, disableResetRedo);
        });
    } else if (waitingReponse) {
        if (isInGroupActions) {
            groupMessages.push({ message: message, options: options });
        } else {
            pendingMessages.push({ message: message, options: options });
        }
    } else if (isInGroupActions) {
        groupMessages.push({ message: message, options: options });
    }
}

let ActionHandler = {
    handle: function(action, argsArr, options) {
        if (!action) {
            throw new Error('[ERROR - ActionHandler - missing action name to handle]');
        }

        if (argsArr && !Array.isArray(argsArr)) {
            throw new Error('[ERROR - ActionHandler - args must be wrapped in array]');
        }

        //console.log('[ActionHandler - handling action]', action, argsArr);
        sendMessage({ method: action, argsArr: argsArr }, options);
    },

    undo: function() {
        if (_undoStack.length > 0) {
            let wasEnabled = _devtool.state.enabled;

            _redoStack.push(_devtool.state);
            let state = _undoStack.pop();
            _devtool.setState(state);

            let isEnabled = state.enabled;

            this.saveGroup();
            if (wasEnabled !== isEnabled) {
                sendMessage({
                    method: isEnabled ? Actions.ENABLE_ALL : Actions.DISABLE_ALL,
                }, {
                    disableAddUndo: true,
                    disableResetRedo: true
                });
            }

            sendMessage({
                method: Actions.SET_RULES,
                argsArr: [state.rules], // Since setState() is async, better to use the state here and not _devtool.state
            }, {
                disableAddUndo: true,
                disableResetRedo: true
            });

            sendMessage({
                method: Actions.APPLY_ALL,
            }, {
                disableAddUndo: true,
                disableResetRedo: true
            });
            this.execGroup();
        } else {
            throw new Error('[ERROR - ActionHandler attempting to undo from empty undo stack]');
        }
    },

    redo: function() {
        if (_redoStack.length > 0) {
            let wasEnabled = _devtool.state.enabled;

            _undoStack.push(_devtool.state);
            let state = _redoStack.pop();
            _devtool.setState(state);

            let isEnabled = state.enabled;

            this.saveGroup();
            if (wasEnabled !== isEnabled) {
                sendMessage({
                    method: isEnabled ? Actions.ENABLE_ALL : Actions.DISABLE_ALL,
                }, {
                    disableAddUndo: true,
                    disableResetRedo: true
                });
            }

            sendMessage({
                method: Actions.SET_RULES,
                argsArr: [state.rules], // Since setState() is async, better to use the state here and not _devtool.state
            }, {
                disableAddUndo: true,
                disableResetRedo: true
            });

            sendMessage({
                method: Actions.APPLY_ALL,
            }, {
                disableAddUndo: true,
                disableResetRedo: true
            });
            this.execGroup();
        } else {
            throw new Error('[ERROR - ActionHandler attempting to redo from empty redo stack]');
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

                    ActionHandler.saveGroup();
                    ActionHandler.handle(Actions.SET_RULES, [rules]);
                    ActionHandler.handle(Actions.APPLY_ALL);
                    ActionHandler.execGroup();
                };

                fileReader.readAsText(e.target.files.item(0));
            }
        });

        $importInput.click();
    },

    export: function(asCSS) {
        // Save to file.
        let date = new Date();
        let year = Helpers.pad(date.getFullYear(), 4);
        let month = Helpers.pad(date.getMonth() + 1, 2);
        let day = Helpers.pad(date.getDate(), 2);
        let hours = Helpers.pad(date.getHours(), 2);
        let minutes = Helpers.pad(date.getMinutes(), 2);
        let seconds = Helpers.pad(date.getSeconds(), 2);
        let formattedTime = [year, month, day, hours, minutes, seconds].join('');
        let extension = asCSS ? '.css' : '.json';
        let fileName = 'restyler_config-' + formattedTime + extension;
        let $downloadLink = $('<a target="_blank" title="Download Restyler Config" download="' + fileName + '">');

        let blobData;
        if (asCSS) {
            blobData = '';
            let selectors = {};
            _devtool.state.rules.forEach(function(rule) {
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
            blobData = JSON.stringify(_devtool.state.rules);
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
    }
};

export default ActionHandler;
