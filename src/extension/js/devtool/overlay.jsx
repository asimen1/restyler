'use strict';
import '../../stylesheets/devtool/overlay.scss';

import React from 'react';
import PubSub from 'pubsub-js';

import AboutPopup from './about_popup.jsx';

let Overlay = React.createClass({
    propTypes: {
        isVisible: React.PropTypes.bool, 
        popup: React.PropTypes.string,
        message: React.PropTypes.string
    },

    renderPopup: function() {
        if (this.props.popup === 'message') {
            return (<div> { this.props.message } </div>);
        } else if (this.props.popup === 'about') {
            return <AboutPopup/>;
        }
    },

    render: function() {
        let showCloseBtn = this.props.popup === 'about';

        return (
            <div id = 'devtoolOverlay' className = { this.props.isVisible ? 'visible' : '' }>
                <div id = 'popupContainer'>
                    <a id = 'popupCloseBtn' className = { showCloseBtn ? 'visible': '' } onClick = { this.closePopupHandler }>
                       <i className="fa fa-times fa-lg" aria-hidden="true"></i>
                    </a>
                    { this.renderPopup() }
                </div>
            </div>
        );
    },

    closePopupHandler: function() {
        PubSub.publish('popup.close');
    }
});

export default Overlay;