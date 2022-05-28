import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Hello, world!');
    let disp = vscode.languages.registerHoverProvider("ant", {
        provideHover: (document, position, _token) => {
            let msg = `hover ${position.line}:${position.character}`
            console.log(msg);
            let range = new vscode.Range(position, position.translate(0, 1));
            return new vscode.Hover(msg, range);
        }
    });
    context.subscriptions.push(disp);
}

export function deactivate() {
    console.log('deactivated');
}
