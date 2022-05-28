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
            let w = 1;
            let n = 10;
            while (document.lineCount - 1 >= n) {
                w += 1;
                n *= 10;
            }
            for (let line = 0; line < document.lineCount; line++) {
                if (line == document.lineCount - 1 && document.lineAt(line).text === '') {
                    continue;
                }
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
            let highlights = [];
            if (start < end) {
                let state = parseInt(line.substring(start, end));
                highlights.push(new vscode.DocumentHighlight(document.lineAt(state).range));
            }
            let re = new RegExp(`\\b${position.line}\\b`, 'g');
            for (let i = 0; i < document.lineCount; i++) {
                let line = document.lineAt(i).text;
                for (let m of line.matchAll(re)) {
                    let pos = new vscode.Position(i, m.index!);
                    highlights.push(new vscode.DocumentHighlight(new vscode.Range(
                        pos, pos.translate(0, m[0].length))));
                }
            }
            return highlights;
        }
    })
    context.subscriptions.push(disp);

    disp = vscode.languages.registerCompletionItemProvider('ant', {
        provideCompletionItems(document, position, token) {
            let msg = `completion ${position.line}:${position.character}`;
            vscode.window.setStatusBarMessage(msg);
            console.log(msg);
            let result = [];
            let prefix = document.lineAt(position).text.substring(0, position.character);
            if (!prefix.includes(' ')) {
                result.push(new vscode.CompletionItem("Sense"));
                result.push(new vscode.CompletionItem("Move"));
                result.push(new vscode.CompletionItem("PickUp"));
                result.push(new vscode.CompletionItem("Flip"));
                result.push(new vscode.CompletionItem("Turn"));
                result.push(new vscode.CompletionItem("Drop"));
            }
            return result;
        }
    });
    context.subscriptions.push(disp);

    let dc = vscode.languages.createDiagnosticCollection("ant-diagnostics");
    context.subscriptions.push(dc);
    subscribeToDocumentChanges(context, dc);
}

function subscribeToDocumentChanges(context: vscode.ExtensionContext, dc: vscode.DiagnosticCollection) {
    console.log('subscribe to doc change');
    if (vscode.window.activeTextEditor) {
        refreshDiagnostics(vscode.window.activeTextEditor.document, dc);
    }
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            refreshDiagnostics(editor.document, dc);
        }
    }));
    context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, dc))
	);
	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(doc => dc.delete(doc.uri))
	);
}

function refreshDiagnostics(document: vscode.TextDocument, dc: vscode.DiagnosticCollection) {
    if (document.languageId !== 'ant') {
        return;
    }
    let diagnostics = [];
    for (let i = 0; i < document.lineCount; i++) {
        let line = document.lineAt(i).text;
        if (line === '' && i == document.lineCount - 1) {
            continue;  // empty last line is not a problem
        }
        let parts = line.split(' ');
        switch (parts[0]) {
            case "Sense": break;
            case "Move": break;
            case "PickUp": break;
            case "Flip": break;
            case "Turn": break;
            case "Drop": break;
            default: {
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(i, 0, i, parts[0].length),
                    "Unrecognized command",
                ));
                break;
            }
        }
    }
    dc.set(document.uri, diagnostics);
}

export function deactivate() {
    console.log('deactivated');
}
