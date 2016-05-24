/*

🦃namespace gl2js

Convert GLSL files into minified Javascript strings.

When developing WebGL applications, shader code written in GLSL must end up as a javascript variable somehow. There are several ways to do this, such as including files in the browser as `<script>` and then reading their contents, or using [mapbox/glify](https://github.com/mapbox/glify) if you're using Browserify to pack the application.

Gobble-gl2js works like glify, but with [Gobble](https://github.com/gobblejs/gobble) instead of Browserify. It will go through a directory with `*.glsl` files and output Javascript files which contain the minified shader code.

Acknowledments to the [mapbox/glify](https://github.com/mapbox/glify) authors, from which I borrowed the idea of having a static version of [glsl-unit](https://code.google.com/p/glsl-unit/)

🦃example

```
module.exports = gobble( 'src/shaders' ).transform( 'gl2js', {
	format: 'raw'
});
```

By default, the `gl2js` transform will take any `*.glsl` files and output `*.js`
files. This is a file transform, so it will not modify any files other than `*.glsl`.

*/


var glslunit = require('./lib/glsl-compiler');


// Override glslunit.compiler.VariableMinifier.prototype.performStep so it reuses
//   the variable map for the top level of all of our files.
var globalNameGenerator = new glslunit.compiler.NameGenerator();

glslunit.compiler.VariableMinifier.prototype.performStep =
function(stepOutputMap, shaderProgram) {

	var vertexTransformer = new glslunit.compiler.VariableMinifier(this.minifyPublicVariables_);
	vertexTransformer.currentNameGenerator_ = globalNameGenerator;
	vertexTransformer.setShaderProgram(shaderProgram);
	shaderProgram.vertexAst = vertexTransformer.transformNode(shaderProgram.vertexAst);
	globalNameGenerator = vertexTransformer.currentNameGenerator_;

	// No need for fragmentTransformer stuff - gl2js passes everything as a
	//   vertex shader and works just as fine.

	return {
		'vertexMaxId': vertexTransformer.maxNameId_,
		'fragmentMaxId': 0
	};
};

// Override beforeTransformRoot so it keep all globals (not just varyings and uniforms)
//   in the variable map. Otherwise these non-varying, non-uniform variables would be
//   skipped from the global name generator map.
glslunit.compiler.VariableMinifier.prototype.beforeTransformRoot =
function(node) {
	this.structDeclaratorNodes_ = glslunit.compiler.Utils.getStructDeclarations(node);
	var globals = glslunit.VariableScopeVisitor.getVariablesInScope(node, node, true);
	for (var globalName in globals) {
		var declaratorNode = globals[globalName];
		if (this.shouldRenameNode_(declaratorNode)) {
			this.currentNameGenerator_.shortenSymbol(globalName);
		}
	}
	this.pushStack_(node);
};

var steps = {
	preprocessor: new glslunit.compiler.GlslPreprocessor([], ['GL_ES 1'], true, true),
	reduceBraces: new glslunit.compiler.BraceReducer(),
	minifyConstructors: new glslunit.compiler.ConstructorMinifier(),
// 	deadFunctions: new glslunit.compiler.DeadFunctionRemover(),
	consolidate: new glslunit.compiler.DeclarationConsolidation(true),
	minifyVariables: new glslunit.compiler.VariableMinifier(false),
// 	minifyFunctions: new glslunit.compiler.FunctionMinifier()
};


function minifyGlsl(code) {

	var shaderProgram = new glslunit.compiler.ShaderProgram();
	shaderProgram.vertexAst = glslunit.glsl.parser.parse(code);
	shaderProgram.fragmentAst = glslunit.glsl.parser.parse('');

	var compiler = new glslunit.compiler.Compiler(shaderProgram);

	var phase = glslunit.compiler.Compiler.CompilerPhase.MINIFICATION;
	for (var i in steps) {
		compiler.registerStep(phase, steps[i]);
	}

	shaderProgram = compiler.compileProgram();

	return glslunit.Generator.getSourceCode(shaderProgram.vertexAst);
}

var jsesc = require('jsesc');

module.exports = gl2js;

function gl2js ( code, options ) {

	var minified = minifyGlsl(code.toString());

	if (options.format !== 'raw') {
		minified = jsesc(minified, {wrap: true});
	}

	if (options.format === 'module') {
		minified = 'module.exports = ' + minified + ';\n';
	}

	return minified;
};



gl2js.defaults = {
	// 🦃option format: String = 'variable'
	// Defines the output format. Valid values are:
	// * `'module'`: exports the GLSL code as a string into `module.exports`, in CommonJS style.
	// * `'string'`: exports the GLSL code as a bare string (which is valid a JS statement).
	// * `'raw'`: writes raw GLSL into the output file (for use with `rollup-plugin-string` and the like)
	format: 'raw',

	// Standard options from file transformers
	// 🦃option accept: [String] = ['.glsl']
	// The file extensions this transformer handles; non-matching files will be silently passed to the next node.
	accept: ['.glsl'],

	// 🦃option ext: String = '.js'
	// The file extension this file transformer outputs.
	ext: '.js'
};

