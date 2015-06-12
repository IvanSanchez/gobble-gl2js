
var glslunit = require('./lib/glsl-compiler');

function minifyGlsl(code) {

	var shaderProgram = new glslunit.compiler.ShaderProgram();
	shaderProgram.vertexAst = glslunit.glsl.parser.parse(code);
	shaderProgram.fragmentAst = glslunit.glsl.parser.parse('');

	var compiler = new glslunit.compiler.Compiler(shaderProgram);
	compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
	                      new glslunit.compiler.GlslPreprocessor(
	                          [], ['GL_ES 1'], true, true));
	compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
	                      new glslunit.compiler.BraceReducer());
	compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
	                      new glslunit.compiler.ConstructorMinifier());
// 	compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
// 	                      new glslunit.compiler.DeadFunctionRemover());
	compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
	                      new glslunit.compiler.DeclarationConsolidation(true));
	compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
	                      new glslunit.compiler.VariableMinifier(false));
// 	compiler.registerStep(glslunit.compiler.Compiler.CompilerPhase.MINIFICATION,
// 	                      new glslunit.compiler.FunctionMinifier());

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
			console.log('gl2js: ', filename, '→', filename.replace(pattern, '.js'));
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

