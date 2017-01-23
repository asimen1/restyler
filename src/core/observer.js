var Helpers = require('./helpers.js');
var Rules = require('./rules.js');

// https://developer.mozilla.org/en/docs/Web/API/Node/nodeType
var ELEMENT_NODE_TYPE = 1;

// Configuration of the observer.
var OBSERVER_CONFIG = {
    attributes: true, // attributes change
    attributeFilter: ['style', 'class'], // only this attributes are relevant for styling
    attributeOldValue: true, // record attribute old value on mutation
    childList: true, // node elements added / removed
    subtree: true // observe entire subtree of target element
};

var _observer;

// Create an observer instance.
function init(applyElHandler) {
    // Apply the handler on the given node AND all its children elements.
    // This is needed for the observer mutation handling since it does not fire for inner elements.
    var applyElAndChildren = function(node) {
        Helpers.fixScrollLocationStore();

        var allNodes = [node];
        while (allNodes.length) {
            var currNode = allNodes.pop();
            applyElHandler(currNode);

            // Add all the node's child elements ('children' is guaranteed to return only element node types).
            for (var i = 0; i < currNode.children.length; i++) {
                allNodes.push(currNode.children[i]);
            }
        }

        Helpers.fixScrollLocationRestore();
    };

    _observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // Performance optimizations: observer doesn't need to do anything if no rules set.
            if (Rules.getRules(true).length > 0) {
                if (mutation.type === 'attributes') {
                    // Apply only for Element nodes.
                    if (mutation.target.nodeType === ELEMENT_NODE_TYPE) {
                        applyElAndChildren(mutation.target);
                    }
                } else if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // NOTE: Node list and not an array...
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        // Apply only for Element nodes.
                        var node = mutation.addedNodes[i];
                        if (node.nodeType === ELEMENT_NODE_TYPE) {
                            applyElAndChildren(node);
                        }
                    }
                }
            }
        });
    });

    start();
}

function stop() {
    _observer.disconnect();
}

// Observe interesting DOM changes that should apply styling.
function start() {
    // For safety, make sure we are not already observing.
    stop();

    // Start observing.
    _observer.observe(document.body, OBSERVER_CONFIG);
}

function destroy() {
    stop();
    _observer = null;
}

module.exports = {
    init: init,
    stop: stop,
    start: start,
    destroy: destroy
};
