import React from "react";
import { CeramicPortal, CeramicProfile, ICeramicPortal } from "../lib/ceramic/ceramic-portal";
import config from '../config.json'
import { DisintComment } from "../models/DisintComment";
import { CommentStandard } from "./CommentStandard";
import { Link } from "react-router-dom";

class CommentNavigatorProps {
    parentStreamId: string;
    ref: any;
}

class CommentNavigatorState {
    comments: DisintComment<any>[] = [];
}

export class CommentNavigator extends React.Component<CommentNavigatorProps, CommentNavigatorState> {
    portal: ICeramicPortal;
    _parentComment: DisintComment<any>;
    _loading = false;

    public constructor(props: CommentNavigatorProps) {
        super(props);
        this.state = new CommentNavigatorState();
        this.portal = CeramicPortal.getInstance(config.ceramicEndpoints);
    }

    async componentDidMount() {
        await this.loadParentDocument();
        await this.loadComments();
    }

    async loadComments() {
        if (this._loading) return
        this._loading = true;

        const comments = await this.portal.loadChildrenComments(this._parentComment.id)

        this.setState({ comments });

        this._loading = false;
    }

    async loadParentDocument() {
        this._parentComment = await this.portal.lookupStream(this.props.parentStreamId);
    }


    render() {

        let parentComment = this._parentComment &&
            <div>
                <h2>Parent</h2>
                <CommentStandard comment={this._parentComment}></CommentStandard>

            </div>


        let comments = this.state.comments?.map((c: DisintComment<any>) => {
            return <Link to={"/comments/" + c.id}>
                <CommentStandard comment={c} key={c.id}></CommentStandard>
            </Link>
        })

        return <div>
            {parentComment}
            <h2>
                Children
            </h2>
            {comments}
        </div>

    }
}
