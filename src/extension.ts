'use strict';

import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
const os = require('os');

function my_split(text: string) {
    let rn_index = text.indexOf("\r\n");
    let n_index = text.indexOf("\n");

    let result;

    if (rn_index > -1) {
        result = { "line": text.substring(0, rn_index), "other": text.substring(rn_index + 2) };
    }
    else if (rn_index == -1 && n_index > -1) {
        result = { "line": text.substring(0, n_index), "other": text.substring(n_index + 1) };
    } else {
        result = { "line": text, "other": "" };
    }
    return result;
}

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('extension.replaceWithTabStopSyntax', () => {
        // The code you place here will be executed every time your command is executed

        let editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        // const selections: vscode.Selection[] = editor.selections;

        // editor.edit(builder => {
        //     for (const selection of selections) {
        //         builder.replace(selection, 'test');
        //     }
        // });

        // Get the counter to be used in current tab stop
        let counter = context.globalState.get("counter", 10);
        counter = counter + 10;
        context.globalState.update("counter", counter);

        // Get selected text
        let selection = editor.selection;
        let text = editor.document.getText(selection);

        // Replace selected text with tab stop syntax
        editor.edit(builder => {
            builder.replace(selection, '${' + counter + ':' + text + '}');
        });
    });

    context.subscriptions.push(disposable);


    disposable = vscode.commands.registerCommand('extension.resetTabStopCounter', () => {
        context.globalState.update("counter", 0);
        console.log("Tab stop counter reset to 10");
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('extension.escapeSpecialSnippetCharacters', () => {
        // With \ (backslash), you can escape $, } and \
        // Within choice elements, the backslash also escapes comma and pipe characters. ${1|one,two,three| }

        let editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        // Get selected text
        let selection = editor.selection;
        let text = editor.document.getText(selection);

        text = text.replace(/([\$\\\}])/g, "\\$1");

        // Replace selected text with tab stop syntax
        editor.edit(builder => {
            builder.replace(selection, text);
        });
    });

    context.subscriptions.push(disposable);


    disposable = vscode.commands.registerCommand('extension.saveAsSnippet', () => {
        let editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        let text = editor.document.getText()
        let text_bak = text;

        const text_range = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(text.length - 1));

        let o = my_split(text);
        let line = o.line;
        let other = o.other;
        let snippet_name = ((/^Name:\s*(.*)+$/im).exec(line))[1];

        o = my_split(other);
        line = o.line;
        other = o.other;
        let snippet_scope, first_scope, snippet_prefix = null;
        try {
            snippet_scope = ((/^Scope:\s*(.*)+$/im).exec(line))[1];
            first_scope = snippet_scope.split(/\s*,\s*/)[0];
        } catch {
            snippet_scope = first_scope = "";
            try {
                snippet_prefix = ((/^Prefix:\s*(.*)+$/im).exec(line))[1];
            } catch {
                snippet_prefix = null
            }
        }

        if (snippet_prefix === null) {
            o = my_split(other);
            line = o.line;
            other = o.other;
        }

        snippet_prefix = ((/^Prefix:\s*(.*)+$/im).exec(line))[1];

        o = my_split(other);
        line = o.line;
        let snippet_body = o.other;

        let snippet_file_name = "[" + snippet_name + "].code-snippets";
        if (first_scope != "") {
            snippet_file_name = first_scope + "." + snippet_file_name;
        }

        snippet_file_name = snippet_file_name.replace(/[/\\?%*:|"<>]/g, "").replace(/\s{2,}/g, " ");

        let snippet_object = {};
        snippet_object[snippet_name] = {};
        snippet_object[snippet_name]["scope"] = snippet_scope;
        snippet_object[snippet_name]["prefix"] = snippet_prefix;
        snippet_object[snippet_name]["body"] = [snippet_body];
        snippet_object[snippet_name]["description"] = snippet_name;

        let snippet_json_string = JSON.stringify(snippet_object);

        const osName = os.type();
        var newline = "\r\n";
        switch (osName) {
            case ("Darwin"): {
                newline = "\n";
                break;
            }
            case ("Linux"): {
                newline = "\n";
                break;
            }
            case ("Windows_NT"): {
                newline = "\r\n";
                break;
            }
            default: {
                newline = "\r\n";
                break;
            }
        }

        text = snippet_json_string + newline + newline + "// " + text.replace(/\n/g, "\n// ");

        let is_portable = false;
        let portable_data_path = process.env['VSCODE_PORTABLE'];
        if (portable_data_path && fs.existsSync(portable_data_path)) {
            is_portable = true;
        }

        let snippet_folder = path.join(portable_data_path, "user-data/User/snippets");

        var writeStream = fs.createWriteStream(path.join(snippet_folder, snippet_file_name));
        writeStream.write(text);
        writeStream.end();

        vscode.window.showInformationMessage(snippet_file_name + " created!");
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
}