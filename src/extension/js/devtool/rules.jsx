'use strict';
import '../../stylesheets/devtool/rules.scss';

import React from 'react';

import Rule from './rule.jsx';

import Actions from './actions.jsx';
import ActionHandler from './action_handler.jsx';

let colResizableOptions = {
    //resizeMode: 'overflow',
    liveDrag: true,
    disabledColumns: [0, 4, 5],

    // NOTE: This size is also important when resizing main window so right side (controls) icons will be aligned
    // NOTE: And also used as initial width for 'rulesControls'.
    minWidth: 100
};

let Rules = React.createClass({
    propTypes: {
        rules: React.PropTypes.array,
        enabled: React.PropTypes.bool,
        hasReset: React.PropTypes.bool
    },

    render: function() {
        let enableDisableText = this.props.enabled ? 'Disable all rules' : 'Enable all rules';
        let enableDisableImageEl = this.props.enabled
            ? <i className="fa fa-check-circle-o fa-lg" aria-hidden="true"></i>
            : <i className="fa fa-circle-o fa-lg" aria-hidden="true"></i>;

        let resetClassString = this.props.hasReset ? '' : 'disabled';

        return (
            <table id = 'rulesTable' ref = { (el) => this.rulesTable = el }>
                <tbody id = 'tableHead'>
                <tr>
                    <th id = 'ruleDragHandleAndNumerHead'>{/*For drag handle*/}</th>
                    <th>Selector</th>
                    <th>Attribute</th>
                    <th>Original value</th>
                    <th>New value</th>
                    <th id = 'rulesControls'>
                        <a>
                            {/* NOTE: Compensate on rules copy values button */}
                            <i className="fa fa-arrow-up fa-lg" aria-hidden="true" style={{visibility: 'hidden'}}></i>
                        </a>
                        <a onClick = { this.enableDisableHandler }
                           title = { enableDisableText }>
                           { enableDisableImageEl }
                        </a>
                        <a className = { resetClassString }
                           onClick = { this.resetHandler }
                           title = 'Clear all rules'>
                           <i className="fa fa-trash-o fa-lg" aria-hidden="true"></i>
                        </a>
                    </th>
                </tr>
                </tbody>
                <tbody id = 'tableBody' ref = { (el) => this.tableBody = el }>
                {
                    this.props.rules.map(function(rule, index) {
                        rule.index = index;
                        return (<Rule key = { index }
                                      index = { index }
                                      rule = { rule }
                                      rulesEnabled = { this.props.enabled }
                                ></Rule>);
                    }.bind(this))
                }
                </tbody>
            </table>
        );
    },

    componentDidMount: function() {
        $(this.rulesTable).colResizable(colResizableOptions);

        $(this.tableBody).sortable({
            axis: 'y',
            handle: '.dragHandle',
            placeholder: 'ui-state-highlight',
            containment: '#rulesTable',
            update: this.onSortableUpdate,
            //pointer: 'pointer',

            // http://stackoverflow.com/questions/1307705/jquery-ui-sortable-with-table-and-tr-width
            helper: function(e, tr) {
                var $originals = tr.children();
                var $helper = tr.clone();
                $helper.children().each(function(index) {
                    // Set helper cell sizes to match the original sizes
                    // NOTE: Using 'outerWidth' works better...
                    $(this).width($originals.eq(index).outerWidth());
                });

                $helper.addClass('draggedRule');

                return $helper;
            }
        });
    },

    componentDidUpdate: function(prevProps) {
        // 'colResizable' should be updated if rules added/removed to apply on their rows to.
        if (prevProps.rules.length !== this.props.rules.length) {
            $(this.rulesTable).colResizable({ disable : true }); // This actually destorys it.
            $(this.rulesTable).colResizable(colResizableOptions);
        }
    },

    // Apply rules according resorted list.
    onSortableUpdate: function() {
        let reorderedRules = [];
        let reorderedRulesIndexes = $(this.tableBody).sortable('toArray', { attribute: 'data-index' });
        reorderedRulesIndexes.forEach(function(currRuleIndex) {
            var currRuleIndexInt = parseInt(currRuleIndex);
            reorderedRules.push(this.props.rules[currRuleIndexInt]);
        }.bind(this));

        // Cancel the sort so the DOM is untouched (we will let react update later).
        $(this.tableBody).sortable('cancel');

        ActionHandler.saveGroup();
        ActionHandler.handle(Actions.SET_RULES, [reorderedRules]);
        ActionHandler.handle(Actions.APPLY_ALL);
        ActionHandler.execGroup();
    },

    resetHandler: function(e) {
        if (!$(e.target.parentElement).hasClass('disabled')) {
            ActionHandler.handle(Actions.RESET);
        }
    },

    enableDisableHandler: function() {
        var action = this.props.enabled ? Actions.DISABLE_ALL : Actions.ENABLE_ALL;
        ActionHandler.handle(action, [], {
            disableAddUndo: true,
            disableResetRedo: true
        });

        $(document).tooltip('disable');
        $(document).tooltip('enable');
    }
});

export default Rules;
