import type { CeramicApi, Stream } from '@ceramicnetwork/common';
//import { Ceramic, CeramicConfig } from '@ceramicnetwork/core'
import { CeramicClient } from '@ceramicnetwork/http-client'
import * as ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import { TileDocument, TileMetadataArgs } from '@ceramicnetwork/stream-tile'

import { create as createIPFS, IPFS } from 'ipfs-core'
import * as dagJose from 'dag-jose'
import { EthereumAuthProvider, SelfID, WebClient } from '@self.id/web'
import { Core } from '@self.id/core'

import KeyDidResolver from 'key-did-resolver';
import { Resolver } from 'did-resolver';
import { DID } from 'dids';
import { CommitID, StreamID } from '@ceramicnetwork/streamid';
import { DisintComment } from '../../models/DisintComment';
import { DisintCommentMetadata } from '../../models/Metadata';

export interface DisintProfile {
    comments: { [key: string]: string[] };
}

export interface CeramicProfile {
    name: string;
    avatarUrl: string;
    disint: DisintProfile;
}



export interface ICeramicPortal {
    connectToCeramicNetwork(): void;
    authenticate(): void;
    isAuthenticated(): void;
    firstLoginAddress(): string;
    connectWallet(): void;
    readProfile(): Promise<CeramicProfile>;
    updateProfile(name: string, avatarUrl: string): void;
    create(data: any, mimetype: string, parentId: string, tags?: string[]): Promise<string>;
    addCommentToUserProfile(streamId: string, parentId: string): void;
    getUserComments(): Promise<any[]>;
    togglePinComment(streamId: StreamID): void;
    getCommit(commitId: CommitID, streamId: string): void;
    pinComment(streamId: StreamID): void;
    unpinComment(streamId: StreamID): void;
    loadChildrenComments<T>(parentStreamId: string): Promise<DisintComment<T>[]>;
    lookup<T>(queries: any[]): Promise<DisintComment<T>[]>;
    lookupStream<T>(streamId: string): Promise<DisintComment<T>>;
    tileDocumentToDisintComment<T>(document: TileDocument): DisintComment<T>;
}

export class CeramicPortal implements ICeramicPortal, ICeramicPortal {

    private _ceramic: CeramicApi;
    private _selfId: SelfID;
    private _ipfs: IPFS;
    private _authenticated: boolean;
    private _profile: any;
    private _addresses: string[];
    private static _instances = new Map<string, ICeramicPortal>();

    constructor(private _endpoints: string[] = []) {

    }

    // overwrite for testing
    //CeramicPortal.getInstance = () => {throw new Error('oops')}
    public static getInstance = (_endpoints: string[] = []): ICeramicPortal => {
        let endpointsCopy = _endpoints.slice();
        endpointsCopy.sort();
        const key = endpointsCopy.reduce((i, key) => key + i, '');
        const instance = this._instances.get(key);
        if (instance) {
            return instance;
        }
        else {
            this._instances.set(key, new CeramicPortal(_endpoints));
            return this._instances.get(key) as ICeramicPortal;
        }
    }

    async connectToCeramicNetwork() {
        if (this._ceramic) return;

        const core = new Core({ ceramic: this._endpoints[0] });
        this._ceramic = core.ceramic;
    }

    async authenticate() {
        if (this._authenticated) return;

        let windowAny = window as any;
        const [address] = await this.connectWallet()
        const authProvider = new EthereumAuthProvider(windowAny.ethereum, address)

        // The following configuration assumes your local node is connected to the Clay testnet
        const client = new WebClient({
            ceramic: this._endpoints[0],
            connectNetwork: 'testnet-clay',
        })


        // If authentication is successful, a DID instance is attached to the Ceramic instance
        await client.authenticate(authProvider)

        // A SelfID instance can only be created with an authenticated Ceramic instance
        this._selfId = new SelfID({ client })

        this._ceramic = this._selfId.client.ceramic;

        this._authenticated = true
    }

    isAuthenticated() {
        return this._authenticated;
    }

    firstLoginAddress(): string {
        return this._addresses[0];
    }

    async connectWallet() {
        // assumes ethereum is injected by metamask.  consider replacing with https://portal.thirdweb.com/guides/add-connectwallet-to-your-website
        let windowAny = window as any;
        const addresses = await windowAny.ethereum.request({
            method: 'eth_requestAccounts'
        })
        this._addresses = addresses;
        return addresses
    }

    async readProfile(): Promise<CeramicProfile> {
        await this.authenticate();

        const data = await this._selfId.get(
            'basicProfile'
        )

        this._profile = data;
        return data as CeramicProfile
    }

    async updateProfile(name: string, avatarUrl: string) {
        await this.authenticate();

        await this._selfId.set('basicProfile', {
            name,
            avatar: avatarUrl
        })

    }

