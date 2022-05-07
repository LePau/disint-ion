import React from "react";
import { DisintComment } from "../models/DisintComment";

export class CommentStandard extends React.Component<{ comment: DisintComment<any> }> {
    render() {

        return <div key={this.props.comment.id} >
        <p>
          id: {this.props.comment.id}
        </p>
        <p>
          tip: {this.props.comment.tipCid.toString()}
        </p>
        <p>
          cid: {this.props.comment.cid}
        </p>
        <pre>
          content: {JSON.stringify(this.props.comment.content, null, 2)}
        </pre>
        {this.props.comment.allCommitIds.map((commitId: any, i: any) => {
          <p key={commitId.toString()}>
            commit {i}: {commitId.toString()}
          </p>
        })}
        <p>
          commit id: {this.props.comment.commitId.toString()}
        </p>
        <pre>
          meta: {JSON.stringify(this.props.comment.metadata, null, 2)}
        </pre>
        <pre>
          state: {JSON.stringify(this.props.comment.id, null, 2)}
        </pre>
      </div>
    }
} 
