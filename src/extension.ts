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

    disposable = vscode.commands.registerCommand('extension.replaceWithTabStopChoiceSyntax', () => {
        // The code you place here will be executed every time your command is executed

        let editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        // Get the counter to be used in current tab stop
        let counter = context.globalState.get("counter", 10);
        counter = counter + 10;
        context.globalState.update("counter", counter);

        // Get selected text
        let selection = editor.selection;
        let text = editor.document.getText(selection);

        // Support multi-line choices
        if(!selection.isSingleLine) {
            var r;
            text = ((function() {
                var i, len, ref, results;
                ref = text.split(/\r?\n/);
                results = [];
                for (i = 0, len = ref.length; i < len; i++) {
                r = ref[i];
                    results.push(r.replace(",", "\\,"));
                }
                return results;
            })()).join(",");
        }

        // Replace selected text with choice tab stop syntax
        editor.edit(builder => {
            builder.replace(selection, '${' + counter + '|' + text + '|}');
        });
    });

    context.subscriptions.push(disposable);


    disposable = vscode.commands.registerCommand('extension.resetTabStopCounter', () => {
        context.globalState.update("counter", 0);
        vscode.window.showInformationMessage("Tab stop counter reset to 10");
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

        let text = editor.document.getText();

        // const text_range = new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(text.length - 1));
        let snippet_name:any;

        let o = my_split(text);
        let line = o.line;
        let other = o.other;
        snippet_name = ((/^Name:\s*(.*)+$/im).exec(line))![1];

        o = my_split(other);
        line = o.line;
        other = o.other;
        let snippet_scope:any, first_scope:any, snippet_prefix:any = null;
        try {
            snippet_scope = ((/^Scope:\s*(.*)+$/im).exec(line))![1];
            first_scope = snippet_scope.split(/\s*,\s*/)[0];
        } catch {
            snippet_scope = first_scope = "";
            try {
                snippet_prefix = ((/^Prefix:\s*(.*)+$/im).exec(line))![1];
            } catch {
                snippet_prefix = null;
            }
        }

        if (snippet_prefix === null) {
            o = my_split(other);
            line = o.line;
            other = o.other;
        }

        snippet_prefix = ((/^Prefix:\s*(.*)+$/im).exec(line))![1];
        // Break it into parts
        snippet_prefix = snippet_prefix.split(/\s*,\s*/g);

        o = my_split(other);
        line = o.line;
        let snippet_body = o.other;

        const osName = os.type();
        let newline = "\r\n", user_directory;
        switch (osName) {
            case ("Darwin"): {
                newline = "\n";
                user_directory = process.env.HOME + "/Library/Application Support/Code/User/";
                break;
            }
            case ("Linux"): {
                newline = "\n";
                user_directory = process.env.HOME + "/.config/Code/User/";
                break;
            }
            case ("Windows_NT"): {
                newline = "\r\n";
                user_directory = process.env.APPDATA + "\\Code\\User\\";
                break;
            }
            default: {
                newline = "\n";
                user_directory = process.env.HOME + "/.config/Code/User/";
                break;
            }
        }

        let snippet_folder:any;
        let portable_data_path = process.env['VSCODE_PORTABLE'];
        if (portable_data_path && fs.existsSync(portable_data_path)) {
            // If in portable mode
            snippet_folder = path.join(portable_data_path, "user-data/User/snippets");
        }
        else {
            snippet_folder = path.join(user_directory, "snippets");
        }


        snippet_prefix.forEach((e: string) => {
            let snippet_object = {};
            snippet_object[snippet_name] = {};
            snippet_object[snippet_name]["scope"] = snippet_scope;
            snippet_object[snippet_name]["prefix"] = e;
            snippet_object[snippet_name]["body"] = [snippet_body];
            snippet_object[snippet_name]["description"] = snippet_name;

            let snippet_json_string = JSON.stringify(snippet_object, null, 4);

            text = snippet_json_string + newline + newline + "// " + text.replace(/\n/g, "\n// ");

            let snippet_file_name = "[" + e + " - " + snippet_name + "].code-snippets";
            if (first_scope != "") {
                snippet_file_name = first_scope + "." + snippet_file_name;
            }

            snippet_file_name = snippet_file_name.replace(/[/\\?%*:|"<>]/g, "").replace(/\s{2,}/g, " ");

            var writeStream = fs.createWriteStream(path.join(snippet_folder, snippet_file_name));
            writeStream.write(text);
            writeStream.end();

            vscode.window.showInformationMessage(snippet_file_name + " created!");

        });


    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
}