    async create(data: any, mimetype: string, parentId: string, tags: string[] = []): Promise<string> {
        await this.authenticate();
        const metadata = {} as TileMetadataArgs;
        let controllerId = this._ceramic?.did?.id;
        if (controllerId) {
            metadata.controllers = [controllerId];
        }

        metadata.tags = metadata.tags || [];

        if (tags?.length) {
            metadata.tags = metadata.tags.concat(tags);
        }

        const doc = await TileDocument.create(this._ceramic, { content: data, mimetype, parentIds: [parentId], childrenIds: [] }, metadata);

        //console.log(doc.content)

        const streamId = doc.id.toString()

        //console.log(streamId);

        await this.addCommentToUserProfile(streamId, parentId);

        return streamId;

    }

    async addCommentToUserProfile(streamId: string, parentId: string) {
        await this.authenticate();
        let profile = this._profile || await this.readProfile();

        let disint = profile?.disint || {};
        disint.comments = disint.comments || {};
        if (Array.isArray(disint.comments)) {
            disint.comments = {}
        }
        disint.comments[parentId] = disint.comments[parentId] || [];
        if (!disint.comments[parentId].includes(streamId)) {
            disint.comments[parentId].push(streamId);
            await this._selfId.merge('basicProfile', { disint });
        }
    }

    async getUserComments(): Promise<any[]> {
        let profile = (await this.readProfile()) as any;
        return profile?.disint?.comments || [];
    }

    async togglePinComment(streamId: StreamID) {
        await this.authenticate();

        let streamIds = await this._ceramic.pin.ls();
        let targetStreamIdString = streamId.toString();
        for await (let streamIdString of streamIds) {
            if (streamIdString == targetStreamIdString) {
                return await this.unpinComment(streamId);
            }
        }

        return await this.pinComment(streamId);
    }

    async getCommit(commitId: CommitID, streamId: string) {

        await this.connectToCeramicNetwork();

        let commit = await this._ceramic.loadStream(commitId);
        //let commits = await this._ceramic.loadStreamCommits(streamId);
        //let anchor = await this._ceramic.requestAnchor(streamId);
        return commit;
    }

    async pinComment(streamId: StreamID) {
        await this.authenticate();
        return await this._ceramic.pin.add(streamId);
    }

    async unpinComment(streamId: StreamID) {
        await this.authenticate();
        return await this._ceramic.pin.rm(streamId);
    }

    //
    // TODO: for now, this only knows how to load children comments from the current user's
    // profile.  In the future, read the parent stream owner and also their public profile
    // to get additional children comments.  Still need to figure out how to read children
    // comments that aren't from the parent owner or the current user.
    //
    async loadChildrenComments<T>(parentStreamId: string): Promise<DisintComment<T>[]> {
        const profile = (await this.readProfile()) as CeramicProfile;
        const parentCommentMap = profile?.disint?.comments || {};
        const commentIds = parentCommentMap[parentStreamId] || [];
        if (commentIds.length) {
            const queries = commentIds.map((id: any) => { return { streamId: id } });
            const comments = await this.lookup<T>(queries);
            return comments;
        } else {
            return [];
        }

    }

    // tried to type queries as MultiQuery[] but could not find type definiton anywhere
    async lookup<T>(queries: any[]): Promise<DisintComment<T>[]> {
        await this.connectToCeramicNetwork();
        // returns a plain old javascript object where each streamId maps to a tile document
        let streamObject = (await this._ceramic.multiQuery(queries)) as Record<string, TileDocument>;

        let tileDocuments = [] as TileDocument[];

        for (const streamId in streamObject) {
            tileDocuments.push(streamObject[streamId]);
        }

        // drop the tile document, and just return the comments
        return tileDocuments.map(td => this.tileDocumentToDisintComment(td));
    }

    async lookupStream<T>(streamId: string): Promise<DisintComment<T>> {
        await this.connectToCeramicNetwork();
        //await this.authenticate();
        let document = await this._ceramic.loadStream(streamId);
        return this.tileDocumentToDisintComment<T>(document as TileDocument);
    }

    tileDocumentToDisintComment<T>(document: TileDocument): DisintComment<T> {
        const comment = new DisintComment<T>();
        comment.id = document.id.toString();
        comment.cid = document.id.cid.toString();
        comment.controllers = document.controllers;
        comment.content = document.content.content as T;
        comment.allCommitIds = (document.allCommitIds || []).map(c => c.toString());
        comment.commitId = document.commitId.toString();
        comment.mimetype = document.content.mimetype;
        comment.metadata = new DisintCommentMetadata();
        comment.metadata.tags = document.metadata.tags || [];
        comment.tipCid = document.tip.toString();

        comment.parentIds = document.content.parentIds || [];
        comment.childrenIds = document.content.childrenIds || [];

        return comment;
    }

}
