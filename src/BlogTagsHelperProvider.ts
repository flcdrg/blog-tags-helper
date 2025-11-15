import * as vscode from 'vscode';
import { knownBlogTagsKey } from './extension';

export const supportedTagsStart = ["tags:", "tags=", "tags ="];

export class BlogTagsHelperProvider implements vscode.CompletionItemProvider {
	private workspaceState: vscode.Memento;

	constructor(state: vscode.Memento) {
		this.workspaceState = state;
	}

	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
		// Only consider the top few lines
		if (position.line > 100) {
			return [];
		}

		// I can't figure out how to get vscode to tell me that we're in a tags array.
		// Surely there's a way, but I'm stuck with this manual stuff.
		let lineIdx = position.line;
		let line: vscode.TextLine | undefined = undefined;
		while(lineIdx >= 0) {
			line = document.lineAt(lineIdx);
			const trimmed = line.text.trimStart();
			const isStartOfTags = supportedTagsStart.some(x => trimmed.startsWith(x));
			const isEndOfTags = line.text.includes(']');

			// We're in it so good to go
			if (isStartOfTags) {
				break;
			}

			// We're after the tags array
			if (isEndOfTags && lineIdx < position.line) {
				return [];
			}
			
			lineIdx--;
		}

		const tags = this.workspaceState.get<string[]>(knownBlogTagsKey, []);
		const completionItems = tags.map(t => new vscode.CompletionItem(t, vscode.CompletionItemKind.Enum));
		return Promise.resolve(completionItems);
	}
}
