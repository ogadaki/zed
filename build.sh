#!/bin/bash

browserify --debug lib/app.js webcomponents/*.js -o lib/bundle.js
