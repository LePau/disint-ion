import React from "react";
import { CeramicPortal, CeramicProfile } from "../lib/ceramic/ceramic-portal";
import config from '../config.json'
import { DisintComment } from "../models/DisintComment";
import { CommentStandard } from "./CommentStandard";

class CommentNavigatorProps {
    parentStreamId: string;
    ref: any;
}

class CommentNavigatorState {
    comments: DisintComment<any>[] = [];
}

export class CommentNavigator extends React.Component<CommentNavigatorProps, CommentNavigatorState> {
    portal: CeramicPortal;
    _parentDocument: DisintComment<any>;
    _loading = false;

    public constructor(props: CommentNavigatorProps) {
        super(props);
        this.state = new CommentNavigatorState();
        this.portal = new CeramicPortal(config.ceramicEndpoints);

        this.init();
    }

    async init() {
        this.loadParentDocument();
        this.loadComments();
    }

    async loadComments() {
        if (this._loading) return
        this._loading = true;
        const profile = (await this.portal.readProfile()) as CeramicProfile;
        const commentIds = profile?.disint?.comments || [];
        const queries = commentIds.map((id: any) => { return { streamId: id } });
        const comments = await this.portal.lookup(queries);

        this.setState({ comments });

        this._loading = false;
    }

    async loadParentDocument() {
        this._parentDocument = await this.portal.lookupStream(this.props.parentStreamId);
    }


    render() {

        return this.state.comments.map((c: DisintComment<any>) => {
            return <CommentStandard comment={c}></CommentStandard>
        })

    }
}
