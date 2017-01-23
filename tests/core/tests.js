var $testContainerDiv = $('<div id="testContainerDiv">');

function getStandarizedValue(attr, val) {
    // Elements must be added to dom in order to get their standardized css values.
    var $dummyEl = $('<div style="display:none" class="restyler restylerDummyItem">');
    $dummyEl.css(attr, val);
    $(document.body).append($dummyEl);

    var standarizedVal = $dummyEl.css(attr);
    $dummyEl.remove();
    return standarizedVal;
}

function addElement(elType, css) {
    var $el = $('<' + elType + '>');
    $el.css(css);

    $testContainerDiv.append($el);
    return $el;
}

function pauseTest(assert, milliseconds) { // jshint ignore:line
    var done = assert.async();
    setTimeout(function() {
        done();
    }, milliseconds);
}

QUnit.testStart(function() {
    $(document.body).append($testContainerDiv);
    Restyler.init();
});

QUnit.testDone(function() {
    Restyler.destroy();
    $testContainerDiv.empty();
    $testContainerDiv.remove();
});

QUnit.module('Basic', function() {
    QUnit.test('API: style & clear', function(assert) {
        var $el = addElement('div', {
            'width': '50px',
            'height': '50px',
            'background-color': 'red'
        });

        Restyler.style('background-color', 'red', 'blue');
        assert.equal($el.css('background-color'), getStandarizedValue('background-color', 'blue'), 'background-color on item changed');

        Restyler.clear('background-color', 'red', 'blue');
        assert.equal($el.css('background-color'), getStandarizedValue('background-color', 'red'), 'background-color on item reverted to original');
    });

    QUnit.test('API: undo & redo', function(assert) {
        var $el = addElement('div', {
            'width': '50px',
            'height': '50px',
            'background-color': 'red'
        });

        Restyler.style('background-color', 'red', 'blue');
        assert.equal($el.css('background-color'), getStandarizedValue('background-color', 'blue'), 'background-color on item changed');

        Restyler.undo();
        assert.equal($el.css('background-color'), getStandarizedValue('background-color', 'red'), 'background-color on item reverted to original after undo');

        Restyler.redo();
        assert.equal($el.css('background-color'), getStandarizedValue('background-color', 'blue'), 'background-color on item changed after redo');
    });

    QUnit.test('API: reset', function(assert) {
        var $el = addElement('div', {
            'width': '50px',
            'height': '50px',
            'background-color': 'red'
        });

        var $el2 = addElement('div', {
            'width': '50px',
            'height': '50px',
            'background-color': 'green'
        });

        Restyler.style('background-color', 'red', 'blue');
        assert.equal($el.css('background-color'), getStandarizedValue('background-color', 'blue'), 'background-color on item changed');

        Restyler.style('background-color', 'green', 'yellow');
        assert.equal($el2.css('background-color'), getStandarizedValue('background-color', 'yellow'), 'background-color on item changed');

        Restyler.reset();
        assert.equal($el.css('background-color'), getStandarizedValue('background-color', 'red'), 'background-color on item reverted to original after reset');
        assert.equal($el2.css('background-color'), getStandarizedValue('background-color', 'green'), 'background-color on item reverted to original after reset');
    });

    QUnit.skip('Various element types', function(assert) {
        // var $el = addElement('div', {
        //     'width': '50px',
        //     'height': '50px',
        //     'color':
        //     'background-color': 'red'
        // });

        // divs, ...
    });

    QUnit.skip('Various css fields', function(assert) {
        // http://www.blooberry.com/indexdot/css/propindex/all.htm
        var $el = addElement('div', {
            'background-color': 'red',
            'border-color': 'blue',
            'border-width': '30px',
            'color': 'black',
            'font-family': 'Courier',
            'font-size': '12px',
            'height': '50px',
            'margin': '5px',
            'width': '50px'
        });
        $el.text('meow cat');

        Restyler.style('background-color', 'red', 'blue');
        Restyler.style('border-color', 'blue', 'green');
        Restyler.style('border-width', '30px', 'blue');
        Restyler.style('color', 'red', 'blue');
        Restyler.style('font-family', 'red', 'blue');
        Restyler.style('height', 'red', 'blue');
        Restyler.style('margin', 'red', 'blue');
        Restyler.style('width', 'red', 'blue');
    });

    QUnit.skip('Selectors', function(assert) {

    });

    QUnit.skip('Irrelevant changes', function(assert) {

    });
});

QUnit.module('Helpers', function() {
    QUnit.skip('isInlineStyle()', function(assert) {

    });
});

QUnit.module('Historian', function() {
    QUnit.skip('wrapUndoable()', function(assert) {

    });

    QUnit.skip('addUndo() getUndoStack()', function(assert) {

    });

    //...
});

QUnit.module('Observer', function() {
    QUnit.skip('"style" changed', function(assert) {
    });

    QUnit.skip('"class" changed', function(assert) {
    });

    QUnit.skip('Elements added', function(assert) {
    });
});

QUnit.module('Rules', function() {
    QUnit.skip('addRules() getRules()', function(assert) {
    });

    //....
});

QUnit.module('Import & Export', function() {
    QUnit.skip('Import', function(assert) {
    });

    QUnit.skip('Export', function(assert) {
    });
});

QUnit.module('Stress Tests', function() {
    QUnit.skip('100 divs', function(assert) {

    });

    QUnit.skip('1000 divs', function(assert) {

    });

    QUnit.skip('10000 divs', function(assert) {

    });

    //...
});
