/*eslint quotes: [2, "single"]*/

/*global document */
/*global HTMLElement */
/*global window */

/*global utils */

/*global restyle */
/*global Draggabilly */
/*global _ */

(function(){
    'use strict';

    var tagName = 'z-block';

    var htmlTemplate = utils.stringFromCommentInFunction(function () {/*
        <div>
            <div class="ports-container inputs">
                <content select="z-port.input"></content>
            </div>
            <span class="id">a</span>
            <div class="content-container">
                <content></content>
            </div>
            <div class="ports-container outputs">
                <content select="z-port.output"></content>
            </div>
        </div>
    */});
    var template = utils.dom.createFragment(htmlTemplate);

    var cssAsJson = {
        // The following will apply to the root DOM element of the custom
        // element.
        '': {
            // By default custom elements are inline elements. Current element
            // has its own height and width and can be insterted in a text
            // flow. So we need a 'display: inline-block' style. Moreover, this
            // is needed as a workaround for a bug in Draggabilly (which only
            // works on block elements, not on inline ones).
            'display': 'inline-block',
            'position': 'absolute'
        },
        '> div': {
            'background': 'white',
            'border-left': '3px solid',
            'border-left-color': 'white',
            'border-right': '3px solid',
            'border-right-color': 'white',
            'boxShadow': '2px 2px 3px 0px #dfdfdf'
        },
        '.content-container': {
            'padding': '8px 15px 8px 15px'
        },
        '.ports-container': {
            'padding': 0,
            'minHeight': 3,
            'overflow': 'visible'
        },
        '.ports-container z-port': {
            'float': 'left',
            'marginLeft': 8,
            'marginRight': 8
        },
        'span.id': {
            'font-size': 'smaller',
            'color': '#aaa',
            'position': 'absolute',
            'bottom': 0,
            'right': 0,
            'padding-right': 3
        },
        'z-port.input .port-key': {
            'bottom': 5,
            'left': -5
        },
        'z-port.output .port-key': {
            'top': 5,
            'right': -5
        }
    };
    // Apply the css definition and prepending the custom element tag to all
    // CSS selectors.
    var style = restyle(tagName, cssAsJson);

    var redraw = function (block) {
        var ports = block.querySelectorAll('z-port');
        [].forEach.call(ports, function (port) {
            port.redraw();
        });
    };

    var makeItDraggable = function (block) {
        var draggie = new Draggabilly(block, {
            containment: true
        });
        draggie.externalAnimate = function () {
            redraw(block);
        };
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

    var proto = Object.create(HTMLElement.prototype);
    proto.createdCallback = function() {
        // At the beginning the light DOM is stored in the current element.
        var lightDom = this;
        // Start composed DOM with a copy of the template
        var composedDom = template.cloneNode(true);
        // Then progressively move elements from light to composed DOM based on
        // selectors on light DOM and fill <content> tags in composed DOM with
        // them.
        ['z-port.input', 'z-port.output', ''].forEach(function(selector) {
            utils.dom.move({
                from: lightDom, withSelector: selector,
                to: composedDom, onTag: 'content'
            });
        });
        // At this stage composed DOM is completed and light DOM is empty (i.e.
        // 'this' has no children). Composed DOM is set as the content of the
        // current element.
        this.appendChild(composedDom);

        this.hideKey();
        var idSpan = this.querySelector('span.id');
        idSpan.innerHTML = getUniqueKey();

        var that = this;
        var ports = that.querySelectorAll('z-port');
        [].forEach.call(ports, function(port) {
            port.block = that;
        });

        this.content = this.querySelector('.ze-content');

        // TODO move elsewhere
        this.onclick = function () {
            window.setCurrentBlock(that);
        };
    };

    proto.attachedCallback = function() {
        // TODO bug in chrome or in webreflection polyfill. If makeItDraggable
        // is called in createdCallback then Draggabily adds a
        // 'posistion:relative' because the css style of block that set
        // position to absolute has not been applied yet (with chrome). With
        // WebReflection's polyfill the style is applied so Draggabilly doesn't
        // change position. Why a different behaviour? Which is wrong ? Chrome,
        // webreflection or the spec? Maybe we can try with polymer polyfill.
        makeItDraggable(this);
    };

    proto.unplug = function() {
        var ports = this.querySelectorAll('z-port');
        [].forEach.call(ports, function (port) {
            port.unplug();
        });
    };

    proto.addPort = function (htmlString) {
        var port = utils.dom.createFragment(htmlString);
        port.block = this;
        if (port.firstChild.classList.contains('input')) {
            var portContainer = this.querySelector('.ports-container.inputs');
            portContainer.appendChild(port);
        } else if (port.firstChild.classList.contains('output')) {
            var portContainer = this.querySelector('.ports-container.outputs');
            portContainer.appendChild(port);
        }
    };

    proto.showKey = function () {
        var key = this.querySelector('span.id');
        key.style.visibility = 'visible';
    };

    proto.hideKey = function () {
        var key = this.querySelector('span.id');
        key.style.visibility = 'hidden';
    };

    // TODO make it a property with getter.
    proto.ports = function () {
        return {
            'out': this.querySelector('z-port.output')
        };
    };

    proto.css = style;
    document.registerElement(tagName, {prototype: proto});

    // TODO clean globals
    window.getElementBlock = function (element) {
        // TODO do a search to find the first parent block for cases where
        // element is down in the element hiearchy.
        var maybeBlock = element.parentNode.parentNode.parentNode;
        var block;
        if (maybeBlock.tagName === 'Z-BLOCK') {
            block = maybeBlock;
        } else {
            block = element.phantomedBy.parentNode.parentNode.parentNode;
        }
        return block;
    };
})();
