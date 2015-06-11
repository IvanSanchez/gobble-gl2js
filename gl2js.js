

var glslunit = require('./lib/glsl-compiler');


var hcl2rgb = "                                                         \n\
// This file defines a hcl2rgb transformation,                          \n\
// which is used by specific colour ramps.                              \n\
                                                                        \n\
#define M_PI 3.1415926535897932384626433832795                          \n\
#define M_TAU 2.0 * M_PI                                                \n\
                                                                        \n\
                                                                        \n\
// D65 standard referent                                                \n\
#define lab_X 0.950470                                                  \n\
#define lab_Y 1.0                                                       \n\
#define lab_Z 1.088830                                                  \n\
                                                                        \n\
mat4 xyz2rgb = mat4( 3.2404542, -1.5371385, -0.4985314, 0.0,            \n\
					 -0.9692660,  1.8760108,  0.0415560, 0.0,           \n\
					 0.0556434, -0.2040259,  1.0572252, 0.0,            \n\
					 0.0,        0.0,        0.0,       1.0);           \n\
                                                                        \n\
float lab2xyz(float n) {                                                \n\
	if (n > 0.00080817591) {// 0.206893034 / 256                        \n\
		return pow(n, 3.0);                                             \n\
	} else {                                                            \n\
		return (n - 0.0005387931) / 0.030418113;	                    \n\
		// (x - 4/29) / 7.787037 but in [0..1] instead of [0..256]      \n\
	}                                                                   \n\
}                                                                       \n\
                                                                        \n\
vec4 hcl2rgb(vec4 hclg) {                                               \n\
	float h = hclg[0];	// Hue                                          \n\
	float c = hclg[1];	// Chrominance                                  \n\
	float l = hclg[2];	// Lightness                                    \n\
	float alpha = hclg[3];	// Alpha                                    \n\
	                                                                    \n\
	// First, convert HCL to L*a*b colour space                         \n\
	h *= M_TAU; // from 0..1 to 1..2*pi                                 \n\
	float a = cos(h) * c;                                               \n\
	float b = sin(h) * c;                                               \n\
	                                                                    \n\
	// L*a*b to XYZ                                                     \n\
	float y = (l + 0.0625) / 0.453126;	                                \n\
	// y = (l+16) / 116 but in [0..1] instead of [0..255]               \n\
	float x = y + (a / 1.953125);     	                                \n\
	// x = y + (a/500) but in [0..1] instead of [0..255]                \n\
	float z = y - (b / 0.78125);      	                                \n\
	// z = y - (b/200) but in [0..1] instead of [0..255]                \n\
	                                                                    \n\
	x = lab2xyz(x) * lab_X;                                             \n\
	y = lab2xyz(y) * lab_Y;                                             \n\
	z = lab2xyz(z) * lab_Z;                                             \n\
	                                                                    \n\
	// XYZ to RGB is a simple matrix operation.                         \n\
	return vec4(x, y, z, alpha) * xyz2rgb;                              \n\
}    ";


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



// console.log(minifyGlsl(hcl2rgb));


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
					minified = 'var ' + filename.replace(pattern, '') + ' = ' + minified + ';\n';
				}
console.log(minified);
				return sander.writeFile( outputdir, filename.replace(pattern, '.js'), minified);
			});
		});
	});
};


gl2js.defaults = {
	format: 'variable'
};

