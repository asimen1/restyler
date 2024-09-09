'use strict';
import './Rules.scss';

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import Rule from '../Rule/Rule.jsx';
import actionHandler from '../../actionHandler.js';
import actions from '../../actions.js';

let colResizableOptions = {
    // resizeMode: 'overflow',
    liveDrag: true,
    disabledColumns: [0, 4, 5],

    // NOTE: This size is also important when resizing main window so right side (controls) icons will be aligned
    // NOTE: And also used as initial width for 'rulesControls'.
    minWidth: 100,
};

const Rules = ({ rules, enabled, hasReset }) => {
    const rulesTableRef = useRef(null);
    const tableBodyRef = useRef(null);
    const rulesRef = useRef(rules);

    const enableDisableText = enabled ? 'Disable all rules' : 'Enable all rules';
    const enableDisableImageEl = enabled
        ? <i className="fa-regular fa-circle-check fa-lg" aria-hidden="true"></i>
        : <i className="fa-regular fa-circle fa-lg" aria-hidden="true"></i>;

    const resetClassString = hasReset ? '' : 'disabled';

    useEffect(() => {
        $(rulesTableRef.current).colResizable(colResizableOptions);

        $(tableBodyRef.current).sortable({
            axis: 'y',
            handle: '.dragHandle',
            placeholder: 'ui-state-highlight',
            containment: '#rulesTable',
            update: onSortableUpdate,
            // pointer: 'pointer',

            // http://stackoverflow.com/questions/1307705/jquery-ui-sortable-with-table-and-tr-width
            helper(e, tr) {
                let $originals = tr.children();
                let $helper = tr.clone();
                $helper.children().each(function(index) {
                    // Set helper cell sizes to match the original sizes
                    // NOTE: Using 'outerWidth' works better...
                    $(this).width($originals.eq(index).outerWidth());
                });

                $helper.addClass('draggedRule');

                return $helper;
            },
        });

        return () => {
            $(rulesTableRef.current).colResizable({ disable: true });
        };
    }, []);

    useEffect(() => {
        rulesRef.current = rules;
    }, [rules]);

    // 'colResizable' should be updated if rules added/removed to apply on their rows to.
    useEffect(() => {
        $(rulesTableRef.current).colResizable({ disable: true }); // This actually destroys it.
        $(rulesTableRef.current).colResizable(colResizableOptions);
    }, [rules.length]);

    // Apply rules according resorted list.
    const onSortableUpdate = () => {
        let reorderedRules = [];
        let reorderedRulesIndexes = $(tableBodyRef.current).sortable('toArray', { attribute: 'data-index' });
        reorderedRulesIndexes.forEach(currRuleIndex => {
            let currRuleIndexInt = parseInt(currRuleIndex);
            reorderedRules.push(rulesRef.current[currRuleIndexInt]);
        });

        // Cancel the sort so the DOM is untouched (we will let react update later).
        $(tableBodyRef.current).sortable('cancel');

        actionHandler.saveGroup();
        actionHandler.handle(actions.SET_RULES, [reorderedRules]);
        actionHandler.handle(actions.APPLY_ALL);
        actionHandler.execGroup();
    };

    const resetHandler = (e) => {
        if (!$(e.target.parentElement).hasClass('disabled')) {
            actionHandler.handle(actions.RESET);
        }
    };

    const enableDisableHandler = () => {
        let action = enabled ? actions.DISABLE_ALL : actions.ENABLE_ALL;
        actionHandler.handle(action, [], {
            disableAddUndo: true,
            disableResetRedo: true,
        });

        $(document).tooltip('disable');
        $(document).tooltip('enable');
    };

    return (
        <table id='rulesTable' ref={rulesTableRef}>
            <tbody id='tableHead'>
                <tr>
                    <th id='ruleDragHandleAndNumberHead'>{/* For drag handle */}</th>
                    <th>Selector</th>
                    <th>Attribute</th>
                    <th>Original value</th>
                    <th>New value</th>
                    <th id='rulesControls'>
                        {/* NOTE: Compensate in the UI for the rules copy values button so everything will align */}
                        <a style={{ cursor: 'default' }}>
                            <i className="fa-solid fa-arrow-up fa-lg" aria-hidden="true" style={{ visibility: 'hidden' }}></i>
                        </a>
                        <a onClick={enableDisableHandler} title={enableDisableText}>
                            {enableDisableImageEl}
                        </a>
                        <a className={resetClassString} onClick={resetHandler} title='Clear all rules'>
                            <i className="fa-solid fa-trash fa-lg" aria-hidden="true"></i>
                        </a>
                    </th>
                </tr>
            </tbody>
            <tbody id='tableBody' ref={tableBodyRef}>
                {rules.map((rule, index) => (
                    <Rule key={rule.id} index={index} rule={rule} rulesEnabled={enabled} />
                ))}
            </tbody>
        </table>
    );
};

Rules.propTypes = {
    rules: PropTypes.array,
    enabled: PropTypes.bool,
    hasReset: PropTypes.bool,
};

export default Rules;
