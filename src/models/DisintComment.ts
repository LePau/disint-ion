import { DisintCommentMetadata } from "./Metadata";

export class DisintComment<T> {
    id: string;
    cid: string;
    allCommitIds: string[];
    commitId: string;
    tipCid: string;
    controllers: string[];
    mimetype: string;

    metadata: DisintCommentMetadata;

    parentIds: string[] = []; // attach this comment to a parent comment, if you are a controller
    childrenIds: string[] = []; // add children to this comment, if you are a controller

    content: T;
}