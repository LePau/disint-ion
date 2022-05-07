import React from 'react';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx, serializerCtx, parserCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { ReactEditor, useEditor } from '@milkdown/react';
import { commonmark } from '@milkdown/preset-commonmark';
import { history } from '@milkdown/plugin-history';
import { clipboard } from '@milkdown/plugin-clipboard';
import { slash } from '@milkdown/plugin-slash';
import { menu } from '@milkdown/plugin-menu';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { Slice } from "prosemirror-model";

import './MarkdownEditor.css'

//  more at https://programming.vip/docs/milkdown-editor-integration-guide.html
// binary at /usr/local/lib/node_modules/@ceramicnetwork/cli/node_modules/go-ipfs/bin/ipfs
export const MarkdownEditor: React.FC<{ onMarkdownChange: (markdown: string) => void, markdown: string }> = (props) => {
    //let editor: Editor;
    let [editor, setEditor] = React.useState(null as unknown as Editor);
    let [changingInternally, setChangingInternally] = React.useState(false);

    React.useEffect(() => {
        if (!changingInternally) {
            setTimeout(() => setMarkdown(''), 0);
        }
    }, [props.markdown]);

    const reactEditor = useEditor((root) => {

        let editor = Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root);
                ctx.get<any>(listenerCtx).markdownUpdated((ctx: any, markdown: string, prevMarkdown: string) => {
                    setChangingInternally(previous => true);
                    props.onMarkdownChange(markdown);
                    setChangingInternally(previous => false);
                });
            })
            .use(nord)
            .use(history)
            .use(clipboard)
            .use(listener)
            .use(slash)
            //.use(menu())
            .use(commonmark);

        setEditor(editor);
        setTimeout(() => setMarkdown(props.markdown), 0);
        return editor;

    });


    let getMarkdown = (): string => {
        return editor?.action((ctx) => {
            const editorView = ctx.get(editorViewCtx);
            const serializer = ctx.get(serializerCtx);
            return serializer(editorView.state.doc);
        });
    }

    let setMarkdown = (markdown: string) => {
        editor?.action((ctx) => {

            const view = ctx.get(editorViewCtx);
            const parser = ctx.get(parserCtx);
            const doc = parser(markdown);
            if (!doc) return;
            const state = view.state;
            view.dispatch(
                state.tr.replace(
                    0,
                    state.doc.content.size,
                    new Slice(doc.content, 0, 0)
                )
            );
        });
    }

    let clear = () => {
        setMarkdown("");
    }

    return <ReactEditor editor={reactEditor} />;
};