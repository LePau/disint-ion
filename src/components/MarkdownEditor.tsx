import React from 'react';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx, serializerCtx, parserCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { ReactEditor, useEditor } from '@milkdown/react';
import { commonmark } from '@milkdown/preset-commonmark';
import { history } from '@milkdown/plugin-history';
import { clipboard } from '@milkdown/plugin-clipboard';
import { slash } from '@milkdown/plugin-slash';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { Slice } from "prosemirror-model";

import './MarkdownEditor.css'

export const MarkdownEditor: React.FC = () => {
    let editor: Editor;

    const reactEditor = useEditor((root) => {
        editor = Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root);
            })
            .use(nord)
            .use(history)
            .use(clipboard)
            .use(listener)
            .use(slash)
            .use(commonmark);

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