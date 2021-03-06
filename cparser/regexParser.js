/*
 *  Copyright 2015 Particle ( https://particle.io )
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/*eslint quotes:0*/
/*eslint max-len:0*/
'use strict';
/**
 *
 * This library is a basic attempt at identifying wiring-compatible
 * source files, and providing the functions
 * necessary to translate them into firmware compilable C code.
 */

var utilities = require('./utilities.js');

// identify function declarations
// c language requires functions to be declared before they are used,
// but wiring language do not.

// identify functions
// once we've identified functions without declarations, we can add the
// missing sections

// identify header includes
// we must add any missing header includes, but also keep any user
// supplied headers.

var that;
module.exports = that = {
	matchAll: function matchAll(expr, str) {
		var m, matches = [];

		while ((m = expr.exec(str)) != null) {
			matches.push(m);
		}
		return matches;
	},

	functions: {
		declarations: function declarations(str) {
			// Since these don't handle comments those need to be
			// removed separately.
			var declrRegex = new RegExp("[\\w\\[\\]\\*]+\\s+[&\\[\\]\\*\\w\\s]+\\([&,\\[\\]\\*\\w\\s]*\\)(?=\\s*\\;);", 'gm');
			return that.matchAll(declrRegex, str);
		},
		definitions: function definitions(str) {
			var fnRegex = new RegExp("[\\w\\[\\]\\*]+\\s+[&\\[\\]\\*\\w\\s]+\\([&,\\[\\]\\*\\w\\s]*\\)(?=\\s*\\{)", 'gm');
			return that.matchAll(fnRegex, str);
		}
	},

	includes: {
		findAll: function findAll(str) {
			var fnRegex = new RegExp("#include ((<[^>]+>)|(\"[^\"]+\"))", 'gm');
			return that.matchAll(fnRegex, str);
		}
	},

	describe: {
		parseGitTag: function parseGitTag(tag) {
			var prefix = 'spark_';
			if (!tag || (tag.indexOf(prefix) !== 0 )) {
				//empty or doesn't start with spark_ ?  not our tag!
				return null;
			}

			try {
				//chop off the leading prefix.
				//spark_0-45-g48a6ef7
				//gives us: 0-45-g48a6ef7
				tag = tag.substring(prefix.length);
				var chunks = tag.split('-');

				// ['0', '45', 'g48a6ef7' ]
				if (chunks.length >= 2) {

					var result = [
						parseInt(chunks[0]),
						parseInt(chunks[1])
					];

					if (!isNaN(result[0]) && !isNaN(result[1])) {
						return result;
					}
				}
			} catch (ex) {
				console.error('Error parsing tag - not a number ', tag);
			}

			return null;
		}
	},

	removePreprocessorDirectives: function removePreprocessorDirectives(contents) {
		var directives = new RegExp("(#(?:\\\\\\n|.)*)", 'gi'); // Notice no 'm' here
		return contents.replace(directives, ' ');
	},

	/**
	 * Strip out anything the function definition code doesn't deal with well.
	 * Essentially anything that couldn't possibly contain a function def.
	 */
	stripText: function stripText(contents) {
		var cruft = new RegExp(
				"('.')" +
				"|(\"(?:[^\"\\\\]|\\\\.)*\")" +
				"|(//.[^\n]*)" +
				"|(/\\*[^*]*(?:\\*(?!/)[^*]*)*\\*/)" +
				"|(^\\s*#.*?$)"
			, 'mgi');

		return contents.replace(cruft, '');
	},

	removeComments: function removeComments(contents) {
		// http://stackoverflow.com/questions/462843/improving-fixing-a-regex-for-c-style-block-comments
		// var multiline = new RegExp("/\\*.*?\\*/", 'mgi');
		// var singleline = new RegExp("//.[^\n]*", 'gi');

		// This one should catch all comments not inside quotes
		// (?=(?:[^"']|["|'][^"']*")*$)(/\\*.*?\\*/)+

		// Prefer single line comments
		var multiline = new RegExp("(?=(?:[^\"']|[\"|'][^\"']*\")*$)((//.[^\n]*)|(/\\*[^*]*(?:\\*(?!/)[^*]*)*\\*/))", 'mgi');

		// Prefer multi-line comments
		//var multiline = new RegExp("(?=(?:[^\"']|[\"|'][^\"']*\")*$)((/\\*[^*]*(?:\\*(?!/)[^*]*)*\\*/)|(//.[^\n]*))", 'mgi');

		return contents.replace(multiline, ' ');
	},

	extractIncludes: function extractIncludes(contents) {
		var includesRegex = new RegExp("^(#include).+$", 'mi');

		// Look for lines that start with #include
		// #include "awesome.h"
		// #include <unstdio.h>
		// etc.

		var results = includesRegex.exec(contents);
		console.log('Found ', results.length, ' includes ');
		return results;
	},

	getMissingDeclarations: function getMissingDeclarations(contents) {
		// All the ones that don't need extra declarations
		var found = that.functions.declarations(contents);
		found = that.flattenRegexResults(found);

		// All the functions we have
		var defined = that.functions.definitions(contents);
		defined = that.flattenRegexResults(defined);
		for (var i = 0; i < defined.length; i++) {
			defined[i] = defined[i] + ';';
		}

		// All the ones we're missing
		return utilities.setComplement(defined, found);
	},

	/**
	 * just the strings please.
	 * @param results
	 */
	flattenRegexResults: function flattenRegexResults(results) {
		if (results) {
			for (var i = 0; i < results.length; i++) {
				results[i] = results[i][0];
			}
		}
		return results;
	},

	getMissingIncludes: function getMissingIncludes(contents, required) {
		// var cleanText = that.removeComments(contents);

		// TODO: be smarter about matching whitespace inside include statements, etc.

		// Prepend the '#include' part...
		for (var i = 0; i < required.length; i++) {
			var line = required[i];
			if (line.indexOf('#include') < 0) {
				required[i] = '#include ' + line;
			}
		}

		var found = that.flattenRegexResults(that.includes.findAll(contents));
		return utilities.setComplement(required, found);
	},

	/**
	 *
	 * @param contents
	 */
	getIdxAfterIncludes: function getIdxAfterIncludes(contents) {
		var allIncludes = that.includes.findAll(contents);
		if (allIncludes && (allIncludes.length > 0)) {
			var last = allIncludes[allIncludes.length - 1];
			return last.index + last[0].length;
		}

		return 0;
	},

	getIdxBeforeIncludes: function getIdxBeforeIncludes(contents) {
		var allIncludes = that.includes.findAll(contents);
		if (allIncludes && (allIncludes.length > 0)) {
			return allIncludes[0].index;
		}

		return 0;
	},

	// Return the line number of the first statement in the code
	getFirstStatement: function getFirstStatement(contents) {

		// Find the first thing that isn't these.
		var nonStatement = [
			// Whitespace
			"\\s+",

			// Comments
			"|(/\\*[^*]*(?:\\*(?!/)[^*]*)*\\*/)|(//.*?$)",

			// Pre-processor
			"|(#(?:\\\\\\n|.)*)"
		];

		var pat = new RegExp(nonStatement.join(''), 'mgi');
		var lastMatch = 0;

		var match = pat.exec(contents);
		while (match) {
			if (match.index !== lastMatch) {
				break;
			}
			lastMatch = match[0].length + match.index;
		}

		return lastMatch;
	},

	foo: null
};
