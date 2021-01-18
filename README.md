# Gxp Nodejs (real time!)

The GPX Nodejs is a server side application that will handle the real time 
needs for the dashboard. 

## Setup environment

Requirements:
* node version 12+
* npm version 6+

Install packages
* run `npm ci`

## Run application

This package has a few commands to make your life easy:
* `npm run tsc`
    * Will compile the project to javascript. Yep, just compile, nothing more!
* `npm run dev`
    * Run development server on localhost:3000,  will connect to a locally 
    running API on localhost:8000
* `npm run prod`
    * Run production server
* `npm run test-c`
    * Run unit tests wil coverage
