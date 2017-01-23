// Get the style attribute value in a standardized way (using $.css on an inserted DOM element).
function getStandarizedValue(attr, val) {
    // If the value is a number, better to convert it (css() works better in that case... for example for font-size).
    var valFloatParsed = parseFloat(val);
    val = !Number.isNaN(valFloatParsed) ? valFloatParsed : val;

    // Elements must be added to dom in order to get their standardized css values.
    var $dummyEl = $('<div style="display:none" class="restyler restylerDummyItem">');

    $dummyEl.css(attr, val);
    $(document.body).append($dummyEl);

    var standarizedVal = $dummyEl.css(attr);
    $dummyEl.remove();
    return standarizedVal;
}

function isInlineStyle($element, attr) {
    return $element[0].style.getPropertyValue(attr) !== '';
}

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

// NOTE: This fixes a bug where getting the computed style value immediatly after returned the old value.
// NOTE: Apperantly forcing the display & offsetHeight forces the value to update correctly.
// http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes
/* jshint ignore:start */
function fixRerenderElement($element) {
    var origDisplayVal = $element[0].style.display;
    $element[0].style.display = 'none';
    $element[0].offsetHeight; // no need to store this anywhere, the reference is enough
    $element[0].style.display = origDisplayVal;
}
/* jshint ignore:end */

// NOTE: fixRerenderElement() has a side effect of losing the scrolling position.
// NOTE: So, we store and restore scrolling when applying done.
var scrollTop;
var scrollLeft;
function fixScrollLocationStore() {
    scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
}

// NOTE: Restore scrolling position.
function fixScrollLocationRestore() {
    document.documentElement.scrollTop = scrollTop;
    document.body.scrollTop = scrollTop;
    document.documentElement.scrollLeft = scrollLeft;
    document.body.scrollLeft = scrollLeft;
}

module.exports = {
    getStandarizedValue: getStandarizedValue,
    isInlineStyle: isInlineStyle,
    pad: pad,
    fixRerenderElement: fixRerenderElement,
    fixScrollLocationStore: fixScrollLocationStore,
    fixScrollLocationRestore: fixScrollLocationRestore
};
