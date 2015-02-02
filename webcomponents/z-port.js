/*eslint quotes: [2, "single"]*/

/*global document, window */
/*global HTMLElement */

/*global utils */
/*global restyle */
/*global _ */

(function(){
    'use strict';

    var tagName = 'z-port';

    var htmlTemplate = utils.stringFromCommentInFunction(function () {/*
        <span class="port-key">a</span>
        <div class="selector"></div>
    */});
    var template = utils.dom.createFragment(htmlTemplate);

    var cssAsJson = {
        // The following will apply to the root DOM element of the custom
        // element.
        '': {
            'width': 18,
            'height': 3,
            'background': '#ddd',
            'display': 'inline-block',
            'position': 'relative',
            'overflow': 'visible',
            'zIndex': '5'
        },
        '.port-key': {
            'font-size': '0.7em',
            'color': '#aaa',
            'position': 'absolute',
            'padding-left': 3,
            'padding-right': 3,
            'zIndex': '10',
            'background': '#fff'
        },
        '.selector': {
            'position': 'absolute',
            'left': -8,
            'top': -8,
            'width': 24,
            'height': 14
        }
    };
    // Apply the css definition and prepending the custom element tag to all
    // CSS selectors.
    var style = restyle(tagName, cssAsJson);

    var redraw = function (port) {
        [].forEach.call(port.links, function (link) {
            link.redraw();
        });
    };

    var getUniqueKey = (function () {
        // Returns a key from a sequence that is build like that:
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
        return function () {
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
    })();

    var proto = Object.create(HTMLElement.prototype, {

        createdCallback: {value: function() {
            this.links = [];
            this.redraw = redraw.bind(null, this);
            window.selector.setSelectable(this, true);

            var composedDom = template.cloneNode(true);
            this.appendChild(composedDom);

            this.hideKey();
            var idSpan = this.querySelector('span.port-key');
            idSpan.innerHTML = getUniqueKey();
        }},

        unplug: {value: function () {
            this.links.forEach(function (link) {
                link.unconnect();
            });
        }},

        connectable: {value: function (port1, port2) {
            return (
                (port1.classList.contains('input')
                && port2.classList.contains('output'))
                ||
                (port1.classList.contains('output')
                && port2.classList.contains('input'))
                );
        }},

        connect: {value: function (port1, port2) {
            var link = document.createElement('z-link');
            if (port1.classList.contains('output')) {
                link.connect(link.begin, port1);
                link.connect(link.end, port2);
            } else {
                link.connect(link.end, port1);
                link.connect(link.begin, port2);
            }
            // TODO use another way to find where to add new links.
            var patch = document.querySelector('#patch');
            patch.appendChild(link);
            link.redraw();
        }},

        connectionPosition: {
            get: function () {
                var element = this;
                var rect = element.getBoundingClientRect();
                var position = utils.dom.getPosition(element);
                var center = {
                    x: position.x + rect.width / 2,
                    y: position.y + rect.height / 2
                };
                return center;
            }
        },

        showKey: {value: function () {
            var key = this.querySelector('span.port-key');
            key.style.visibility = 'visible';
        }},

        hideKey: {value: function () {
            var key = this.querySelector('span.port-key');
            key.style.visibility = 'hidden';
        }}

    });

    proto.css = style;
    document.registerElement(tagName, {prototype: proto});

})();
