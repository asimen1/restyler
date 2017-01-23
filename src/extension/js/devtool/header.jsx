'use strict';
import '../../stylesheets/devtool/header.scss';

import React from 'react';
import PubSub from 'pubsub-js';

import ActionHandler from './action_handler.jsx';
import TabHelper from './tab_helper.jsx';
import Messenger from '../common/messenger.js';
import Messages from '../common/messages.js';

let messenger = new Messenger();
messenger.initConnection('devtool', 'header');

let HeaderControls = React.createClass({
    propTypes: {
        hasUndo: React.PropTypes.bool,
        hasRedo: React.PropTypes.bool,
        hasExport: React.PropTypes.bool,
        textEditingEnabled: React.PropTypes.bool
    },

    render: function() {
        let undoClassString = this.props.hasUndo ? '' : 'disabled';
        let redoClassString = this.props.hasRedo ? '' : 'disabled';
        let exportClassString = this.props.hasExport ? '' : 'disabled';

        return (
            <div id='header'>
                <div id='headerLeftSection'>
                    <span id = 'name' >RESTYLER</span>
                    <a onClick = { this.importHandler } title = 'Import a previously saved rules config' >import</a>
                    <a className = { exportClassString } onClick = { this.exportHandler } title = 'Export rules to a config file'>export</a>
                    <a className = { exportClassString } onClick = { this.exportCSSHandler } title = 'Export rules to a CSS file'>export as css</a>
                </div>
                <div id='headerRightSection'>
                    <a className = { undoClassString } onClick = { this.undoHandler } title = 'Undo'>
                        <i className="fa fa-undo fa-lg" aria-hidden="true"></i>
                    </a>
                    <a className = { redoClassString } onClick = { this.redoHandler } title = 'Redo'>
                        <i className="fa fa-repeat fa-lg" aria-hidden="true"></i>
                    </a>
                    <a id = 'menuIcon' onClick = { this.showMenuHandler } ref = { (el) => this.menuIcon = el }>
                        <i className="fa fa-ellipsis-v fa-lg" aria-hidden="true"></i>    
                    </a>
                    <ul id = 'menu' ref = { (el) => this.menu = el }>
                        <li onClick = { this.focusTabHandler }>
                            Show current tab
                        </li>
                        <li onClick = { this.textEditingHandler }
                            title = 'When turned on, allows editing any text in the page'>
                            Turn { this.props.textEditingEnabled ? 'off' : 'on' } text editing
                        </li>
                        <li onClick = { this.helpHandler }>
                            Help
                        </li>
                        <li onClick = { this.aboutHandler }>
                            About
                        </li>
                    </ul>
                </div>
            </div>
        );
    },

    undoHandler: function(e) {
        if (!$(e.target.parentElement).hasClass('disabled')) {
            ActionHandler.undo();
        }
    },

    redoHandler: function(e) {
        if (!$(e.target.parentElement).hasClass('disabled')) {
            ActionHandler.redo();
        }
    },

    importHandler: function() {
        ActionHandler.import();
    },

    exportHandler: function(e) {
        if (!$(e.target).hasClass('disabled')) {
            ActionHandler.export();
        }
    },

    exportCSSHandler: function(e) {
        if (!$(e.target).hasClass('disabled')) {
            ActionHandler.export(true);
        }
    },

    windowClickHandler: function() {
        this.hideMenu();
    },

    hideMenu: function() {
        var $menuIcon = $(this.menuIcon);
        var $menu = $(this.menu);

        if ($menu.hasClass('visible')) {
            $menuIcon.removeClass('open');

            $menu.fadeOut('fast');
            $menu.removeClass('visible');

            window.removeEventListener('click', this.windowClickHandler);
        }
    },

    showMenuHandler: function(e) {     
        var $menuIcon = $(this.menuIcon);
        var $menu = $(this.menu);

        if ($menu.hasClass('visible')) {
            this.hideMenu();
        } else {
            $menuIcon.addClass('open');

            // So click event on this won't hide the menu.
            e.preventDefault();
            e.stopPropagation();

            $menu.fadeIn('fast');
            $menu.addClass('visible');

            window.addEventListener('click', this.windowClickHandler);

            $menu.focus();
        }
    },

    focusTabHandler: function() {
        messenger.sendMessageToHub({
            name: Messages.FOCUS_TAB,
            tabId: TabHelper.getTabId()
        });
    },

    textEditingHandler: function() {
        if (this.props.textEditingEnabled) {
            PubSub.publish('header.disableTextEditing');
        } else {
            PubSub.publish('header.enableTextEditing');
        }
    },

    helpHandler: function() {
        messenger.sendMessageToHub({
            name: Messages.SHOW_HELP
        });
    },

    aboutHandler: function() {
        PubSub.publish('header.about');
    }
});

export default HeaderControls;