/*
 * (c) Copyright Ascensio System SIA 2010-2019
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

module.exports = function(grunt) {
	function loadConfig(name) {
		var config = require(pathConfigs +'/' + name + '.json');
		if (config) {
			grunt.log.ok((name + ' config loaded successfully').green);
			return config;
		}
		grunt.log.error().writeln(('could not load' + name + 'config file').red);
		return null;
	}
	function getExterns(config) {
		var externs = config['externs'];
		var result = [];
		for (var i = 0; i < externs.length; ++i) {
			result.push('--externs=' + externs[i]);
		}
		return result;
	}
	function getFilesMin(config) {
		var result = config['min'];
		if (grunt.option('mobile')) {
			result = config['mobile_banners']['min'].concat(result);
		}
		if (grunt.option('desktop')) {
			result = result.concat(config['desktop']['min']);
		}
		return result;
	}
	function getFilesAll(config) {
		var result = config['common'];
		if (grunt.option('mobile')) {
			result = config['mobile_banners']['common'].concat(result);

			var excludeFiles = config['exclude_mobile'];
			result = result.filter(function(item) {
				return -1 === excludeFiles.indexOf(item);
			});
			result = result.concat(config['mobile']);
		}
		if (!grunt.option('noprivate')) {
			result = result.concat(config['private']);
		}
		if (grunt.option('desktop')) {
			result = result.concat(config['desktop']['common']);
		}
		return result;
	}

	var path = require('path');
	var pathConfigs = grunt.option('src') || './configs';
	var level = grunt.option('level') || 'ADVANCED';
	var formatting = grunt.option('formatting') || '';

	require('google-closure-compiler').grunt(grunt, {
		platform: 'java',
		extraArguments: ['ADVANCED' === level ? '-Xms2048m' : '-Xms1024m']
	});

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-replace');
	grunt.loadNpmTasks('grunt-split-file');

	grunt.registerTask('build-sdk', 'Build SDK', function () {
		var configFonts = loadConfig('fonts');
		var configExterns = loadConfig('externs');
		var configWord = loadConfig('webword');
		var configCell = loadConfig('webexcel');
		var configSlide = loadConfig('webpowerpoint');
		if (!configFonts || !configExterns || !configWord || !configCell || !configSlide) {
			return;
		}
		configWord = configWord['sdk'];
		configCell = configCell['sdk'];
		configSlide = configSlide['sdk'];

		var optionsSdkMin ={
			banner: '',
			footer: 'window["split"]="split";'
		};
		var optionsSdkAll = {};
		if (!grunt.option('noclosure')) {
			optionsSdkAll = {
				banner: '(function(window, undefined) {',
				footer: '})(window);'
			};
		}
		var fontsWasmTmp = 'fonts-wasm-tmp.js';
		var fontsJsTmp = 'fonts-js-tmp.js';
		var sdkMinTmp = 'sdk-min-tmp.js';
		var sdkAllTmp = 'sdk-all-tmp.js';
		var sdkWordTmp = 'sdk-word-tmp.js';
		var sdkCellTmp = 'sdk-cell-tmp.js';
		var sdkSlideTmp = 'sdk-slide-tmp.js';

		grunt.initConfig({
			concat: {
				wasm: {
					src: configFonts['wasm'],
					dest: fontsWasmTmp
				},
				js: {
					src: configFonts['js'],
					dest: fontsJsTmp
				},
				wordsdkmin: {
					options: optionsSdkMin,
					src: getFilesMin(configWord),
					dest: sdkMinTmp
				},
				wordsdkall: {
					options: optionsSdkAll,
					src: getFilesAll(configWord),
					dest: sdkAllTmp
				},
				wordall: {
					src: [sdkMinTmp, sdkAllTmp],
					dest: sdkWordTmp
				},
				cellsdkmin: {
					options: optionsSdkMin,
					src: getFilesMin(configCell),
					dest: sdkMinTmp
				},
				cellsdkall: {
					options: optionsSdkAll,
					src: getFilesAll(configCell),
					dest: sdkAllTmp
				},
				cellall: {
					src: [sdkMinTmp, sdkAllTmp],
					dest: sdkCellTmp
				},
				slidesdkmin: {
					options: optionsSdkMin,
					src: getFilesMin(configSlide),
					dest: sdkMinTmp
				},
				slidesdkall: {
					options: optionsSdkAll,
					src: getFilesAll(configSlide),
					dest: sdkAllTmp
				},
				slideall: {
					src: [sdkMinTmp, sdkAllTmp],
					dest: sdkSlideTmp
				}
			},
			'closure-compiler': {
				js: {
					options: {
						args: getExterns(configExterns).concat('--jscomp_off=checkVars', '--warning_level=QUIET', '--compilation_level=' + level,
							'--module=fontswasm:1:', '--js=' + fontsWasmTmp,
							'--module=fontsjs:1:fontswasm', '--js=' + fontsJsTmp,
							'--module=word:1:fontswasm', '--js=' + sdkWordTmp,
							'--module=cell:1:fontswasm', '--js=' + sdkCellTmp,
							'--module=slide:1:fontswasm', '--js=' + sdkSlideTmp)
					}
				}
			},
			clean: {
				tmp: {
					options: {
						force: true
					},
					src: [
						fontsWasmTmp,
						fontsJsTmp,
						sdkMinTmp,
						sdkAllTmp,
						sdkWordTmp,
						sdkCellTmp,
						sdkSlideTmp
					]
				}
			}
		});
	});
	grunt.registerTask('license', 'Add license', function () {
		const appCopyright = "Copyright (C) Ascensio System SIA 2012-" + grunt.template.today('yyyy') +". All rights reserved";
		const publisherUrl = "https://www.onlyoffice.com/";
		var cache = '*.cache';
		var fonts = '../common/libfont/';
		var word = '../word/';
		var cell = '../cell/';
		var slide = '../slide/';
		var fontsWasm = 'fontswasm.js';
		var fontsJs = 'fontsjs.js';
		var fontFile = 'fonts.js';
		var wordJs = 'word.js';
		var cellJs = 'cell.js';
		var slideJs = 'slide.js';
		var sdkAllMin = 'sdk-all-min.js';
		var sdkAll = 'sdk-all.js';
		var license = 'license.js';
		var splitLine;
		if ('ADVANCED' === level) {
			splitLine = ('PRETTY_PRINT' === formatting) ? 'window.split = "split";' : 'window.split="split";';
		} else {
			splitLine = ('PRETTY_PRINT' === formatting) ? 'window["split"] = "split";' : 'window["split"]="split";';
		}
		var splitOptions = {
			separator: splitLine,
			prefix: ["sdk-all-min", "sdk-all"]
		};

		var concatSdk = {files:{}};
		var concatSdkFiles = concatSdk['files'];
		concatSdkFiles[fontsWasm] = [license, fontsWasm];
		concatSdkFiles[fontsJs] = [license, fontsJs];
		concatSdkFiles[path.join(word + sdkAllMin)] = [license, path.join(word + sdkAllMin)];
		concatSdkFiles[path.join(word + sdkAll)] = [license, path.join(word + sdkAll)];
		concatSdkFiles[path.join(cell + sdkAllMin)] = [license, path.join(cell + sdkAllMin)];
		concatSdkFiles[path.join(cell + sdkAll)] = [license, path.join(cell + sdkAll)];
		concatSdkFiles[path.join(slide + sdkAllMin)] = [license, path.join(slide + sdkAllMin)];
		concatSdkFiles[path.join(slide + sdkAll)] = [license, path.join(slide + sdkAll)];

		grunt.initConfig({
			splitfile: {
				word: {
					options: splitOptions,
					dest: word,
					src: wordJs
				},
				cell: {
					options: splitOptions,
					dest: cell,
					src: cellJs
				},
				slide: {
					options: splitOptions,
					dest: slide,
					src: slideJs
				}
			},
			concat: {
				sdk: concatSdk
			},
			replace: {
				version: {
					options: {
						patterns: [
							{
								json: {
									AppCopyright: process.env['APP_COPYRIGHT'] || appCopyright,
									PublisherUrl: process.env['PUBLISHER_URL'] || publisherUrl,
									Version: process.env['PRODUCT_VERSION'] || '0.0.0',
									Build: process.env['BUILD_NUMBER'] || '0'
								}
							}
						]
					},
					files: [
						{src: [fontsWasm], dest: path.join(fonts, 'wasm', fontFile)},
						{src: [fontsJs], dest: path.join(fonts, 'js', fontFile)},
						{src: [path.join(word + sdkAllMin), path.join(word + sdkAll)], dest: word},
						{src: [path.join(cell + sdkAllMin), path.join(cell + sdkAll)], dest: cell},
						{src: [path.join(slide + sdkAllMin), path.join(slide + sdkAll)], dest: slide}
					]
				}
			},
			clean: {
				tmp: {
					options: {
						force: true
					},
					src: [
						fontsWasm,
						fontsJs,
						wordJs,
						cellJs,
						slideJs,
						word + cache,
						cell + cache,
						slide + cache
					]
				}
			}
		})
	});
	grunt.registerTask('default', ['build-sdk', 'concat', 'closure-compiler', 'clean', 'license', 'splitfile', 'concat', 'replace', 'clean']);
};
