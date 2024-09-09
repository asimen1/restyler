'use strict';
import './RulesAdder.scss';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PubSub from 'pubsub-js';

import Messenger from 'ext-messenger';

import tabHelper from '../../tabHelper.js';
import actionHandler from '../../actionHandler.js';
import actions from '../../actions.js';
import helpers from '../../helpers.js';
import CSS from '../../css.js';
import messages from '../../../common/messages.js';

const messenger = new Messenger(Messenger.EXT_PARTS.DEVTOOL);
const DEFAULT_COLOR_INPUT = '#000000';

const RulesAdder = () => {
    const [showAttrError, setShowAttrError] = useState(false);
    const [showNewValError, setShowNewValError] = useState(false);
    const [preview, setPreview] = useState(false);
    const [previewRuleId, setPreviewRuleId] = useState(null);
    const [isColorAttr, setIsColorAttr] = useState(false);
    const [isClearButtonDisabled, setIsClearButtonDisabled] = useState(true);

    const selectorInput = useRef(null);
    const inspectBtn = useRef(null);
    const attrInput = useRef(null);
    const origValInput = useRef(null);
    const origValColorInput = useRef(null);
    const newValInput = useRef(null);
    const newValColorInput = useRef(null);

    const connection = useRef(null);

    const messageHandler = useCallback((message) => {
        if (message.name === messages.INSPECT_VALUE && message.value) {
            stopInspect();
            $(selectorInput.current).val(message.value);
        } else if (message.name === messages.TAB_ON_UPDATED) {
            // Clear temporary state when page reload.
            let tabId = message.tabId;
            let changeInfo = message.changeInfo;
            if (tabId === tabHelper.getTabId() && changeInfo.status === 'loading') {
                $(inspectBtn.current).removeClass('inspecting');
                setPreview(false);
                setPreviewRuleId(null);
            }
        }
    }, []);

    useEffect(() => {
        connection.current = messenger.initConnection('rules_adder', messageHandler);
        PubSub.subscribe('rule.copyValues', copyValuesHandler);

        $(attrInput.current).autocomplete({
            source(request, response) {
                const filteredArray = Object.keys(CSS.attrs).filter(key => key.includes(request.term));
                response(filteredArray);
            },
            select: onAttrSelect,

            // Auto focus on first match (if any) for quick selection.
            autoFocus: true,
        });

        return () => {
            PubSub.unsubscribe('rule.copyValues', copyValuesHandler);
        };
    }, []);

    const applyAttrType = (attr) => {
        setIsColorAttr(CSS.attrs[attr] && CSS.attrs[attr].type === 'color');
    };

    const onAttrSelect = (event, ui) => {
        const attr = ui.item.value;
        applyAttrType(attr);
    };

    const onColorInputChangeHandler = (e, forInput) => {
        const colorInputVal = $(e.target).val();
        $(forInput).val(colorInputVal);
        $(forInput).focus();
    };

    const stopInspect = () => {
        connection.current.sendMessage('content_script:main', { name: messages.STOP_INSPECT });
        $(inspectBtn.current).removeClass('inspecting');
    };

    const startInspect = () => {
        connection.current.sendMessage('content_script:main', { name: messages.START_INSPECT });
        $(inspectBtn.current).addClass('inspecting');
    };

    const inspectHandler = () => {
        if ($(inspectBtn.current).hasClass('inspecting')) {
            stopInspect();
        } else {
            startInspect();
            checkClearPreview();
        }
    };

    const previewHandler = () => {
        if (preview) {
            checkClearPreview();
        } else {
            saveHandler(true);
        }
    };

    const saveHandler = (isPreview) => {
        const attr = $(attrInput.current).val().trim();
        const origVal = $(origValInput.current).val().trim();
        const newVal = $(newValInput.current).val().trim();

        const options = {
            selector: $(selectorInput.current).val().trim() || '*',
            enabled: true,
        };

        // Validate fields.
        if (!attr || !newVal) {
            setShowAttrError(!attr);
            setShowNewValError(!newVal);
        } else {
            if (isPreview) {
                const previewRuleId = helpers.guid();
                actionHandler.handle(actions.STYLE, [previewRuleId, attr, origVal, newVal, options, true], {
                    disableAddUndo: true,
                    disableResetRedo: true,
                });

                setPreview(true);
                setPreviewRuleId(previewRuleId);
            } else {
                actionHandler.handle(actions.STYLE, [helpers.guid(), attr, origVal, newVal, options]);
                checkClearPreview();
            }
        }
    };

    const clearHandler = () => {
        $(attrInput.current).val('');
        $(origValInput.current).val('');
        $(newValInput.current).val('');
        $(selectorInput.current).val('');
        setIsColorAttr(false);
        setIsClearButtonDisabled(true);
    };

    const checkClearError = (e) => {
        const currTarget = e.currentTarget;
        if (currTarget === attrInput.current && $(currTarget).hasClass('error')) {
            setShowAttrError(false);
        }
        if (currTarget === newValInput.current && $(currTarget).hasClass('error')) {
            setShowNewValError(false);
        }
    };

    const checkClearPreview = () => {
        if (preview) {
            actionHandler.handle(actions.CLEAR, [previewRuleId], {
                disableAddUndo: true,
                disableResetRedo: true,
            });

            setPreview(false);
            setPreviewRuleId(null);
        }
    };

    const checkDisabledClearButton = () => {
        let areAllInputsEmpty =
            $(attrInput.current).val().trim() === '' &&
            $(origValInput.current).val().trim() === '' &&
            $(newValInput.current).val().trim() === '' &&
            $(selectorInput.current).val().trim() === '';

        setIsClearButtonDisabled(areAllInputsEmpty);
    };

    const onKeyUpHandler = (e) => {
        checkClearError(e);
        checkDisabledClearButton();

        if (e.keyCode === 13) { // enter.
            saveHandler();
        }

        // For the attribute input, apply the type of the attribute.
        if (e.currentTarget === attrInput.current) {
            applyAttrType(e.currentTarget.value);
        }
    };

    const onFocus = (e) => {
        checkClearError(e);
        checkClearPreview();
    };

    const onValChangeHandler = (newVal, forColorInput) => {
        // Can also be "null" value for empty input.
        if (!newVal) {
            forColorInput.value = DEFAULT_COLOR_INPUT;
            return;
        }

        if ((newVal.startsWith('#') && newVal.length === 7)) {
            forColorInput.value = newVal;
        } else if (newVal.startsWith('rgb(')) {
            const rgb = newVal.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgb) {
                forColorInput.value = CSS.rgbToHex(rgb[1], rgb[2], rgb[3]);
            } else {
                forColorInput.value = DEFAULT_COLOR_INPUT;
            }
        } else if (CSS.colorHexMap[newVal]) {
            forColorInput.value = CSS.colorHexMap[newVal];
        } else {
            forColorInput.value = DEFAULT_COLOR_INPUT;
        }
    };

    const copyValuesHandler = (msg, rule) => {
        $(attrInput.current).val(rule.attr);
        $(origValInput.current).val(rule.origVal);
        $(newValInput.current).val(rule.newVal);
        $(selectorInput.current).val(rule.options.selector);

        applyAttrType(rule.attr);
        onValChangeHandler(rule.origVal, origValColorInput.current);
        onValChangeHandler(rule.newVal, newValColorInput.current);
    };

    const attrClassName = showAttrError ? 'error' : '';
    const newValClassName = showNewValError ? 'error' : '';
    const rulesAdderClassName = preview ? 'preview' : '';
    const colorInputClassName = `colorInput ${isColorAttr ? 'visible' : ''}`;
    const clearButtonClassName = isClearButtonDisabled ? 'disabled' : '';
    const previewText = preview ? 'stop preview' : 'preview';

    const selectorTooltip = 'Choose or get a selector for which you want the elements styling to affect on. If not specified, style will apply to all elements';
    const attrTooltip = 'The style attribute you want to change';
    const origValTooltip = 'A specific attribute value that you want to be changed. If not specified, all current attribute values will be changed to the new value';
    const newValTooltip = 'The new attribute value you want to apply';
    const inspectBtnTooltip = 'Inspect an element in the page to get its tag, id and class selectors';

    return (
        <div id='rulesAdder' className={rulesAdderClassName}>
            <div id='rulesAdderLeftSide'>
                <div>Choose a selector (optional)<i className="fa-solid fa-circle-question" aria-hidden="true" title={selectorTooltip}></i></div>
                <div className='inputContainer'>
                    <input id='selector'
                        onKeyUp={onKeyUpHandler}
                        onFocus={onFocus}
                        ref={selectorInput}
                        placeholder='*, #id, .classname...'>
                    </input>
                    <button id='inspect'
                        onClick={inspectHandler}
                        ref={inspectBtn}
                        title={inspectBtnTooltip}>inspect</button>
                </div>
                <div>Choose an attribute<i className="fa-solid fa-circle-question" aria-hidden="true" title={attrTooltip}></i></div>
                <div className='inputContainer bottom'>
                    <input id='attr'
                        className={attrClassName}
                        onKeyUp={onKeyUpHandler}
                        onFocus={onFocus}
                        ref={attrInput}
                        placeholder='background-color...'>
                    </input>
                </div>
            </div>
            <div id='rulesAdderRightSide'>
                <div>Original value (optional)<i className="fa-solid fa-circle-question" aria-hidden="true" title={origValTooltip}></i></div>
                <div className='inputContainer'>
                    <input id='origVal'
                        onKeyUp={onKeyUpHandler}
                        onFocus={onFocus}
                        onChange={(e) => onValChangeHandler(e.currentTarget.value, origValColorInput.current)}
                        ref={origValInput}>
                    </input>
                    <input type='color' defaultValue={DEFAULT_COLOR_INPUT} autoComplete='on'
                        className={colorInputClassName}
                        tabIndex='-1'
                        onChange={(e) => onColorInputChangeHandler(e, origValInput.current)}
                        ref={origValColorInput}>
                    </input>
                </div>
                <div id='newValue' >New value<i className="fa-solid fa-circle-question" aria-hidden="true" title={newValTooltip}></i></div>
                <div>
                    <div className='inputContainer bottom'>
                        <input id='newVal'
                            className={newValClassName}
                            onKeyUp={onKeyUpHandler}
                            onFocus={onFocus}
                            onChange={(e) => onValChangeHandler(e.currentTarget.value, newValColorInput.current)}
                            ref={newValInput}>
                        </input>
                        <input type='color' defaultValue={DEFAULT_COLOR_INPUT} autoComplete='on'
                            className={colorInputClassName}
                            tabIndex='-1'
                            onChange={(e) => onColorInputChangeHandler(e, newValInput.current)}
                            ref={newValColorInput}>
                        </input>
                        <button id='previewBtn'
                            onClick={previewHandler}
                            title='Preview your changes before adding'>
                            {previewText}
                        </button>
                        <button id='saveBtn'
                            onClick={() => saveHandler(false)}
                            title='Add and apply your style change'>
                            save
                        </button>
                        <button id='clearBtn'
                            className={clearButtonClassName}
                            disabled={isClearButtonDisabled}
                            onClick={clearHandler}
                            title='Clear all current values entered'>
                            clear
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RulesAdder;
