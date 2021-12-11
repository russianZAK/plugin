// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as util from 'util';
import * as inspector from 'inspector';

const addDecorationWithText = (
	contentText: string,
	line: number,
	column: number,
	activeEditor: vscode.TextEditor
) => {
	const decorationType = vscode.window.createTextEditorDecorationType({
		after: {
			contentText,
			margin: "20px"
		}
	});

	const range = new vscode.Range(
		new vscode.Position(line, column),
		new vscode.Position(line, column)
	);

	activeEditor.setDecorations(decorationType, [{ range }]);
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	
	const session = new inspector.Session();
	session.connect();

	const post = <any>util.promisify(session.post).bind(session);
	await post("Debugger.enable");
	await post("Runtime.enable");


	let disposable = vscode.commands.registerCommand('quokka.quokka', async () => {

		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) { return; }

		const document = activeEditor.document;
		const filename = path.basename(document.uri.toString());

		const { scriptId } = await post("Runtime.compileScript", {
			expression: document.getText(),
			sourceURL: filename,
			persistScript: true
		});

		await post('Runtime.runScript', { scriptId });

		const data = await post('Runtime.globalLexicalScopeNames', { executionContextId: 1 });

		data.names.map(async (expression: string) => {
			const executionResult = await post('Runtime.evaluate', { expression, contextId: 1 });
			const { value } = executionResult.result;
			const { result } = await post('Debugger.searchInContent', {
				scriptId, query: expression
			});

			addDecorationWithText(`${value}`, result[0].lineNumber, result[0].lineContent.length, activeEditor);
		});
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Done!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
