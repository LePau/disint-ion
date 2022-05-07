import { DisintCommentMetadata } from "./Metadata";

export class DisintComment<T> {
    id: string;
    cid: string;
    allCommitIds: string[];
    commitId: string;
    tipCid: string;
    mimetype: string;

    metadata: DisintCommentMetadata;

    content: T;
}