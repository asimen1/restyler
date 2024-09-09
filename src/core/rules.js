let _rules = [];

function getRule(id) {
    let rule = null;
    for (let i = 0; i < _rules.length; i++) {
        if (_rules[i].id === id) {
            rule = _rules[i];
            break;
        }
    }

    if (!rule) {
        throw new Error('could not find rule with id: ' + id);
    }

    return rule;
}

function add(id, attr, origVal, newVal, options, isPreview) {
    options = options || {};

    let rule = {
        id: id,
        attr: attr,
        origVal: origVal,
        newVal: newVal,
        options: options,
        isPreview: isPreview,
    };

    _rules.push(rule);
}

function remove(id) {
    let origRulesLength =  _rules.length;

    for (let i = 0; i < _rules.length; i++) {
        if (_rules[i].id === id) {
            _rules.splice(i, 1);
            break;
        }
    }

    if (origRulesLength === _rules.length) {
        throw new Error('could not find rule to remove with id: ' + id);
    }
}

function disable(id) {
    let rule = getRule(id);
    rule.options.enabled = false;
}

function enable(id) {
    let rule = getRule(id);
    rule.options.enabled = true;
}

function reset() {
    _rules = [];
}

export default {
    getRules: function(includePreview) {
        if (includePreview) {
            return _rules;
        } else {
            return _rules.filter(rule => !rule.isPreview);
        }
    },
    setRules: function(rules) {
        _rules = rules;
    },

    add: add,
    remove: remove,
    disable: disable,
    enable: enable,
    reset: reset,
};
