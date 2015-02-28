import commands from 'lib/commands';
import engine from 'lib/engine';
import editor from 'lib/editor';
import http from 'lib/http';
import storage from 'lib/storage';

var app = {};

app.init = function () {
    commands.init();
    engine.init();
    editor.init();
    window.http = http;
    // Load a patch as an example.
    storage.loadPatch('http', 'patches/video.zed');
};

export default app;
