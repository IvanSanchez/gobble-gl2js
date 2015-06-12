
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

var sander = require( 'sander' );
var mapSeries = require( 'promise-map-series' );
var jsesc = require('jsesc');
var pattern = /\.glsl$/;


module.exports = gl2js;

function gl2js ( inputdir, outputdir, options ) {

	return sander.lsr( inputdir ).then( function ( filenames ) {

		return mapSeries( filenames, function ( filename ) {
// 			console.log('gl2js: ', filename, '→', filename.replace(pattern, '.js'));
			if (! filename.match(pattern)) return;

			return sander.readFile(inputdir, filename).then(function(code){
				var minified = jsesc(minifyGlsl(code.toString()), {wrap: true});

				if (options.format === 'module') {
					minified = 'module.exports = ' + minified + ';\n';
				} else {	// variable
					var variableName = (options.variablePrefix || '') + filename.replace(pattern, '');

					if (variableName.indexOf('.') === -1) {
						variableName = 'var ' + variableName;
					}

					minified = variableName + ' = ' + minified + ';\n';
				}

				var outFilename = (options.filePrefix || '') + filename.replace(pattern, '.js')
				return sander.writeFile( outputdir, outFilename, minified);
			});
		});
	});
};


gl2js.defaults = {
	format: 'variable',
	variablePrefix: '',
	filePrefix: ''
};

