/*eslint quotes: [2, "single"]*/

/*global window */
/*global document */

/*global _ */

/*global commands */

(function(){
    'use strict';

    var exportPatch = function () {
        window.switchMode('edit');
        var elements = document.querySelectorAll('z-block');
        var patch = {};
        patch.blocks = [];
        patch.links = [];
        _.each(elements, function (element, index) {
            var contentContainerInnerHTML = element.querySelector('.content-container').innerHTML.trim();
            var content = element.content;
            var tagName = content.tagName.toLowerCase();
            var value = content.value || content.innerHTML || '';
            if (tagName === 'script' || tagName === 'button') {
                value = content.innerHTML;
            }
            patch.blocks.push({
                id: index,
                tagName: tagName,
                top: element.style.top,
                left: element.style.left,
                width: element.style.width,
                value: value,
                innerHTML: contentContainerInnerHTML
            });
            var phantom = content.phantomedBy;
            if (phantom !== undefined) {
                phantom.setAttribute('data-index-to-phantom', index);
            }
            var ports = element.querySelectorAll('z-port.input');
            _.each(ports, function (port, portIndex) {
                var inLinks = port.links;
                _.each(inLinks, function (link) {
                    var otherBlock = link.begin.port.block;
                    var otherBlockIndex = _.indexOf(elements, otherBlock);
                    // TODO for now we only have blocks with only one output port.
                    var otherBlockPortIndex = 1;
                    patch.links.push({
                        input: {
                            block: index,
                        port: portIndex
                        },
                        output: {
                            block: otherBlockIndex,
                        port: otherBlockPortIndex
                        }
                    });
                });
            });
        });
        patch.presentation = {};
        patch.presentation.innerHTML = document.getElementById('presentation').innerHTML;
        var phantoms = document.getElementById('presentation').querySelectorAll('.phantom');
        _.each(phantoms, function (phantom) {
            phantom.removeAttribute('data-phantomed-block-id');
        });
        return patch;
    };
    window.exportPatch = exportPatch;

    var clearAll = function () {
        var blocks = document.querySelectorAll('z-block');
        _.each(blocks, function (block) {
            block.unplug();
            block.parentNode.removeChild(block);
        });
        document.getElementById('presentation').innerHTML = '';
    };
    window.clearAll = clearAll;

    var connectBlocks = function(end, start, inputPortPosition) {
        var startPort = start.querySelector('z-port.output');
        var endPort = end.querySelector('z-port.input');
        if (startPort.connectable === undefined) {
            // TODO connectable takes some time to be defined. Wait for it.
            window.setTimeout(connectBlocks, 1, end, start, inputPortPosition);
        } else if (startPort.connectable(startPort, endPort)) {
            startPort.connect(startPort, endPort);
        }
    };

    var createPhantomLinkForBlock = function (block, phantom) {
        var content = block.content;
        if (content === undefined) {
            // FIX ME wait that content actually exists.
            window.setTimeout(createPhantomLinkForBlock, 1, block, phantom);
        } else {
            window.createPhantomLink(content, phantom);
        }
    };

    var importPatch = function (patch) {
        var elements = [];
        _.each(patch.blocks, function (block) {
            // TODO for now we only create block with exactly one input and one
            // output.
            commands.addBlock('html', block.innerHTML, '', 1, 1, block.top, block.left);
            var element = document.querySelector('z-block.current');
            elements.push(element);
        });
        _.each(patch.links, function (link) {
            var output = elements[link.output.block];
            var input = elements[link.input.block];
            connectBlocks(input, output, link.input.port);
        });
        var presentation = document.getElementById('presentation');
        presentation.innerHTML = patch.presentation.innerHTML;
        var phantoms = document.getElementById('presentation').querySelectorAll('.phantom');
        _.each(phantoms, function (phantom) {
            var index = phantom.getAttribute('data-index-to-phantom');
            var block = elements[index];
            createPhantomLinkForBlock(block, phantom);
        });
    };
    window.importPatch = importPatch;

    var save = function (name) {
        var patch = exportPatch();
        var patches = JSON.parse(window.localStorage.getItem('patches'));
        patches = patches || {};
        patches[name] = patch;
        window.localStorage.setItem('patches', JSON.stringify(patches));
    };
    window.savePatch = save;

    var load = function (name) {
        if (name === undefined) {
            name = document.querySelector('#save-name').value;
        }
        var patches = JSON.parse(window.localStorage.getItem('patches'));
        patches = patches || {};
        var patch = patches[name];
        if (patch === undefined) {
            throw 'No patch with name "' + name + '" in local storage.';
        }
        clearAll();
        importPatch(patch);
    };
    window.loadPatch = load;

    var removePatch = function (name) {
        var patches = JSON.parse(window.localStorage.getItem('patches'));
        patches = patches || {};
        var trash = JSON.parse(window.localStorage.getItem('trash'));
        trash = trash || {};
        var patch = patches[name];
        if (patch === undefined) {
            throw 'No patch with name "' + name + '" in local storage.';
        }
        trash[name] = patch;
        delete patches[name];
        window.localStorage.setItem('patches', JSON.stringify(patches));
        clearAll();
    };
    window.removePatch = removePatch;

    var getPatchNames = function () {
        var patches = JSON.parse(window.localStorage.getItem('patches'));
        return _.keys(patches);
    };
    window.getPatchNames = getPatchNames;

})();
