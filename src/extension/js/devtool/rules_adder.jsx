'use strict';
import '../../stylesheets/devtool/rules_adder.scss';

import React from 'react';
import PubSub from 'pubsub-js';

import TabHelper from './tab_helper.jsx';
import Actions from './actions.jsx';
import ActionHandler from './action_handler.jsx';
import Helpers from './helpers.jsx';
import Messenger from '../common/messenger.js';
import Messages from '../common/messages.js';
import CSS from './css.jsx';

let messenger = new Messenger();

let RulesAdder = React.createClass({
    getInitialState() {
        return {
            showAttrError: false,
            showNewValError: false,
            preview: false,
            previewRuleId: null,
            isColorAttr: false
        };
    },

    render: function() {
        let attrClassName = this.state.showAttrError ? 'error' : '';
        let newValClassName = this.state.showNewValError ? 'error' : '';
        let rulesAdderClassName = this.state.preview ? 'preview' : '';
        let colorInputClassName = 'colorInput ' + (this.state.isColorAttr ? 'visible' : '');
        let previewText = this.state.preview ? 'restore' : 'preview';

        let selectorTooltip = 'Choose or get a selector for which you want the elements styling to affect on. If not specified, style will apply to all elements';
        let attrTooltip = 'The style attribute you want to change';
        let origValTooltip = 'A specific attribute value that you want to be changed. If not specified, all current attribute values will be changed to the new value';
        let newValTooltip = 'The new attribute value you want to apply';
        let inspectBtnTooltip = 'Inspect an element in the page to get its tag, id and class selectors';

        return (
            <div id = 'rulesAdder' className = { rulesAdderClassName }>
                <div id = 'rulesAdderLeftSide'>
                    <div>Choose a selector (optional)<i className="fa fa-question-circle-o" aria-hidden="true" title = { selectorTooltip }></i></div>
                    <div className = 'inputContainer'>
                        <input id = 'selector'
                               onKeyPress={ this.onKeyPressHandler }
                               onFocus = { this.onFocus }
                               ref = { (el) => this.selectorInput = el }
                               placeholder = '*, #id, .classname...'>
                        </input>
                        <button id = 'inspect'
                                onClick = { this.inspectHandler }
                                ref = { (el) => this.inspectBtn = el }
                                title ={ inspectBtnTooltip }>inspect</button>
                    </div>
                    <div className = 'andOrText' >and / or</div>
                    <div>Choose an attribute<i className="fa fa-question-circle-o" aria-hidden="true" title = { attrTooltip }></i></div>
                    <div className = 'inputContainer'>
                        <input id = 'attr' 
                               className = { attrClassName }
                               onKeyPress = { this.onKeyPressHandler }
                               onFocus = { this.onFocus }
                               ref = { (el) => this.attrInput = el }
                               placeholder = 'background-color...'>
                        </input>
                    </div>
                </div>
                <div id = 'rulesAdderRightSide'>
                    <div>Original value (optional)<i className="fa fa-question-circle-o" aria-hidden="true" title = { origValTooltip }></i></div>
                    <div className = 'inputContainer'>
                        <input id = 'origVal'
                               onKeyPress={ this.onKeyPressHandler }
                               onFocus = { this.onFocus }
                               ref = { (el) => this.origValInput = el }>
                        </input>
                        <input type = 'color' defaultValue = '#0000ff' autoComplete
                               className = { colorInputClassName }
                               onChange = {
                                   function(e) {
                                       this.onColorInputChangeHandler(e, this.origValInput);
                                   }.bind(this)
                               } >
                        </input>
                    </div>
                    <div className = 'andOrText' ><br/></div>
                    <div id = 'newValue' >New value<i className="fa fa-question-circle-o" aria-hidden="true" title = { newValTooltip }></i></div>
                    <div>
                        <div className = 'inputContainer'>
                            <input id = 'newVal'
                                   className = { newValClassName }
                                   onKeyPress={ this.onKeyPressHandler }
                                   onFocus = { this.onFocus }
                                   ref = { (el) => this.newValInput = el }>
                            </input>
                            <input type = 'color' defaultValue = '#0000ff' autoComplete
                                   className = { colorInputClassName }
                                   onChange = {
                                       function(e) {
                                           this.onColorInputChangeHandler(e, this.newValInput);
                                       }.bind(this)
                                   } >
                            </input>
                            <button id = 'previewBtn' onClick = { this.previewHandler } title = 'Preview your changes before adding'>{ previewText }</button>
                            <button id = 'addBtn' onClick = { this.addHandler.bind(null, false) } title = 'Add and apply your style change'>set</button>
                            <button id = 'clearBtn' onClick = { this.clearHandler } title = 'Clear all current values entered'>clear</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    },

    messageHandler: function(message) {
        //console.log('rule_adder messageHandler()', arguments);

        if (message.name === Messages.INSPECT_VALUE && message.value) {
            this.stopInspect();
            $(this.selectorInput).val(message.value);
        } else if (message.name === Messages.TAB_ON_UPDATED) {
            // Clear temporary state when page reload.
            let tabId = message.tabId;
            let changeInfo = message.changeInfo;
            if (tabId === TabHelper.getTabId() && changeInfo.status === 'loading') {
                $(this.inspectBtn).removeClass('inspecting');
                this.setState({ preview: false, previewRuleId: null });
            }
        }
    },

    componentWillMount: function() {
        messenger.initConnection('devtool', 'rules_adder', this.messageHandler);
        PubSub.subscribe('rule.copyValues', this.copyValuesHandler);
    },

    componentDidMount: function() {
        $(this.attrInput).autocomplete({
            // Match by start of string.
            source: function(request, response) {
                let filteredArray = [];
                for (var key in CSS.attrs) {
                    if (key.startsWith(request.term)) {
                        filteredArray.push(key);
                    }
                }

                response(filteredArray);
            },

            select: this.onAtrrSelect,

            // Auto focus on first match (if any) for quick selection.
            autoFocus: true
        });

        // NOTE: DEBUGGING
        // this.addHandler();
        // $('#newVal').val('green');
        // this.addHandler();
        // $('#newVal').val('blue');
        // this.addHandler();
        // $('#newVal').val('green');
        // this.addHandler();
        // $('#newVal').val('yellow');
        // this.addHandler();
    },

    applyAttrType: function(attr) {
        if (CSS.attrs[attr] && CSS.attrs[attr].type === 'color') {
            this.setState({ isColorAttr: true });
        } else {
            this.setState({ isColorAttr: false });
        }
    },

    onAtrrSelect: function(event, ui) {
        let attr = ui.item.value;
        this.applyAttrType(attr);
    },

    onColorInputChangeHandler: function(e, forInput) {
        let colorInputVal = $(e.target).val();
        $(forInput).val(colorInputVal);

        // To trigger error & preview cleanup if needed.
        $(forInput).focus();
    },

    stopInspect: function() {
        messenger.sendMessage('content_script', 'main', {
            name: Messages.STOP_INSPECT
        });

        $(this.inspectBtn).removeClass('inspecting');
    },

    startInspect: function() {
        messenger.sendMessage('content_script', 'main', {
            name: Messages.START_INSPECT
        });

        $(this.inspectBtn).addClass('inspecting');        
    },

    inspectHandler: function() {
        if ($(this.inspectBtn).hasClass('inspecting')) {
            this.stopInspect();
        } else {
            this.startInspect();
            this.checkClearPreview();
        }
    },

    previewHandler: function() {
        if (this.state.preview) {
            this.checkClearPreview();
        } else {
            this.addHandler(true);    
        }
    },

    addHandler: function(isPreview) {
        let attr = $(this.attrInput).val().trim();
        let origVal = $(this.origValInput).val().trim();
        let newVal = $(this.newValInput).val().trim();

        // NOTE: DEBUGGING
        // attr = attr || 'background-color';
        // newVal = newVal || 'red';

        let options = {};
        options.selector = $(this.selectorInput).val().trim() || '*';
        options.enabled = true;

        // Validate fields.
        if (!attr || !newVal) {
            this.setState({
                showAttrError: !attr ? true : false,
                showNewValError: !newVal ? true : false
            });
        } else {
            if (isPreview) {
                let previewRuleId = Helpers.guid();
                ActionHandler.handle(Actions.STYLE, [previewRuleId, attr, origVal, newVal, options, true], {
                    disableAddUndo: true,
                    disableResetRedo: true
                });

                this.setState({ preview: true, previewRuleId: previewRuleId });
            } else {
                ActionHandler.handle(Actions.STYLE, [Helpers.guid(), attr, origVal, newVal, options]);
                this.checkClearPreview();
            }
        }
    },

    clearHandler: function() {
        $(this.attrInput).val('');
        $(this.origValInput).val('');
        $(this.newValInput).val('');
        $(this.selectorInput).val('');
        this.setState({ isColorAttr: false });
    },

    checkClearError: function(e) {
        let currTarget = e.currentTarget;
        this.setState({
            showAttrError: currTarget === this.attrInput && $(currTarget).hasClass('error') ? false : this.state.showAttrError,
            showNewValError: currTarget === this.newValInput && $(currTarget).hasClass('error') ? false : this.state.showNewValError,
        });
    },

    checkClearPreview: function() {
        if (this.state.preview) {
            let previewRuleId = this.state.previewRuleId;
            ActionHandler.handle(Actions.CLEAR, [previewRuleId], {
                disableAddUndo: true,
                disableResetRedo: true
            });

            this.setState({ preview: false, previewRuleId: null });
        }
    },

    onKeyPressHandler: function(e) {
        this.checkClearError(e);

        if (e.charCode === 13) { // enter.
            this.addHandler();
        }
    },

    onFocus: function(e) {
        this.checkClearError(e);
        this.checkClearPreview(e);
    },

    copyValuesHandler: function(msg, rule) {
        $(this.attrInput).val(rule.attr);
        $(this.origValInput).val(rule.origVal);
        $(this.newValInput).val(rule.newVal);
        $(this.selectorInput).val(rule.options.selector);

        this.applyAttrType(rule.attr);
    }
});

export default RulesAdder;