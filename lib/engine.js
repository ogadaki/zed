/*eslint quotes: [2, "single"]*/

/*global window */

/*global _ */

/*global getElementBlock */

(function(){
    'use strict';
    var compileScript = function (element) {
        var script = element.text;
        try {
            var theScript = new Function('in1', 'sendToOutput', 'dest1', script);
            element.compiledScript = theScript;
        } catch (e) {
            element.compiledScript = null;
        }
    };
    window.compileScript = compileScript;

    var sendEventToOutputPort = function (element, value) {
        var block = getElementBlock(element);
        var port = block.ports().out;
        if (port) {
            port.links.forEach(function(link) {
                fireEvent(link, value);
            });
        }
    };
    window.sendEventToOutputPort = sendEventToOutputPort;

    var getOutputLinksFirstDestinationContent = function (element) {
        var block = getElementBlock(element);
        var port = block.ports().out;
        var content;
        if (port !== null) {
            var links = port.links;
            var link = links[0];
            if (link !== undefined) {
                var target = link.end.port.block;
                content = target.content;
            }
        }
        return content;
    };

    // TODO change name.
    var fireEvent2 = function (target, value) {
        var content = target.content;
        var tagName = content.tagName;

        if (tagName === 'SCRIPT') {
            var dataPorts = target.querySelector('z-port.input');
            var dataLinks = dataPorts === null ? [] : dataPorts.links;
            var in1;

            if (dataLinks.length !== 0) {
                if (value === undefined) {
                    var dataLink = _.find(dataLinks, function (link) {
                        var tag = link.begin.port.block.content.tagName;
                        return tag !== 'BUTTON';
                    });

                    if (dataLink !== undefined) {
                        var obj = dataLink.begin.port.block.content;
                        value = obj.value;

                        if (obj.tagName === 'SPAN') {
                            value = obj.innerHTML;
                            if (obj.classList.contains('zed-number')) {
                                value = Number(value);
                            }
                        }

                        if (value === undefined) {
                            value = obj;
                        }
                    }
                }
                in1 = value;
            }

            var nextAction = function () {
                sendEventToOutputPort(content, arguments[0]);
            };
            var firstDestinationContent = getOutputLinksFirstDestinationContent(content);

            var theScript = content.compiledScript;
            if (theScript === undefined) {
                compileScript(content);
                theScript = content.compiledScript;
            }
            if (theScript === null) {
                //console.log('Error in script. Aborting.');
                return;
            }

            var result = theScript(in1, nextAction, firstDestinationContent);

            if (result !== undefined) {
                sendEventToOutputPort(content, result);
            }
        }

        if (tagName === 'NUMBER') {
            if (value !== undefined) {
                content.innerHTML = value;
            }
        }

        if (tagName === 'DIV' || tagName === 'SPAN') {
            if (value !== undefined) {
                content.innerHTML = value;
            } else {
                value = content.innerHTML;
            }
            sendEventToOutputPort(content, value);
        }

        if (tagName === 'INPUT') {
            if (value !== undefined) {
                content.value = value;
            }
        }
    };
    window.fireEvent2 = fireEvent2;

    var fireEvent = function(link, value) {
        var target = link.end.port.block;
        fireEvent2(target, value);
    };
    window.fireEvent = fireEvent;

})();
