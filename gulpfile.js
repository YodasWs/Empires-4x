/**
 * Sam Grundman's Super Awesome Gulp Web Development Toolset
 */
'use strict';

import fs from 'fs';
const packageJson = JSON.parse(fs.readFileSync('./package.json'));

function camelCase() {
	return (
		Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments).join('-')
	).split(/\s+|\/|-/).filter((e) => {
		return e !== '' && e !== null && e !== undefined
	}).map((n, i) => {
		if (i === 0) return n
		return n.charAt(0).toUpperCase() + n.slice(1)
	}).join('');
}

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
const argv = yargs(hideBin(process.argv))
	.usage("\n\x1b[1mUsage:\x1b[0m gulp \x1b[36m<command>\x1b[0m \x1b[34m[options]\x1b[0m")
	.command('init', 'Initialize app', {
		name: {
			describe: 'Name for your app',
			required: true,
			alias: 'n',
		},
	})
	.command('*', 'Compile files, run the server, and watch for changes to files', {
		port: {
			describe: 'The server port to listen to',
			type: 'number',
			default: 3000,
			alias: 'p',
		},
	})
	.command(['serve'], 'Run server', {
		port: {
			describe: 'The server port to listen to',
			type: 'number',
			default: 3000,
			alias: 'p',
		},
	})
	.command('compile', 'Compile all files and output to docs folder')
	.command('generate:page', 'Generate a new page', {
		name: {
			describe: 'Name for your new page',
			required: true,
			alias: 'n',
		},
		section: {
			describe: 'Section under which to add page',
			default: '',
			alias: 's',
		},
	})
	.command('generate:section', 'Generate a new section', {
		name: {
			describe: 'Name for your new section',
			required: true,
			alias: 'n',
		},
	})
	.command('lint', 'Lint all JavaScript and Sass/SCSS files')
	.command('transfer-files', 'Transfer all static assets and resources to docs folder')
	.command('watch', 'Watch files for changes to recompile')
	.help('?')
	.epilog(' ©2017–2025 Samuel B Grundman')
	.argv;

import gulp from 'gulp';
import path from 'path';
import fileExists from 'file-exists';

import * as sass from 'sass';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const plugins = require('gulp-load-plugins')({
	rename: {
		'gulp-autoprefixer': 'prefixCSS',
		'gulp-run-command': 'cli',
		'gulp-eslint-new': 'lintES',
		'gulp-sass-lint': 'lintSass',
		'gulp-htmlmin': 'compileHTML',
		'gulp-babel': 'compileJS',
		'gulp-order': 'sort',
		'gulp-file': 'newFile',
		'gulp-sass': 'compileSass',
	},
	postRequireTransforms: {
		cli(gulpRunCommand) {
			return gulpRunCommand.default;
		},
		compileSass(gulpSass) {
			return gulpSass(sass);
		},
	},
});
plugins.replaceString = require('@yodasws/gulp-pattern-replace');
plugins.webpack = require('webpack-stream');
plugins.named = require('vinyl-named');
plugins['connect.reload'] = plugins.connect.reload;

// more options at https://github.com/postcss/autoprefixer#options
const browsers = [
	// browser strings detailed at https://github.com/ai/browserslist#queries
	'defaults',
];

