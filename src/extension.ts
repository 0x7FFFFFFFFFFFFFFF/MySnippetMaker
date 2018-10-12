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

/** Function that count occurrences of a substring in a string;
 * @param {String} string               The string
 * @param {String} subString            The sub string to search for
 * @param {Boolean} [allowOverlapping]  Optional. (Default:false)
 *
 * @author Vitim.us https://gist.github.com/victornpb/7736865
 * @see Unit Test https://jsfiddle.net/Victornpb/5axuh96u/
 * @see http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string/7924240#7924240
 */
function occurrences(string:any, subString:any, allowOverlapping:boolean) {

    string += "";
    subString += "";
    if (subString.length <= 0) {
        return (string.length + 1);
    }

    var n = 0,
        pos = 0,
        step = allowOverlapping ? 1 : subString.length;

    while (true) {
        pos = string.indexOf(subString, pos);
        if (pos >= 0) {
            ++n;
            pos += step;
        }
        else
        {
            break;
        }
    }
    return n;
}

function settings() {
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
    return {"newline": newline, "user_directory": user_directory};
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
        let editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        let st = settings();
        let newline = st.newline;

        // Get the counter to be used in current tab stop
        let counter = context.globalState.get("counter", 10);
        counter = counter + 10;
        context.globalState.update("counter", counter);

        // Get selected text
        let selection = editor.selection;
        let text:any = editor.document.getText(selection);

        //${120|╔════════╗,║ header ║,╚════════╝,ite\,\,m 1,item\, 3|}

        if (/^\$\{\d+\|.+\|\}$/.test(text)) {
            // We are reversing a choice tabstop
            // Remove prefix and suffix
            text = text.replace(/^\$\{\d+\||\|\}$/g, "")

            const regex = /(?=.)([^,\\]*(?:\\.[^,\\]*)*)(?:,|$)/gm;
            let m, splited_text:any = [], splited_text2:any = [];

            while ((m = regex.exec(text)) !== null) {
                splited_text.push(m[1]);
            }

            for (let i = 0; i < splited_text.length; i++) {
                const e = splited_text[i];
                if (/^╔═*╗$/.test(e)) {
                    continue;
                }

                if (/^╚═*╝$/.test(e)) {
                    splited_text2.push("^^^");
                    continue;
                }

                const e2 = e.replace(/^║\s*|\s*║$/g, "");
                const e3 = e2.replace(/\\,/g, ",");
                splited_text2.push(e3);
            }

            editor.edit(builder => {
                builder.replace(selection, splited_text2.join(newline));
            });
        }
        else {
            // We are creating a choice tabstop
            // Support multi-line choices
            if(!selection.isSingleLine) {
                var i, j, len, r;

                text = (function() {
                    var j, len, ref, results;
                    ref = text.split(/\r?\n/);
                    results = [];
                    for (j = 0, len = ref.length; j < len; j++) {
                        r = ref[j];
                        results.push(r.replace(/,/g, "\\,"));
                    }
                    return results;
                })();

                for (i = j = 0, len = text.length; j < len; i = ++j) {
                    r = text[i];
                    if (/^\^{3,}$/.test(r)) {
                        text[i - 1] = "╔═" + "═".repeat(text[i - 1].length - occurrences(text[i - 1], ",", false)) + "═╗" + "," + "║ " + text[i - 1] + " ║" + "," + "╚═" + "═".repeat(text[i - 1].length - occurrences(text[i - 1], ",", false)) + "═╝";
                    }
                }

                text = text.filter(function(s:any) {
                    return !/^\^{3,}$/.test(s);
                });
                text = text.join(",");
            }

            // Replace selected text with choice tab stop syntax
            editor.edit(builder => {
                builder.replace(selection, '${' + counter + '|' + text + '|}');
            });
        }
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

        let editor = vscode.window.activeTextEditor!;

        if (!editor) {
            return;
        }

        // Get selected text
        let selection = editor.selection;
        let text = editor.document.getText(selection);
        let has_selection = true;
        let full_range: vscode.Range;
        let old_position_when_no_selection: vscode.Position;

        // If there is a selection, get the selected text
        // If there is no selection, get all document text
        if (text == null || text == "") {
            has_selection = false;
            text = editor.document.getText();
            old_position_when_no_selection = editor.selection.active;
            let invalid_range = new vscode.Range(0, 0, editor.document.lineCount /*intentionally missing the '-1' */, 0);
            full_range = editor.document.validateRange(invalid_range);
        }
        text = text.replace(/([\$\\\}])/g, "\\$1");

        // Replace selected text or full document text with tab stop syntax
        editor.edit(builder => {
            if (has_selection) {
                builder.replace(selection, text);
            } else {
                builder.replace(full_range, text);
            }
        }).then(success => {
            if (success && !has_selection) {
                // Deselect text and keep the cursor position
                vscode.window.activeTextEditor!.selection = new vscode.Selection(old_position_when_no_selection, old_position_when_no_selection);
            }
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
        let snippet_scope_line_text:any, snippet_scope:any, snippet_prefix:any = null;
        try {
            snippet_scope_line_text = ((/^Scope:\s*(.*)+$/im).exec(line))![1];
            snippet_scope = snippet_scope_line_text.split(/\s*,\s*/)[0];
        } catch {
            snippet_scope_line_text = snippet_scope = "";
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

        let st = settings();
        let newline = st.newline, user_directory = st.user_directory;

        let snippet_folder:any;
        let portable_data_path = process.env['VSCODE_PORTABLE'];
        if (portable_data_path && fs.existsSync(portable_data_path)) {
            // If in portable mode
            snippet_folder = path.join(portable_data_path, "user-data/User/snippets");
        }
        else {
            snippet_folder = path.join(user_directory, "snippets");
        }

        let snippet_object = {};
        snippet_object[snippet_name] = {};
        snippet_object[snippet_name]["scope"] = snippet_scope;
        snippet_object[snippet_name]["prefix"] = snippet_prefix;
        snippet_object[snippet_name]["body"] = [snippet_body];
        snippet_object[snippet_name]["description"] = snippet_name;

        let snippet_json_string = JSON.stringify(snippet_object, null, 4);

        text = snippet_json_string + newline + newline + "// " + text.replace(/\n/g, "\n// ");

        let snippet_file_name = "[" + snippet_prefix.join(", ") + " - " + snippet_name + "].code-snippets";
        if (snippet_scope != "") {
            snippet_file_name = snippet_scope + "." + snippet_file_name;
        }

        // Remove invalid file name characters
        snippet_file_name = snippet_file_name.replace(/[/\\?%*:|"<>]/g, "").replace(/\s{2,}/g, " ");

        var writeStream = fs.createWriteStream(path.join(snippet_folder, snippet_file_name));
        writeStream.write(text);
        writeStream.end();

        vscode.window.showInformationMessage(snippet_file_name + " created!");

    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
}
