'use strict';
import './AboutPopup.scss';

import React from 'react';

const AboutPopup = () => {
    return (
        <div id='aboutPopup'>
            <h2>Restyler</h2>
            <div id='aboutText'>Created by <b>Asaf Menahem</b>, with the help of <b>Nir Mizrahi</b> & <b>Orly Boojor</b> (A.K.A The Dream Team).
            This extension is <a href="https://github.com/asimen1/restyler" target="_blank" className="link" rel="noreferrer">open source</a>, feel free to contribute :)</div>
        </div>
    );
};

export default AboutPopup;