const options = {
	compileJS: {
		comments: false,
		minified: true,
		babelrc: false,
		compact: true,
		presets: [
			[
				'@babel/preset-env',
				{
					targets: browsers,
				},
			],
		],
	},
	compileSass: {
		style: 'compressed',
		loadPaths: [
			'node_modules',
			'src/scss',
		],
	},
	stripCssComments: {
		preserve: false,
	},
	compileHTML: {
		collapseWhitespace: true,
		decodeEntities: true,
		keepClosingSlash: false,
		removeComments: true,
		removeRedundantAttributes: true,
		removeScriptTypeAttributes: true,
		removeStyleLinkTypeAttributes: true,
		useShortDoctype: true,
	},
	lintSass: {
		files: {
			ignore: '**/*.min.css',
		},
		rules: {

'extends-before-mixins': 1,
'extends-before-declarations': 1,
'placeholder-in-extend': 1,
'mixins-before-declarations': 1,
'one-declaration-per-line': 1,
'empty-line-between-blocks': 1,
'single-line-per-selector': 1,
'no-attribute-selectors': 0,
'no-color-hex': 0,
'no-color-keywords': 0,
'no-color-literals': 1,
'no-combinators': 0,
'no-css-comments': 0,
'no-debug': 1,
'no-disallowed-properties': 1,
'no-duplicate-properties': [
	1, { exclude: [
		'display',
	]}
],
'no-empty-rulesets': 0,
'no-extends': 0,
'no-ids': 1,
'no-important': 1,
'no-invalid-hex': 1,
'no-mergeable-selectors': 1,
'no-misspelled-properties': 1,
'no-qualifying-elements': 0,
'no-trailing-whitespace': 1,
'no-trailing-zero': 1,
'no-transition-all': 0,
'no-universal-selectors': 0,
'no-url-domains': 1,
'no-url-protocols': 1,
'no-vendor-prefixes': 1,
'no-warn': 1,
'property-units': 1,
'declarations-before-nesting': 1,
'force-attribute-nesting': 0,
'force-element-nesting': 0,
'force-pseudo-nesting': 0,
'class-name-format': 1,
'function-name-format': 1,
'id-name-format': 1,
'mixin-name-format': 1,
'placeholder-name-format': 1,
'variable-name-format': 1,
'attribute-quotes': 1,
'bem-depth': 1,
'border-zero': 1,
'brace-style': 1,
'clean-import-paths': 1,
'empty-args': 1,
'hex-length': [
	2, { style: 'long' }
],
'hex-notation': [
	1, { style: 'uppercase' }
],
'indentation': [
	2, { size: 'tab' }
],
'leading-zero': [
	2, { include: true }
],
'max-line-length': 0,
'max-file-line-count': 0,
'nesting-depth': [
	1, { 'max-depth': 4 }
],
'property-sort-order': 0,
'pseudo-element': 1,
'quotes': [
	1, { style: 'double' }
],
'shorthand-values': 1,
'url-quotes': 1,
'variable-for-property': 1,
'zero-unit': 1,
'space-after-comma': 1,
'space-before-colon': 1,
'space-after-colon': 1,
'space-before-brace': 1,
'space-before-bang': 1,
'space-after-bang': 1,
'space-between-parens': 1,
'space-around-operator': 1,
'trailing-semicolon': 2,
'final-newline': 2,

		},
	},
	prefixCSS: {
		cascade: false,
		overrideBrowserslist: browsers,
	},
	dest: 'docs/',
	rmLines: {
		css: {
			filters: [
				/^\s*$/,
				/^\s*@import\b/,
			],
		},
		js: {
			filters: [
				/^[\'"]use strict[\'"];$/,
				/^\s*$/,
			],
		},
	},
	concat: {
		css: {
			path: 'min.css',
		},
		js: {
			path: 'min.js',
		},
	},

	connect: {
		root: 'docs',
		fallback: 'index.html',
		livereload: true,
		port: argv.port,
	},

	sort: {
		css: [
			'scss/**/*.{sa,sc,c}ss',
			'main.scss',
			'components/**/*.{sa,sc,c}ss',
			'**/*.{sa,sc,c}ss',
		],
		js: [
			'js/**/*.js',
			'{components,pages}/**/*.js',
			'app.js',
		],
	},
	replaceString: {
		js: {
			pattern:/\/\* app\.json \*\//,
			replacement: () => {
				// Read app.json to build site!
				const site = require('./src/app.json');
				const requiredFiles = [];
				[
					{
						prop:'pages',
						pref:'page',
					},
					{
						prop:'components',
						pref:'comp',
					},
				].forEach((p) => {
					if (!site[p.prop]) site[p.prop] = [];
					site[p.prop].forEach((c) => {
						const module = c.module || camelCase(p.pref, c.path);
						['module', 'ctrl'].forEach((k) => {
							const file = path.join(p.prop, c, `${k}.js`);
							try {
								fs.accessSync(`./src/${file}`);
								requiredFiles.push(file);
							} catch (e) {}
						});
					});
				});
				[
					'json',
					'js',
				].forEach((prop) => {
					if (site[prop]) Object.keys(site[prop]).forEach((i) => {
						try {
							fs.accessSync(`./src/${site[prop][i]}.${prop}`);
							if (Number.isNaN(Number.parseInt(i, 10))) {
								requiredFiles[i] = `${site[prop][i]}.${prop}`;
							} else {
								requiredFiles.push(`${site[prop][i]}.${prop}`);
							}
						} catch (e) {}
					});
				});
				let requires = 'window.json = {};\n';
				Object.keys(requiredFiles).forEach((i) => {
					if (Number.isNaN(Number.parseInt(i, 10))) {
						requires += `json.${i} = `;
					}
					const reqPath = String(requiredFiles[i]).replace(/\\/g, '/');
					requires += `require('../src/${reqPath}');\n`;
				});
				return requires;
			},
			options: {
				notReplaced: false,
			},
		},
	},
	webpack: {
		mode: 'production',
		output: {
			filename: '[name].js',
		},
		module: {
			rules: [
				{
					test: /\.mjs$/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: ['@babel/preset-env'],
						},
					},
				},
			],
		},
	},
	ssi: {
		root: 'src',
	},
};

