'use strict';
import './Rule.scss';

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';

import actionHandler from '../../actionHandler.js';
import actions from '../../actions.js';

const Rule = ({ index, rule, rulesEnabled }) => {
    const selectorValueRef = useRef(null);
    const attrValueRef = useRef(null);
    const origValRef = useRef(null);
    const newValRef = useRef(null);

    // Fix state of rule that has been restored after being removed (via undo for example).
    rule.isBeingRemoved = false;

    const ruleClassName = rulesEnabled && rule.options.enabled ? '' : 'disabled';
    const enableDisableText = rule.options.enabled ? 'Disable rule' : 'Enable rule';
    const enableDisableImageEl = rule.options.enabled
        ? <i className="fa-regular fa-circle-check fa-lg" aria-hidden="true"></i>
        : <i className="fa-regular fa-circle fa-lg" aria-hidden="true"></i>;

    const selectorValue = rule.options.selector;
    const attrValue = rule.attr;
    const origValValue = rule.origVal;
    const newValValue = rule.newVal;

    useEffect(() => {
        // Use different tooltip location for the rule values.
        const toolTipOptions = {
            position: { my: 'center center', at: 'center top' },
            show: { delay: 300 },
        };

        $(selectorValueRef.current).tooltip(toolTipOptions);
        $(attrValueRef.current).tooltip(toolTipOptions);
        $(origValRef.current).tooltip(toolTipOptions);
        $(newValRef.current).tooltip(toolTipOptions);
    }, []);

    const enableDisableHandler = (e, rule) => {
        if (rule.options.enabled) {
            actionHandler.handle(actions.DISABLE_RULE, [rule.id]);
        } else {
            actionHandler.handle(actions.ENABLE_RULE, [rule.id]);
        }

        $(document).tooltip('disable');
        $(document).tooltip('enable');
    };

    const removeHandler = (rule) => {
        // NOTE: Fixes user not sending multiple removes when in the middle of removing this rule.
        if (!rule.isBeingRemoved) {
            rule.removing = true;
            actionHandler.handle(actions.CLEAR, [rule.id]);

            // NOTE: Otherwise tooltip gets stuck.
            $(document).tooltip('disable');
            $(document).tooltip('enable');
        }
    };

    return (
        <tr data-index={index} data-id={rule.id} className={'rule ' + ruleClassName}>
            <td className='dragHandle'>
                <i className="fa-solid fa-sort" aria-hidden="true" style={{'marginRight': '4px'}}></i>
                <span>{index + 1}</span>
            </td>
            <td title={selectorValue} ref={selectorValueRef}>{selectorValue}</td>
            <td title={attrValue} ref={attrValueRef}>{attrValue}</td>
            <td title={origValValue} ref={origValRef}>{origValValue}</td>
            <td title={newValValue} ref={newValRef}>{newValValue}</td>
            <td className='ruleControls'>
                <a onClick={() => PubSub.publish('rule.copyValues', rule)} title='Copy values to fields'>
                    <i className="fa-solid fa-arrow-up fa-lg" aria-hidden="true" style={{transform: 'rotate(-45deg)'}}></i>
                </a>
                <a onClick={(e) => enableDisableHandler(e, rule)} title={enableDisableText}>
                    {enableDisableImageEl}
                </a>
                <a onClick={() => removeHandler(rule)} title='Remove rule'>
                    <i className="fa-solid fa-xmark fa-xl" aria-hidden="true"></i>
                </a>
            </td>
        </tr>
    );
};

Rule.propTypes = {
    index: PropTypes.number,
    rule: PropTypes.object,
    rulesEnabled: PropTypes.bool,
};

export default Rule;
