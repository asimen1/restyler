import Messenger from 'chrome-ext-messenger';
import Messages from '../common/messages.js';

let messenger = new Messenger();
let connection = messenger.initConnection('content_script', 'inspect');

let $inspectedElement = null;
function onMouseOver() {
    let $this = $(this);

    // Ignore parents inspection, only add it to bottom level child.
    if ($this.has('.restylerInspect').length > 0) {
        $this.removeClass('restylerInspect');
    } else {
        $inspectedElement = $this;
        $inspectedElement.addClass('restylerInspect');
    }
}

function onMouseOut() {
    $(this).removeClass('restylerInspect');
}

function onInspectClick(e) {
    // NOTE: Disable the actual click, seems to work but not 100% sure :)
    e.preventDefault();
    e.stopImmediatePropagation();

    var getInspectValue = function($inspectedElement) {
        var retVal = '';

        retVal += $inspectedElement.prop('tagName');

        var id = $inspectedElement.attr('id');
        if (id) {
            retVal += '#' + id;
        }

        var classesStr = $inspectedElement[0].className;
        if (classesStr && typeof classesStr === 'string') {
            var classesArr = classesStr.split(/\s+/);
            classesArr.forEach(function(classStr) {
                retVal += '.' + classStr;
            });
        }

        return retVal;
    };

    if ($inspectedElement) {
        // We don't want our class name to be in the element path.
        $inspectedElement.removeClass('restylerInspect');

        connection.sendMessage('devtool:rules_adder', {
            name: Messages.INSPECT_VALUE,
            value: getInspectValue($inspectedElement)
        });
    }

    // NOTE: stopping the inspection will also be done by the devtool
    // NOTE: so will apply to all other content scripts (iframes).
    stopInspect();
}

function startInspect() {
    $('*').not('body, html').on({
        mouseover: onMouseOver,
        mouseout: onMouseOut,
        click: onInspectClick
    });
}

function stopInspect() {
    $('*').not('body, html').off({
        mouseover: onMouseOver,
        mouseout: onMouseOut,
        click: onInspectClick
    });

    $('*').removeClass('restylerInspect');

    $inspectedElement = null;
}

export { startInspect, stopInspect };