function runTasks(task) {
	const fileType = task.fileType || 'static';
	let stream = gulp.src(task.src);

	// Run each task
	(task.tasks || []).forEach((subtask) => {
		let option = options[subtask] || {};
		if (option[fileType]) option = option[fileType];
		if (subtask === 'compileSass') {
			stream = stream.pipe(plugins[subtask].sync(option)).on('error', function (error) {
				if (typeof error.messageFormatted === 'string') {
					console.error('Error!', error.messageFormatted);
				} else {
					console.error('Error!');
					console.log(JSON.stringify(error, '  '));
				}
				this.emit('end');
			});
			return;
		}
		stream = stream.pipe(plugins[subtask](option)).on('error', function (error) {
			if (typeof error.messageFormatted === 'string') {
				console.error('Error!', error.messageFormatted);
			} else {
				console.error('Error!', error);
			}
			this.emit('end');
		});
		if (['lintSass', 'lintES'].includes(subtask)) {
			// Linting requires special formatting
			stream = stream.pipe(plugins[subtask].format());
		}
	});

	// Output Files
	return stream.pipe(gulp.dest(task.dest || options.dest));
}

[
	{
		name: 'compile:sass',
		src: [
			'src/main.scss',
			'src/**/*.{sa,sc,c}ss',
			'!**/*.min.css',
			'!**/min.css',
		],
		tasks: [
			'lintSass',
			'sort',
			'concat',
			'compileSass',
			'stripCssComments',
			'rmLines',
			'prefixCSS',
		],
		fileType: 'css',
	},
	{
		name: 'build:js',
		src: [
			'src/app.js',
		],
		tasks: [
			'lintES',
			'replaceString',
		],
		dest: 'build/',
		fileType: 'js',
	},
	{
		name: 'webpack:js',
		src: [
			'build/app.js',
		],
		tasks: [
			'named',
			'webpack',
		],
		dest: 'bundle/',
		fileType: 'js',
	},
	{
		name: 'minify:js',
		src: [
			'bundle/app.js',
		],
		tasks: [
			'compileJS',
			'rmLines',
		],
		fileType: 'js',
	},
	{
		name: 'compile:html',
		src: [
			'./src/**/*.html',
			'!**/includes/**/*.html',
		],
		tasks: [
			'ssi',
			'compileHTML',
		],
		fileType: 'html',
	},
	{
		name: 'transfer:assets',
		src: [
			'./src/**/*.jp{,e}g',
			// './src/**/*.json',
			'./src/**/*.gif',
			'./src/**/*.png',
			'./src/**/*.ttf',
		],
	},
].forEach((task) => {
	gulp.task(task.name, () => {
		return runTasks(task);
	});
});

export function lintSass() {
	return gulp.src([
		'src/**/*.{sa,sc,c}ss',
		'!**/*.min.css',
		'!**/min.css'
	])
		.pipe(plugins.lintSass(options.lintSass || {}))
		.pipe(plugins.lintSass.format());
};

export function lintJs() {
	return gulp.src([
		'src/**/*.js',
		'!**/*.min.js',
		'!**/min.js',
	])
		.pipe(plugins.lintES(options.lintES || {}))
		.pipe(plugins.lintES.format());
};

export const lint = gulp.parallel(lintSass, lintJs);

gulp.task('transfer:fonts', () => gulp.src([
	'./node_modules/font-awesome/fonts/fontawesome-webfont.*',
])
	.pipe(gulp.dest(path.join(options.dest, 'fonts')))
);

gulp.task('transfer:res', () => gulp.src([
	'./lib/*.js',
])
	.pipe(gulp.dest(path.join(options.dest, 'res'))),
);

gulp.task('transfer-files', gulp.parallel(
	'transfer:assets',
	'transfer:fonts',
	'transfer:res',
));

gulp.task('bundle:js', gulp.series(
	'build:js',
	'webpack:js',
));

gulp.task('compile:js', gulp.series(
	'bundle:js',
	'minify:js',
));

gulp.task('compile', gulp.parallel('compile:html', 'compile:js', 'compile:sass', 'transfer-files'));
gulp.task('reload', (done) => {
	gulp.src('docs/').pipe(plugins['connect.reload']());
	done();
});

