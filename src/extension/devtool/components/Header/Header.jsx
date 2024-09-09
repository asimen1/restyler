'use strict';
import './Header.scss';

import React, { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';

import Messenger from 'ext-messenger';

import tabHelper from '../../tabHelper.js';
import actionHandler from '../../actionHandler.js';
import messages from '../../../common/messages.js';

const messenger = new Messenger(Messenger.EXT_PARTS.DEVTOOL);
const connection = messenger.initConnection('header');

const Header = (props) => {
    const menuIconRef = useRef(null);
    const menuRef = useRef(null);

    const undoHandler = useCallback((e) => {
        if (!$(e.target.parentElement).hasClass('disabled')) {
            actionHandler.undo();
        }
    }, []);

    const redoHandler = useCallback((e) => {
        if (!$(e.target.parentElement).hasClass('disabled')) {
            actionHandler.redo();
        }
    }, []);

    const importHandler = useCallback(() => {
        actionHandler.import();
    }, []);

    const exportHandler = useCallback((e) => {
        if (!$(e.target).hasClass('disabled')) {
            actionHandler.export();
        }
    }, []);

    const exportCSSHandler = useCallback((e) => {
        if (!$(e.target).hasClass('disabled')) {
            actionHandler.export(true);
        }
    }, []);

    const windowClickHandler = useCallback(() => {
        hideMenu();
    }, []);

    const hideMenu = useCallback(() => {
        let $menuIcon = $(menuIconRef.current);
        let $menu = $(menuRef.current);

        if ($menu.hasClass('visible')) {
            $menuIcon.removeClass('open');
            $menu.fadeOut('fast');
            $menu.removeClass('visible');
            window.removeEventListener('click', windowClickHandler);
        }
    }, [windowClickHandler]);

    const showMenuHandler = useCallback((e) => {
        let $menuIcon = $(menuIconRef.current);
        let $menu = $(menuRef.current);

        if ($menu.hasClass('visible')) {
            hideMenu();
        } else {
            $menuIcon.addClass('open');

            // So click event on this won't hide the menu.
            e.preventDefault();
            e.stopPropagation();

            $menu.fadeIn('fast');
            $menu.addClass('visible');
            window.addEventListener('click', windowClickHandler);
            $menu.focus();
        }
    }, [hideMenu, windowClickHandler]);

    const focusTabHandler = useCallback(() => {
        connection.sendMessage('background:main', {
            name: messages.FOCUS_TAB,
            tabId: tabHelper.getTabId(),
        });
    }, []);

    const textEditingHandler = useCallback(() => {
        if (props.textEditingEnabled) {
            PubSub.publish('header.disableTextEditing');
        } else {
            PubSub.publish('header.enableTextEditing');
        }
    }, [props.textEditingEnabled]);

    const helpHandler = useCallback(() => {
        connection.sendMessage('background:main', {
            name: messages.SHOW_HELP,
        });
    }, []);

    const aboutHandler = useCallback(() => {
        PubSub.publish('header.about');
    }, []);

    let undoClassString = props.hasUndo ? '' : 'disabled';
    let redoClassString = props.hasRedo ? '' : 'disabled';
    let exportClassString = props.hasExport ? '' : 'disabled';

    return (
        <div id='header'>
            <div id='headerLeftSection'>
                <span id='name'>RESTYLER</span>
                <a onClick={importHandler} title='Import a previously saved rules config'>import</a>
                <a className={exportClassString} onClick={exportHandler} title='Export rules to a config file'>export</a>
                <a className={exportClassString} onClick={exportCSSHandler} title='Export rules to a CSS file'>export as css</a>
            </div>
            <div id='headerRightSection'>
                <a className={undoClassString} onClick={undoHandler} title='Undo'>
                    <i className="fa-solid fa-rotate-left fa-lg" aria-hidden="true"></i>
                </a>
                <a className={redoClassString} onClick={redoHandler} title='Redo'>
                    <i className="fa-solid fa-rotate-right fa-lg" aria-hidden="true"></i>
                </a>
                <a id='menuIcon' onClick={showMenuHandler} ref={menuIconRef}>
                    <i className="fa-solid fa-ellipsis-vertical fa-lg" aria-hidden="true"></i>
                </a>
                <ul id='menu' ref={menuRef}>
                    <li onClick={focusTabHandler}>
                        Focus page
                    </li>
                    <li onClick={textEditingHandler} title='When turned on, allows editing any text in the page'>
                        Turn {props.textEditingEnabled ? 'off' : 'on'} text editing
                    </li>
                    <li onClick={helpHandler}>
                        Help
                    </li>
                    <li onClick={aboutHandler}>
                        About
                    </li>
                </ul>
            </div>
        </div>
    );
};

Header.propTypes = {
    hasUndo: PropTypes.bool,
    hasRedo: PropTypes.bool,
    hasExport: PropTypes.bool,
    textEditingEnabled: PropTypes.bool,
};

export default Header;
