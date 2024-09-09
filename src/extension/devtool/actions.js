'use strict';

const actions = {
    UNDO: 'undo',
    REDO: 'redo',
    IMPORT: 'importConfig',
    EXPORT: 'exportConfig',

    // Restyler methods
    STYLE: 'style',
    CLEAR: 'clear',
    ENABLE_RULE: 'enableRule',
    DISABLE_RULE: 'disableRule',
    RESET: 'reset',
    APPLY_ALL: 'applyAll',
    ENABLE_ALL: 'enableAll',
    DISABLE_ALL: 'disableAll',
    SET_RULES: 'setRules',
    ENABLE_TEXT_EDITING: 'enableTextEditing',
    DISABLE_TEXT_EDITING: 'disableTextEditing',
};

export default actions;