'use strict';
import './Overlay.scss';

import React from 'react';
import PropTypes from 'prop-types';
import PubSub from 'pubsub-js';

import AboutPopup from '../AboutPopup/AboutPopup.jsx';

const Overlay = ({ isVisible, popup, message }) => {
    const renderPopup = () => {
        if (popup === 'message') {
            return (<div>{message}</div>);
        } else if (popup === 'about') {
            return <AboutPopup />;
        }
    };

    const closePopupHandler = () => {
        PubSub.publish('popup.close');
    };

    let showCloseBtn = popup === 'about';

    return (
        <div id='devtoolOverlay' className={isVisible ? 'visible' : ''}>
            <div id='popupContainer'>
                <a id='popupCloseBtn' className={showCloseBtn ? 'visible': ''} onClick={closePopupHandler}>
                    <i className="fa-solid fa-circle-xmark" aria-hidden="true"></i>
                </a>
                {renderPopup()}
            </div>
        </div>
    );
};

Overlay.propTypes = {
    isVisible: PropTypes.bool,
    popup: PropTypes.string,
    message: PropTypes.string,
};

export default Overlay;
