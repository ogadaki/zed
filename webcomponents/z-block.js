/*eslint quotes: [2, "single"]*/

/*global document */
/*global HTMLElement */
/*global window */

/*global restyle */
/*global Draggabilly */

'use strict';

var utils = require('../lib/utils');
var selector = require('../lib/selector');

var tagName = 'z-block';

var htmlTemplate = utils.stringFromCommentInFunction(function () {/*
    <div id="main">
        <div class="ports-container inputs">
            <content select="z-port.input"></content>
        </div>
        <span class="block-key">a</span>
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
    'span.block-key': {
        'font-size': 'smaller',
        'color': '#444',
        'position': 'absolute',
        'bottom': 0,
        'right': 0,
        'padding-right': 3,
        'padding-left': 3,
        'background': '#fff'
    },
    'z-port.input .port-key': {
        'top': 3
    },
    'z-port.output .port-key': {
        'bottom': 3
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

var properties = {
    createdCallback: {value: function() {
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
        this.redraw = redraw.bind(null, this);
        selector.setSelectable(this, true);
    }},

    attachedCallback: {value: function() {
        // TODO bug in chrome or in webreflection polyfill. If makeItDraggable
        // is called in createdCallback then Draggabily adds a
        // 'position:relative' because the css style of block that set
        // position to absolute has not been applied yet (with chrome). With
        // WebReflection's polyfill the style is applied so Draggabilly doesn't
        // change position. Why a different behaviour? Which is wrong ? Chrome,
        // webreflection or the spec? Maybe we can try with polymer polyfill.
        makeItDraggable(this);
    }},

    unplug: {value: function() {
        var ports = this.querySelectorAll('z-port');
        [].forEach.call(ports, function (port) {
            port.unplug();
        });
    }},

    addPort: {value: function (htmlString) {
        var fragment = utils.dom.createFragment(htmlString);
        var port = fragment.firstChild;
        port.block = this;
        if (port.classList.contains('input')) {
            var portContainer = this.querySelector('.ports-container.inputs');
            portContainer.appendChild(fragment);
        } else if (port.classList.contains('output')) {
            var portContainer = this.querySelector('.ports-container.outputs');
            portContainer.appendChild(fragment);
        }
        return port;
    }},

    keyElement: {
        get: function () {
            return this.querySelector('span.block-key');
        }
    },

    key: {
        set: function (value) {
            this.keyElement.innerHTML = value;
        }
    },

    showKey: {value: function () {
        this.keyElement.style.visibility = 'visible';
    }},

    hideKey: {value: function () {
        this.keyElement.style.visibility = 'hidden';
    }},

    ports: {
        get: function () {
            return {
                'out': this.querySelector('z-port.output'),
                'inputs': this.querySelectorAll('z-port.input'),
                'outputs': this.querySelectorAll('z-port.output')
            };
        }
    }
};

var proto = Object.create(HTMLElement.prototype, properties);
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
