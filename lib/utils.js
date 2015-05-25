// Syntactic sugar and simple utilities.

'use strict';

var _ = require('../externals/lodash');

var utils = {};

var dom;
dom = {
    // Create a dom fragment from a HTML string.
    createFragment: function(htmlString) {
        var fragment = document.createDocumentFragment();
        if (htmlString) {
            var div = fragment.appendChild(document.createElement('div'));
            div.innerHTML = htmlString;
            var child;
            /*eslint-disable no-cond-assign */
            while (child = div.firstChild) {
                /*eslint-enable no-cond-assign */
                fragment.insertBefore(child, div);
            }
            fragment.removeChild(div);
        }
        return fragment;
    },

    // Move DOM nodes from a source to a target. The nodes ares selected
    // based on a selector and the place they are insterted is a given tag
    // with a "select" attribute which contains the given selector. If
    //    source is 'aaa <span class="something">zzz</span>'
    // and
    //    target is 'rrr <content select=".something"></content> ttt'
    // After moveContentBasedOnSelector(source, target, '.something'):
    //    source is 'aaa'
    // and
    //    target is 'rrr <span class="something">zzz</span> ttt'
    moveContentBasedOnSelector: function(source, target, selector, targetTag) {
        var content;
        var elements;
        if (selector === '') {
            content = target.querySelector(targetTag);
            elements = source.childNodes;
        } else {
            content = target.querySelector(targetTag + '[select="' + selector + '"]');
            elements = source.querySelectorAll(selector);
        }
        // Warning: it is important to loop elements backward since current
        // element is removed at each step.
        for (var i = elements.length - 1; i >= 0; i--) {
            var element = elements[i];
            // TODO. Le "insert" ci-dessous sur les z-port fait que le
            // detachedCallback est appelé avec l'implementation de custom
            // elments par webreflections mais pas par l'implémentation de
            // Polymer (en utilisant le polyfill de Bosonic) ni avec
            // l'implémentation native de chrome.
            content.parentNode.insertBefore(
                    element,
                    content.nextSibling
            );
            // TODO move this elsewhere and clean: do all elements need this
            // onclick event? At least not z-ports. What about other kind of
            // element?
            if (element.onclick === null && element.tagName !== 'Z-PORT') {
                element.onclick = function () {
                    // Use global to access this function because using require
                    // on commands has a cyclic dependency.
                    window.app.commands.editBlock(source);
                };
            }
        }
        content.parentNode.removeChild(content);
    },

    move: function(options) {
        return dom.moveContentBasedOnSelector(
                options.from,
                options.to,
                options.withSelector,
                options.onTag
        );
    },

    // Get the position of the element relative to another one (default is
    // document body).
    getPosition: function (element, relativeElement) {
        var rect = element.getBoundingClientRect();
        relativeElement = relativeElement || document.body;
        var relativeRect = relativeElement.getBoundingClientRect();
        return {
            x: rect.left - relativeRect.left,
            y: rect.top - relativeRect.top
        };
    },

    getSelectionStart: function () {
        var node = document.getSelection().anchorNode;
        return ( (node !== null && node.nodeType === 3) ? node.parentNode : node );
    }

};
utils.dom = dom;

// Usefull for multiline string definition without '\' or multiline
// concatenation with '+'.
utils.stringFromCommentInFunction = function(func) {
    return func.toString().match(/[^]*\/\*([^]*)\*\/\s*\}$/)[1];
};

utils.createKeysGenerator = function () {
    // Returns a keys generator for a sequence that is build like that:
    //   b, c, d...
    //   ab, ac, ad...
    //   aab, aac, aad...
    // The idea is to have a sequence where each value is not the beginning
    // of any other value (so single 'a' can't be part of the sequence).
    //
    // One goal is to have shortest possible keys. So maybe we should use
    // additionnal prefix chars along with 'a'. And because it will be used
    // for shortcuts, maybe we can choose chars based on their position on
    // the keyboard.
    var index = 0;
    var charCodes = _.range('b'.charCodeAt(0), 'z'.charCodeAt(0) + 1);
    var idStrings = _.map(charCodes, function (charCode) {
        return String.fromCharCode(charCode);
    });
    var generator = {};
    generator.next = function () {
        var key = '';
        var i = index;
        if (i >= charCodes.length) {
            var r = Math.floor(i / charCodes.length);
            i = i % charCodes.length;
            while (r > 0) {
                key += 'a';
                r--;
            }
        }
        key += idStrings[i];
        index++;
        return key;
    };

    return generator;
};

utils.getScripStringtWithNewlines = function (element) {
    // The newlines are lost when using raw innerHTML for script tags
    // (at least on firefox). So we parse each child to add a newline
    // when BR are encountered.
    var value = '';
    [].forEach.call(element.childNodes, function (node) {
        if (node.tagName === 'BR') {
            value += '\n';
        } else {
            value += node.textContent;
        }
    });
    return value;
};


window.utils = utils;
module.exports = utils;
