import commands from 'lib/commands';
import engine from 'lib/engine';
import editor from 'lib/editor';
import http from 'lib/http';

var app = {};

app.init = function () {
    commands.init();
    engine.init();
    editor.init();
    window.http = http;
};

export default app;
