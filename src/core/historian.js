// NOTE: 'history' is a reserved word in javascript, hence 'historian'.

import rules from './rules.js';

let _undoStack;
let _redoStack;

function init() {
    _undoStack = [];
    _redoStack = [];
}

function getBackup() {
    // NOTE: Simple cloning that will not work for more complex objects.
    let clonedRules = JSON.parse(JSON.stringify(rules.getRules()));
    return clonedRules;
}

function addRedo() {
    _redoStack.push(getBackup());
}

function addUndo(backup, keepRedoStack) {
    _undoStack.push(backup);

    // Adding something undoable needs to clear all redos (unless specified otherwise).
    if (!keepRedoStack) {
        _redoStack = [];
    }
}

function wrapUndoable(wrappedMethod, methodArgs, keepRedoStack) {
    let backup = getBackup();
    wrappedMethod.apply(this, methodArgs);
    addUndo(backup, keepRedoStack);
}

function destroy() {
    _undoStack = null;
    _redoStack = null;
}

export default {
    getUndoStack: function() { return _undoStack; },
    setUndoStack: function(undoStack) { _undoStack = undoStack; },
    getRedoStack: function() { return _redoStack; },
    setRedoStack: function(redoStack) { _redoStack = redoStack; },

    init: init,
    getBackup: getBackup,
    addRedo: addRedo,
    addUndo: addUndo,
    wrapUndoable: wrapUndoable,
    destroy: destroy,
};
