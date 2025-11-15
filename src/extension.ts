import * as vscode from 'vscode';
import * as fs from 'fs';
import * as readline from 'readline';
import { BlogTagsHelperProvider, supportedTagsStart } from './BlogTagsHelperProvider';

export const knownBlogTagsKey = "knownBlogTags";
const blogTagsLastUpdatedKey = 'blogTagsLastUpdated';

export async function activate(context: vscode.ExtensionContext) {
	// Check if the extension is enabled
	const config = vscode.workspace.getConfiguration('blogTagsHelper');
	const isEnabled = config.get<boolean>('enable', true);
	
	if (!isEnabled) {
		console.log('Blog Tags Helper is disabled');
		return;
	}

	const lastGenerated = context.workspaceState.get<Date>(blogTagsLastUpdatedKey, new Date(0));
	const currentDate = new Date();
	const lastWeek = new Date(currentDate.setDate(currentDate.getDate() - 7));
	if (lastGenerated < lastWeek) {
		await generateTagList(context);
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("blog-tags-helper.regenerateTags", async () => await generateTagList(context))
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("blog-tags-helper.test", async () => {
			const tagLines = await getTagsFromFile(vscode.window.activeTextEditor?.document.uri.fsPath ?? '');
			const tags = parseTags(tagLines);
			console.log('RESULT', tagLines, tags);
		})
	);

	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider('markdown', new BlogTagsHelperProvider(context.workspaceState), '"', "'")
	);
}

async function generateTagList(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('blogTagsHelper');
	const fileGlobPattern = config.get<string>('fileGlobPattern', '**/index.md');

	await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Finding blog tags...",
		cancellable: true,
	}, async (progress, token) => {
		token.onCancellationRequested(() => {
			console.log("User canceled the long running operation");
		});

		const files = await vscode.workspace.findFiles(fileGlobPattern);
		const allTags = new Set<string>();
		for (let f of files) {
			if (token.isCancellationRequested) {
				break;
			}
			const tagLines = await getTagsFromFile(f.fsPath);
			const tags = parseTags(tagLines);
			tags.forEach(t => allTags.add(t));
		}

		const strings = Array.from(allTags);
		await context.workspaceState.update(knownBlogTagsKey, strings);
		await context.workspaceState.update(blogTagsLastUpdatedKey, new Date());

		progress.report({message: 'Finished!'});
	});
}

async function getTagsFromFile(filePath: string): Promise<string[]> {
	const stream = fs.createReadStream(filePath);
	const readInterface = readline.createInterface(stream);
	let tagLines = [];
	let foundStart = false;
	try {
		let index = 0;
		for await (const line of readInterface) {
			if (index === 0 && !isAFrontmatterLine(line)) {
				// No frontmatter
				return [];
			} else if (index !== 0 && isAFrontmatterLine(line)) {
				// End of frontmatter, didn't find tags
				return [];
			}

			const trimmed = line.trim();

			const isEnd = trimmed.includes(']');
			
			if (!foundStart && supportedTagsStart.some(x => trimmed.startsWith(x))) {
				foundStart = true;
				tagLines.push(trimmed);

				// If it's all one line, just return now
				if (isEnd) {
					return tagLines;
				}
				continue;
			}

			// End of the tags array
			if (isEnd) {
				tagLines.push(trimmed);
				return tagLines;
			}

			if (foundStart) {
				tagLines.push(trimmed);
			}

			index++;
		}
	}
	finally {
		stream.destroy(); // Destroy file stream.
	}

	return [];
}

function parseTags(lines: string[]): string[] {
	const tags = lines.flatMap(line => {
		const matches = line.matchAll(/[\"\']([^\"\']*)[\"\']/g);
		return [...matches]
			.map(x => x[1])
			.filter(x => !!x)
			.map(x => x as string);
	});

	let distinctTags = new Set<string>(tags);
	return [...distinctTags];
}

// Only yaml or toml
function isAFrontmatterLine(line: string) {
	return line.includes('---') || line.includes('+++');
}