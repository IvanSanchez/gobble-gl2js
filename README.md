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
module.exports = gobble( 'src/shaders' ).transform( 'gl2js', {
	format: 'raw'
});
```

Gobble-gl2js will generate one javascript file per GLSL file, retaining the name. It's up to you to take those javascript files and include them somewhere else in your javascript code.

### option `format`

Three output formats are supported:

If `format` is `module`, the output files will contain a CommonJS module exporing the string:

```js
module.exports = '(GLSL shader code)';
```

If `format` is `string`, the output files will contain the bare string (which is a valid Javascript statement, so that's a valid JS file).

```js
'(GLSL shader code)'
```

If `format` is `raw`, the output files will contain bare GLSL (for use with `rollup-plugin-string` and the like):

```
(GLSL shader code)
```

### option `accept`

Standard option from Gobble file transformers, specifies which file extensions this plugin will handle. Defaults to `'.glsl'`.

### option `ext`

Standard option from Gobble file transformers, specifies which file extensions this plugin will output. Defaults to `'.js'`.

## License

```
"THE BEER-WARE LICENSE":
<ivan@sanchezortega.es> wrote this file. As long as you retain this notice you
can do whatever you want with this stuff. If we meet some day, and you think
this stuff is worth it, you can buy me a beer in return.
```
