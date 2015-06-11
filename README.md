# gobble-gl2js

Convert GLSL files into minified Javascript strings.

When developing WebGL applications, shader code written in GLSL must end up as a javascript variable somehow. There are several ways to do this, such as including files in the browser as `<script>` and then reading their contents, or using [mapbox/glify](https://github.com/mapbox/glify) if you're using Browserify to pack the application.

Gobble-gl2js works like glify, but with [Gobble](https://github.com/gobblejs/gobble) instead of Browserify. It will go through a directory with `*.glsl` files and output Javascript files which contain the minified shader code.

Acknowledments to the [mapbox/glify](https://github.com/mapbox/glify) authors, from which I borrowed the idea of having a static version of [glsl-unit](https://code.google.com/p/glsl-unit/)

## Installation

I assume you already know the basics of [Gobble](https://github.com/gobblejs/gobble).

```bash
npm i -D gobble-gl2js
```

## Usage

**gobblefile.js**

```js
var gobble = require( 'gobble' );
module.exports = gobble( 'src/shaders' ).transform( 'gl2js', { format: 'variable' });
```

Gobble-gl2js will generate one javascript file per GLSL file, retaining the name. It's up to you to take those javascript files and include them somewhere else in your javascript code.

### option `format`

Two formats are supported: shader strings as variables or shader strings as modules.

If `format` is `variable`, the output files will contain:

```js
var origin_filename = '(GLSL shader code)';
```

If `format` is `module`, the output files will contain:

```js
module.exports = '(GLSL shader code)';
```

## License

```
"THE BEER-WARE LICENSE":
<ivan@sanchezortega.es> wrote this file. As long as you retain this notice you
can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return.
```
