import * as vscode from 'vscode';

type Place = {
    kind: "number"
} | {
    kind: "enum"
    values: string[]
}

const grammar: [string, Place[]][] = [
    ["Sense", [
        { kind: "enum", values: ["Here", "Ahead", "LeftAhead", "RightAhead"] },
        { kind: "number" },
        { kind: "number" },
        { kind: "enum", values: [
            "Friend", "Foe", "FriendWithFood", "FoeWithFood", "Food", "Rock",
            "Marker",  // it has an argument: "Marker 1", anchor: RcJtj9Cx
            "FoeMarker", "Home", "FoeHome"]},
    ]],
    ["Mark", [
        { kind: "number" },
        { kind: "number" },
    ]],
    ["Unmark", [
        { kind: "number" },
        { kind: "number" },
    ]],
    ["PickUp", [
        { kind: "number" },
        { kind: "number" },
    ]],
    ["Drop", [
        { kind: "number" },
    ]],
    ["Turn", [
        { kind: "enum", values: ["Left", "Right"] },
        { kind: "number" },
    ]],
    ["Move", [
        { kind: "number" },
        { kind: "number" },
    ]],
    ["Flip", [
        { kind: "number" },
        { kind: "number" },
        { kind: "number" },
    ]],
];

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
            let parts = prefix.split(' ');

            if (parts.length == 1) {
                for (let [cmd, args] of grammar) {
                    result.push(new vscode.CompletionItem(cmd));
                }
            } else {
                for (let [cmd, args] of grammar) {
                    if (cmd == parts[0] && parts.length - 2 < args.length) {
                        let q = args[parts.length - 2];
                        if (q.kind == "enum") {
                            for (let v of q.values) {
                                result.push(new vscode.CompletionItem(v));
                            }
                        }
                    }
                }
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
    for (let line_no = 0; line_no < document.lineCount; line_no++) {
        let line = document.lineAt(line_no).text;
        let idx = line.indexOf(';');
        if (idx !== -1) {
            line = line.substring(0, idx).trimEnd();
        }
        if (line === '' && line_no == document.lineCount - 1) {
            continue;  // empty last line is not a problem
        }
        let parts = line.split(' ');
        let found = false;
        for (let [cmd, args] of grammar) {
            if (cmd === parts[0]) {
                for (let i = 0; i < args.length && i < parts.length - 1; i++) {
                    let arg = args[i];
                    if (arg.kind === "enum") {
                        let arg_found = false;
                        for (let v of arg.values) {
                            if (v === parts[i + 1]) {
                                arg_found = true;
                                break;
                            }
                        }
                        if (!arg_found) {
                            let start = parts.slice(0, i + 1).join(' ').length + 1;
                            diagnostics.push(new vscode.Diagnostic(
                                new vscode.Range(line_no, start, line_no, start + parts[i + 1].length),
                                "Unrecognized argument",
                            ));
                        }
                    } else if (arg.kind == "number") {
                        // TODO: this doesn't catch "4.2"
                        if (isNaN(parseInt(parts[i + 1]))) {
                            let start = parts.slice(0, i + 1).join(' ').length + 1;
                            diagnostics.push(new vscode.Diagnostic(
                                new vscode.Range(line_no, start, line_no, start + parts[i + 1].length),
                                "Should be a number",
                            ));
                        }
                    } else {
                        let _: never = arg;
                    }
                }
                // Hack: skip "extra argument" diagnostics if there is a "Marker", anchor: RcJtj9Cx
                let skip_extra = parts.length >= 2 && parts[parts.length - 2] === "Marker";
                if (!skip_extra && parts.length - 1 > args.length) {
                    let start = parts.slice(0, args.length + 1).join(' ').length + 1;
                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(line_no, start, line_no, line.length),
                        "Extra argument",
                    ));
                }
                if (parts.length - 1 < args.length) {
                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(line_no, line.length, line_no, line.length),
                        "Not enough arguments",
                    ));
                }
                found = true;
                break;
            }
        }
        if (!found) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(line_no, 0, line_no, parts[0].length),
                "Unrecognized command",
            ));
        }
    }
    dc.set(document.uri, diagnostics);
}

export function deactivate() {
    console.log('deactivated');
}
