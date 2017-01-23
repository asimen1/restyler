'use strict';
import '../../stylesheets/devtool/rule.scss';

import React from 'react';
import PubSub from 'pubsub-js';

import Actions from './actions.jsx';
import ActionHandler from './action_handler.jsx';

let Rule = React.createClass({
    propTypes: {
        index: React.PropTypes.number,
        rule: React.PropTypes.object,
        rulesEnabled: React.PropTypes.bool
    },

    render: function() {
        let rule = this.props.rule;
        let ruleClassName = this.props.rulesEnabled && rule.options.enabled ? '' : 'disabled';
        let enableDisableText = rule.options.enabled ? 'Disable rule' : 'Enable rule';
        let enableDisableImageEl = rule.options.enabled
            ? <i className="fa fa-check-circle-o fa-lg" aria-hidden="true"></i>
            : <i className="fa fa-circle-o fa-lg" aria-hidden="true"></i>;

        let selectorValue = rule.options.selector;
        let attrValue = rule.attr;
        let origValValue = rule.origVal;
        let newValValue = rule.newVal;

        return (
            <tr data-index = { this.props.index } data-id = { rule.id } className = { 'rule ' + ruleClassName }>
                <td className = 'dragHandle'>
                    <i className="fa fa-sort fa-lg" aria-hidden="true" style={{'marginRight': '4px'}}></i>
                    <span>{ this.props.index + 1 }</span>
                </td>
                <td title = { selectorValue } ref = { (el) => this.selectorValue = el }>{ selectorValue }</td>
                <td title = { attrValue } ref = { (el) => this.attrValue = el }>{ attrValue }</td>
                <td title = { origValValue } ref = { (el) => this.origVal = el }>{ origValValue }</td>
                <td title = { newValValue } ref = { (el) => this.newValValue = el }>{ newValValue }</td>
                <td className = 'ruleControls'>
                    <a onClick = { PubSub.publish.bind(null, 'rule.copyValues', rule) } title = 'Copy values to fields'>
                        <i className="fa fa-arrow-up fa-lg" aria-hidden="true" style={{transform: 'rotate(-45deg)'}}></i>
                    </a>
                    <a onClick = { function(e) { this.enableDisableHandler(e, rule); }.bind(this) }
                       title = { enableDisableText }>
                        { enableDisableImageEl }
                    </a>
                    <a onClick = { this.removeHandler.bind(null, rule) } title = 'Remove rule'>
                        <i className="fa fa-times fa-lg" aria-hidden="true"></i>
                    </a>
                </td>
            </tr>
        );
    },

    componentDidMount: function() {
        // Use different tooltip location for the rule values.
        let toolTipOptions = {
            position: { my: 'center center', at: 'center top' },
            show: { delay: 300 }
        };

        $(this.selectorValue).tooltip(toolTipOptions);
        $(this.attrValue).tooltip(toolTipOptions);
        $(this.origVal).tooltip(toolTipOptions);
        $(this.newValValue).tooltip(toolTipOptions);
    },

    enableDisableHandler: function(e, rule) {
        if (rule.options.enabled) {
            ActionHandler.handle(Actions.DISABLE_RULE, [rule.id]);
        } else {
            ActionHandler.handle(Actions.ENABLE_RULE, [rule.id]);
        }

        $(document).tooltip('disable');
        $(document).tooltip('enable');
    },

    removeHandler: function(rule) {
        // NOTE: Fixes user not sending multiple removes when in the middle of removing this rule.
        if (!rule.removing) {
            rule.removing = true;
            ActionHandler.handle(Actions.CLEAR, [rule.id]);

            // NOTE: Otherwise tooltip gets stuck.
            $(document).tooltip('disable');
            $(document).tooltip('enable');
        }
    }
});

export default Rule;