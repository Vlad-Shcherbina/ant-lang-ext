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

    disp = vscode.languages.registerInlayHintsProvider("ant", {
        provideInlayHints(document, range, token) {
            console.log(`inlay hints ${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`);
            let hints: vscode.InlayHint[] = [];
            // TODO: add hint on the last line, but only when it's not empty
            let w = 1;
            let n = 10;
            while (range.end.line - 1 >= n) {
                w += 1;
                n *= 10;
            }
            for (let line = range.start.line; line < range.end.line; line++) {
                let hint = new vscode.InlayHint(
                    new vscode.Position(line, 0), line.toString().padStart(w, ' ') + ':');
                hint.paddingRight = true;
                hints.push(hint);
            }
            console.log(hints);
            return hints;
        }
    });
    context.subscriptions.push(disp);
}

export function deactivate() {
    console.log('deactivated');
}
