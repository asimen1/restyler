'use strict';
import '../../stylesheets/devtool/about_popup.scss';

import React from 'react';

let AboutPopup = React.createClass({
    render: function() {
        return (
            <div id = 'aboutPopup'>
                <h2>Restyler (version 1.2.0)</h2>
                <div id = 'aboutText'>Created by <b>Asaf Menahem</b>, with the help of <b>Nir Mizrahi</b> & <b>Orly Boojor</b> (A.K.A The Dream Team).
                This extension is <a href="https://github.com/asimen1/restyler" target="_blank" className="link">open source</a>, feel free to contribute :)</div>
            </div>
        );
    }
});

export default AboutPopup;