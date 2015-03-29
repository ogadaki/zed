#!/bin/bash

browserify -t babelify --debug lib/app.js webcomponents/*.js -o lib/bundle.js -v