gulp.task('watch', (done) => {
	gulp.watch('./src/**/*.{sa,sc,c}ss', {
		usePolling: true,
	}, gulp.series('compile:sass', 'reload'));
	gulp.watch('./lib/*.js', {
		usePolling: true,
	}, gulp.series('transfer:res', 'reload'));
	gulp.watch('./src/**/*.{js,json}', {
		usePolling: true,
	}, gulp.series('compile:js', 'reload'));
	gulp.watch('./src/**/*.html', {
		usePolling: true,
	}, gulp.series('compile:html', 'reload'));
	done();
});

gulp.task('serve', (done) => {
	plugins.connect.server(options.connect);
	done();
});

gulp.task('generate:page', gulp.series(
	(done) => {
		argv.sectionCC = argv.section ? camelCase(argv.section) + '/' : '';
		argv.nameCC = camelCase(argv.name);
		argv.module = camelCase('page', argv.sectionCC, argv.nameCC);
		done();
	},
	gulp.parallel(
		() => {
			const str = `[y-page='${argv.module}'] {\n\t/* SCSS Goes Here */\n}\n`;
			return plugins.newFile(`${argv.nameCC}.scss`, str, { src: true })
				.pipe(gulp.dest(`./src/pages/${argv.sectionCC}${argv.nameCC}`));
		},
		() => {
			const str = `<h2>${argv.name}</h2>\n`;
			return plugins.newFile(`${argv.nameCC}.html`, str, { src: true })
				.pipe(gulp.dest(`./src/pages/${argv.sectionCC}${argv.nameCC}`));
		},
		() => {
			const str = `yodasws.page('${argv.module}').setRoute({
	title: '${argv.name}',
	template: 'pages/${argv.sectionCC}${argv.nameCC}/${argv.nameCC}.html',
	canonicalRoute: '/${argv.sectionCC}${argv.nameCC}/',
	route: '/${argv.sectionCC}${argv.nameCC}/?',
}).on('load', () => {
});\n`
			return plugins.newFile(`ctrl.js`, str, { src: true })
				.pipe(gulp.dest(`./src/pages/${argv.sectionCC}${argv.nameCC}`));
		},
		() => {
			// Add to app.json
			const site = require('./src/app.json');
			if (!site.pages) site.pages = [];
			site.pages.push(`${argv.sectionCC}${argv.nameCC}`);
			return plugins.newFile('app.json', JSON.stringify(site, null, '\t'), { src: true })
				.pipe(gulp.dest(`./src`));
		},
	),
	plugins.cli([
		`git status`,
	]),
));

gulp.task('generate:section', gulp.series(
	(done) => {
		argv.nameCC = camelCase(argv.name);
		argv.module = camelCase('page', argv.nameCC);
		done();
	},
	gulp.parallel(
		() => {
			const str = `[y-page='${argv.module}'] {\n\t/* SCSS Goes Here */\n}\n`;
			return plugins.newFile(`${argv.nameCC}.scss`, str, { src: true })
				.pipe(gulp.dest(`./src/pages/${argv.nameCC}`));
		},
		() => {
			const str = `<h2>${argv.name}</h2>\n`;
			return plugins.newFile('index.html', str, { src: true })
				.pipe(gulp.dest(`./src/pages/${argv.nameCC}`));
		},
		() => {
			const str = `yodasws.page('${argv.module}').setRoute({
	title: '${argv.name}',
	canonicalRoute: '/${argv.nameCC}/',
	template(match, ...p) {
		const path = p.join('/').replace(/\\/+/g, '/').replace(/^\\\/|\\\/$/g, '').split('/').filter(p => p != '');
		if (path.length === 0) {
			return 'pages/${argv.nameCC}/index.html';
		}
		return {
			canonicalRoute: '/${argv.nameCC}/' + path.join('/') + '/',
			template: 'pages/${argv.nameCC}/' + path.join('.') + '.html',
		};
	},
	route: '/${argv.nameCC}(/.*)*',
}).on('load', () => {
	console.log('Page loaded!');
});\n`
			return plugins.newFile(`ctrl.js`, str, { src: true })
				.pipe(gulp.dest(`./src/pages/${argv.nameCC}`));
		},
		() => {
			// Add to app.json
			const site = require('./src/app.json');
			if (!site.pages) site.pages = [];
			site.pages.push(`${argv.nameCC}`);
			return plugins.newFile('app.json', JSON.stringify(site, null, '\t'), { src: true })
				.pipe(gulp.dest(`./src`));
		},
	),
	plugins.cli([
		`git status`,
	]),
));

gulp.task('compile:scss', gulp.series('compile:sass'));
gulp.task('compile:css', gulp.series('compile:sass'));

gulp.task('default', gulp.series(
	'compile',
	gulp.parallel(
		'serve',
		'watch',
	),
));
