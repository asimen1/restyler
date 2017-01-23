// RESTYLER - Asaf Menahem

var Rules = require('./rules.js');
var Observer = require('./observer.js');
var Historian = require('./historian.js');
var Helpers = require('./helpers.js');

var inited = false;
var enabled = true;

// ----------------------------------------------------
// GENERAL VALIDATION.
// ----------------------------------------------------

if (window.Restyler) {
    throw new Error('Restyler - ERROR - Restyler initialized more than once...');
}

// ----------------------------------------------------
// RESTYLER !!!
// ----------------------------------------------------
window.Restyler = (function() { // jshint ignore:line

    // ----------------------------------------------------
    // ELEMENTS MODIFICATION - start.
    // ----------------------------------------------------

    function revertEl(element) {
        var $element = $(element);

        // Observer should ignore this changes.
        Observer.stop();

        // Need to revert values only if haven't changed (for example not if inline style was set externally).
        var data = $element.data('restylerTargetData');
        var dataRules = data.rules;
        while (dataRules.length > 0) {
            // 'pop' will ensure we revert in reverse order of rules pushed.
            var currDataRule = dataRules.pop();

            // Check first if element still has our value (attribute has the value and with 'important').
            var elAtrrVal = $element[0].style.getPropertyValue(currDataRule.attr);
            var elAttrPriority = $element[0].style.getPropertyPriority(currDataRule.attr);
            if (elAtrrVal === currDataRule.newVal && elAttrPriority === 'important') {
                // If was inline, return the original value as inline.
                // If wasn't inline, remove our added inline value.
                if (currDataRule.wasOrigValInline) {
                    $element[0].style.setProperty(currDataRule.attr, currDataRule.prevVal, currDataRule.prevPriority);
                } else {
                    $element[0].style.setProperty(currDataRule.attr, '', currDataRule.prevPriority);
                }
            }
        }

        Helpers.fixRerenderElement($element);

        // Remove the data property indicating that this target mas matched and the associated data.
        $element.data('restylerTarget', false);
        $element.data('restylerTargetData', null);

        // Start observing again.
        Observer.start();
    }

    // Apply the styles to a single element.
    function applyEl(element) {
        var $element = $(element);

        // Exclude our added elements.
        if (!$element.hasClass('restylerItem')) {
            // Revert changed elements before attempting to apply.
            if ($element.data('restylerTarget')) {
                revertEl($element);
            }

            // If were in disabled state, don't apply any rules.
            if (enabled) {
                // Iterate over the rules and change all matching elements.
                var rules = Rules.getRules(true);
                for (var i = 0; i < rules.length; i++) {
                    var currRule = rules[i];
                    if (currRule.options.enabled) {
                        // Compare attribute values and selector matching (if given).
                        // NOTE: Important to use 'css' and not 'getPropertyValue' since we standardized
                        // NOTE: the user input using 'css'.
                        var elementVal = $element.css(currRule.attr);

                        if ((!currRule.origVal || elementVal === currRule.origVal) &&
                            (!currRule.options.selector || $element.is(currRule.options.selector))) {
                            // Observer should ignore this changes.
                            Observer.stop();

                            // Mark that this element has been set with a restyling value.
                            // NOTE: Using data and not class name because some components copy classes
                            // NOTE: but not their data, which later causes errors (restyler target without target data).
                            $element.data('restylerTarget', true);

                            // If target data been set for the first time, create it.
                            if (!$element.data('restylerTargetData')) {
                                $element.data('restylerTargetData', { rules: [] });
                            }

                            // Add the rules matched to the target data.
                            $element.data('restylerTargetData').rules.push({
                                attr: currRule.attr,
                                // NOTE: This is the current element value, it might not be its real original
                                // NOTE: value (since might been changed by previous rules) but when
                                // NOTE: we revert we do it by reverse order so its ok.
                                prevVal: elementVal,
                                prevPriority: $element[0].style.getPropertyPriority(currRule.attr),
                                newVal: currRule.newVal,
                                wasOrigValInline: Helpers.isInlineStyle($element, currRule.attr)
                            });

                            // Apply the style to the element.
                            // NOTE: Using 'important' so will have high specificity (and also our changes will be easier to spot).
                            $element[0].style.setProperty(currRule.attr, currRule.newVal, 'important');

                            Helpers.fixRerenderElement($element);

                            // Start observing again.
                            Observer.start();
                        }
                    }
                }
            }
        }
    }

    // Apply the styling rules to all the elements in the DOM (including the body element).
    function applyAll() {
        Helpers.fixScrollLocationStore();

        $('*').each(function(index, element) {
            applyEl(element);
        });

        Helpers.fixScrollLocationRestore();
    }

    // ----------------------------------------------------
    // ELEMENTS MODIFICATION - end.
    // ----------------------------------------------------

    // ----------------------------------------------------
    // PUBLIC API - start
    // ----------------------------------------------------

    function init() {
        //console.log('Restyler - init()');
        if (!inited) {
            Observer.init(applyEl);
            Historian.init();

            inited = true;
        }
    }

    function isEnabled() {
        return enabled;
    }

    // Options (optional):
    // - selector: JQuery selector that the rule will apply only to its matched elements.
    function style(id, attr, origVal, newVal, options, isPreview) {
        var standarizedOrigVal = origVal ? Helpers.getStandarizedValue(attr, origVal) : null;
        var standarizedNewVal = Helpers.getStandarizedValue(attr, newVal);

        // Add the rule (will use existing if already exists) and reapply all.
        Rules.add(id, attr, standarizedOrigVal, standarizedNewVal, options, isPreview);
        applyAll();
    }

    // Remove the rule and reapply all.
    function clear(id) {
        Rules.remove(id);
        applyAll();
    }

    function enableRule(id) {
        Rules.enable(id);
        applyAll();
    }

    function disableRule(id) {
        Rules.disable(id);
        applyAll();
    }

    function reset() {
        Rules.reset();
        applyAll();
    }

    function enableTextEditing() {
        $(document.body).attr('contenteditable', true);
        $('*').addClass('restylerContentEditable');
    }

    function disableTextEditing() {
        $(document.body).attr('contenteditable', false);
        $('*').removeClass('restylerContentEditable');
    }

    function undo() {
        var undoStack = Historian.getUndoStack();
        var backup = undoStack.length > 0 ? undoStack.pop() : null;
        if (backup) {
            // Each undo enables a redo.
            Historian.addRedo();

            // Clear all and apply the backup rules.
            reset();
            Rules.setRules(backup);
            applyAll();
        }
    }

    function redo() {
        var redoStack = Historian.getRedoStack();
        var backup = redoStack.length > 0 ? redoStack.pop() : null;
        if (backup) {
            // Clear all and apply the backup rules.
            reset();
            Rules.setRules(backup);
            applyAll();
        }
    }

    function exportConfig() {
        var config = [];

        var rules = Rules.getRules();
        for (var i = 0; i < rules.length; i++) {
            var currRule = rules[i];
            config.push({
                attr: currRule.attr,
                origVal: currRule.origVal,
                newVal: currRule.newVal,
                options: currRule.options
            });
        }

        // Save to file.
        var date = new Date();
        var year = Helpers.pad(date.getFullYear(), 4);
        var month = Helpers.pad(date.getMonth() + 1, 2);
        var day = Helpers.pad(date.getDate(), 2);
        var hours = Helpers.pad(date.getHours(), 2);
        var minutes = Helpers.pad(date.getMinutes(), 2);
        var seconds = Helpers.pad(date.getSeconds(), 2);
        var formattedTime = [year, month, day, hours, minutes, seconds].join('');
        var fileName = 'restyler_config-' + formattedTime + '.json';
        var $downloadLink = $('<a target="_blank" title="Download Restyler Config" download="' + fileName + '">');
        var blob = new Blob([JSON.stringify(config)], { type: 'text/plain' });
        $downloadLink.attr('href', URL.createObjectURL(blob));
        $(document.body).append($downloadLink);
        $downloadLink[0].click(); // NOTE: jquery click() doesn't work for some reason...
        $downloadLink.remove();
    }

    function importConfig() {
        return new Promise(function(resolve, reject) {
            var $importInput = $('<input type="file" accept=".json">');
            $importInput.on('change', function(e) {
                if (e.target.files && e.target.files.length === 1) {
                    var fileReader = new FileReader();
                    fileReader.onload = function(event) {
                        var result = event.target.result;
                        var rulesArr = JSON.parse(result);

                        // Reset all rules first.
                        reset();

                        rulesArr.forEach(function(rule) {
                            style(rule.attr, rule.origVal, rule.newVal, rule.options);
                        });
                    };

                    fileReader.readAsText(e.target.files.item(0));

                    resolve();
                } else {
                    reject();
                }
            });

            $importInput.click();
        });
    }

    function disableAll() {
        enabled = false;
        applyAll();
    }

    function enableAll() {
        enabled = true;
        applyAll();
    }

    function destroy() {
        if (inited) {
            reset();
            Observer.destroy();
            Historian.destroy();

            inited = false;
        }
    }

    // ----------------------------------------------------
    // PUBLIC API - end
    // ----------------------------------------------------

    // Public interface.
    return {
        init: init,
        isEnabled: isEnabled,

        applyAll: applyAll,

        getRules: function(includePreview) { return Rules.getRules(includePreview); },
        setRules: function(rules) { return Rules.setRules(rules); },
        getUndoStack: function() { return Historian.getUndoStack(); },
        setUndoStack: function(undoStack) { return Historian.setUndoStack(undoStack); },
        getRedoStack: function() { return Historian.getRedoStack(); },
        setRedoStack: function(redoStack) { return Historian.setRedoStack(redoStack); },

        style: function() { Historian.wrapUndoable(style, arguments); },
        clear: function() { Historian.wrapUndoable(clear, arguments); },
        enableRule: function() { Historian.wrapUndoable(enableRule, arguments); },
        disableRule: function() { Historian.wrapUndoable(disableRule, arguments); },
        reset: function() { Historian.wrapUndoable(reset, arguments); },

        enableTextEditing: enableTextEditing,
        disableTextEditing: disableTextEditing,

        disableAll: disableAll,
        enableAll: enableAll,

        // undo/redo - redo() is also undoable but should not reset the redo stack.
        undo: undo,
        redo: function() { Historian.wrapUndoable(redo, arguments, true); },

        exportConfig: exportConfig,
        importConfig: importConfig,
        destroy: destroy
    };
})();
