// Syntactic sugar and simple utilities.

/*eslint quotes: [2, "single"]*/
/*global document, window */

(function(){
    'use strict';

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
                // TODO move this elsewhere.
                if (element.onclick === null) {
                    element.onclick = function () {
                        window.commands.editBlock(source);
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
            return (node.nodeType == 3 ? node.parentNode : node);
        }

    };
    utils.dom = dom;

    // Usefull for multiline string definition without '\' or multiline
    // concatenation with '+'.
    utils.stringFromCommentInFunction = function(func) {
        return func.toString().match(/[^]*\/\*([^]*)\*\/\s*\}$/)[1];
    };

    window.utils = utils;
})();
