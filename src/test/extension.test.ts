import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Configuration defaults are correct', () => {
		const config = vscode.workspace.getConfiguration('blogTagsHelper');
		const enable = config.inspect<boolean>('enable');
		const fileGlobPattern = config.inspect<string>('fileGlobPattern');
		
		// Check that defaults are what we expect
		assert.strictEqual(enable?.defaultValue, true, 'enable should default to true');
		assert.strictEqual(fileGlobPattern?.defaultValue, '**/index.md', 'fileGlobPattern should default to **/index.md');
	});
});
