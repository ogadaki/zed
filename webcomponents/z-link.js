// Custom element to draw a link between two ports.

// We implement this as a div with zero height which width is the length of the
// line and use transforms to set its ends to the ports positions. Reference
// origin position is relative coordinates (0,0) and other end is (width,0).
// So be sure that CSS styling is done accordingly.

/*eslint quotes: [2, "single"]*/

/*global document */
/*global HTMLElement */

/*global utils */
/*global getStyleProperty */

/*global _ */
/*global restyle */

(function(){
    'use strict';

    var tagName = 'z-link';

    var htmlTemplate = utils.stringFromCommentInFunction(function () {/*
        <div>
            <div class="selector"></div>
        </div>
    */});
    var template = utils.dom.createFragment(htmlTemplate);

    // TODO Use a custom element for line width.
    var lineWidth = 3.0;
    var radius = lineWidth / 2;
    var cssAsJson = {
        // The following will apply to the root DOM element of the custom
        // element.
        '': {
            'position': 'absolute',
            'height': 0,
            'margin-left': -radius,
            'margin-top': -radius,
            'borderWidth': radius,
            'borderRadius': radius,
            'borderStyle': 'solid',
            'borderColor': 'rgb(150, 150, 150)'
        },
        'div.selector': {
            'position': 'absolute',
            'left': '10%',
            'width': '80%',
            'top': -7,
            'height': 14,
            'zIndex': 0,
            'borderColor': '#333'
        }
    };
    // Apply the css definition and prepending the custom element tag to all
    // CSS selectors.
    var style = restyle(tagName, cssAsJson);

    var getPolarCoordinates = function(position1, position2) {
        var xDiff = position1.x - position2.x;
        var yDiff = position1.y - position2.y;

        return {
            mod: Math.sqrt(xDiff * xDiff + yDiff * yDiff),
            arg: Math.atan(yDiff / xDiff)
        };
    };

    // Set the style of a given element so that:
    // * Its origin (i.e. 0,0 relative coordinates) is placed at one position.
    // * Its width is set to the distance between the two positions.
    // * It is rotated so that its end point (x = width and y = 0) is placed at
    // the other position.
    var transformProperty = getStyleProperty('transform');
    var setElementEnds = function(element, end1, end2) {
        var origin;
        if (end1.x < end2.x) {
            origin = end1;
        } else {
            origin = end2;
        }

        var polar = getPolarCoordinates(end1, end2);
        var length = polar.mod;
        var angle = polar.arg;

        var top = origin.y + 0.5 * length * Math.sin(angle);
        var left = origin.x - 0.5 * length * (1 - Math.cos(angle));
        var parentPosition = utils.dom.getPosition(element.parentNode);
        left -= parentPosition.x;
        top -= parentPosition.y;

        element.style.width = length + 'px';
        element.style.top = top + 'px';
        element.style.left = left + 'px';
        element.style[transformProperty] = 'rotate(' + angle + 'rad)';
    };

    var redraw = function (zlink) {
        var end1 = zlink.begin.port;
        var end2 = zlink.end.port;
        if (end1 !== undefined && end2 !== undefined) {
            setElementEnds(zlink, end1.connectionPosition, end2.connectionPosition);
        }
    };

    var connect = function(zlink, plug, port) {
        if (typeof port === 'string') {
            port = document.querySelector(port);
        }
        plug.port = port;
        plug.port.links.push(zlink);
    };

    var unconnect = function (zlink) {
        zlink.begin.port.links = _.without(zlink.begin.port.links, zlink);
        zlink.end.port.links = _.without(zlink.end.port.links, zlink);
        if (zlink.parentNode !== null) {
            zlink.parentNode.removeChild(zlink);
        }
    };

    var proto = Object.create(HTMLElement.prototype);
    proto.createdCallback = function() {
        var composedDom = template.cloneNode(true);
        this.appendChild(composedDom);

        // Curried version of 'redraw' with current object instance.
        // Used for event listeners.
        this.redraw = redraw.bind(null, this);
        this.connect = connect.bind(null, this);
        this.unconnect = unconnect.bind(null, this);

        this.begin = {};
        this.end = {};
        if (this.hasAttribute('begin') && this.hasAttribute('end')) {
            // TODO do the same stuff on attributes' changes.
            connect(this, this.begin, this.getAttribute('begin'));
            connect(this, this.end, this.getAttribute('end'));

            this.redraw();
        }

        window.selector.setSelectable(this, true);
   };

    proto.css = style;
    document.registerElement(tagName, {prototype: proto});
})();
