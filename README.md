# Codeglue #

![npm](https://img.shields.io/npm/v/codeglue.svg)
![npm](https://img.shields.io/npm/dt/codeglue.svg)

A good enough build system.

### Usage ###

To run a build, call `codeglue`.
To run the build server, call `codeglue --mode=server`.
You can optionally add either `--stage=development` or `--stage=production`.

### Documentation ###

```
├── source
│   ├── index.html
│   ├── index.css
│   └── index.js
├── package.json
├── .gitignore
└── .eslintrc
```

#### `codeglue` ####

Will build from source. It starts with the indexes, like "./source/index.js", and compiles together any and all dependencies (and all dependencies of those dependencies). To declare a dependency in JS, use `require()`, or in CSS, use `@import`. If an error is found in any of the sources, the build is aborted, and the error is reported. When the build is done, the files are put in the "./build/web" directory.

#### `codeglue --mode=server` ####

Will build from source and host the build at [localhost:8080](http://localhost:8080). The sources are compiled as detailed above. If, after that, any of the sources are changed, the script will automatically rebuild them, and automatically refresh the build that the server is hosting.

#### `codeglue --mode=deploy` ####

Will build from source and bundle them into executables. The executables support Windows, Mac, and Linux. The executables also include an inlined webpage, or `web1`, which can be run in Chrome, Firefox, Opera, and Safari.

#### `codeglue --stage=(development|production)` ####

Will build from source for a specific stage, like `--stage=development` or `--stage=production`. If neither is specified, the stage defaults to development. A variable named `STAGE` is injected into the code, which will return either `PRODUCTION` or `DEVELOPMENT`. During a production build, the sources are minified and uglified and concatenated.

### Technologies ###

Codeglue is just a bunch of other build tools setup together:

- [Babel](https://babeljs.io)
- [Webpack](https://webpack.github.io)
- [BrowserSync](https://www.browsersync.io)
- [UglifyJS](https://github.com/mishoo/UglifyJS)
- [Electron](http://electron.atom.io)
- [ESLint](http://eslint.org)

### To Do ###

* Remove implicit dependency on `eslintrc`.
* Remove default eslint/babel configs.
* Support bundling with an Electron app.

### License ###

This project is licensed under the MIT license.
