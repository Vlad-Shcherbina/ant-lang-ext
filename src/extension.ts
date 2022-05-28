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
            return hints;
        }
    });
    context.subscriptions.push(disp);

    disp = vscode.languages.registerDocumentHighlightProvider("ant", {
        provideDocumentHighlights(document, position, token) {
            let line = document.lineAt(position).text;
            let start = position.character;
            while (start > 0) {
                let c = line.charAt(start - 1);
                if (!('0' <= c && c <= '9')) break;
                start--;
            }
            let end = position.character;
            while (end < line.length) {
                let c = line.charAt(end);
                if (!('0' <= c && c <= '9')) break;
                end++;
            }
            if (start < end) {
                let state = parseInt(line.substring(start, end));
                return [new vscode.DocumentHighlight(document.lineAt(state).range)];
            }
            return null;
        }
    })
    context.subscriptions.push(disp);
}

export function deactivate() {
    console.log('deactivated');
}
