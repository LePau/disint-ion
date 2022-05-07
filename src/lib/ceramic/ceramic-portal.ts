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
    comments: string[];
}

export interface CeramicProfile {
    name: string;
    avatarUrl: string;
    disint: DisintProfile;
}

export class CeramicPortal {
    private _ceramic: CeramicApi;
    private _selfId: SelfID;
    private _ipfs: IPFS;
    private _authenticated: boolean;
    private _profile: any;
    private _addresses: string[];

    constructor(private _endpoints: string[] = []) {

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

    async create(data: any, mimetype: string, parent: string = '', tags: string[] = []): Promise<string> {
        await this.authenticate();
        const metadata = {} as TileMetadataArgs;
        let controllerId = this._ceramic?.did?.id;
        if (controllerId) {
            metadata.controllers = [controllerId];
        }

        metadata.tags = metadata.tags || [];

        if (parent) {
            metadata.family = parent;
        }

        if (tags?.length) {
            metadata.tags = metadata.tags.concat(tags);
        }

        const doc = await TileDocument.create(this._ceramic, { content: data, mimetype }, metadata);

        console.log(doc.content)

        const streamId = doc.id.toString()

        console.log(streamId);

        return streamId;

    }

    async addCommentToUserProfile(streamId: string) {
        await this.authenticate();
        let profile = this._profile || await this.readProfile();

        let disint = profile?.disint || {};
        disint.comments = disint.comments || [];
        disint.comments.push(streamId);

        await this._selfId.merge('basicProfile', { disint });

    }

    async getUserComments(): Promise<any[]> {
        let profile = (await this.readProfile()) as any;
        return profile?.disint?.comments || [];
    }

    async togglePinComment(streamId: StreamID) {
        return;
        await this.authenticate();

        let streamIds = await this._ceramic.pin.ls();
        let targetStreamIdString = streamId.toString();
        for await (let streamIdString of streamIds) {
            if (streamIdString == targetStreamIdString) {
                alert("unpin!");
                return await this.unpinComment(streamId);
            }
        }

        alert("pin!");
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
        comment.content = document.content.content as T;
        comment.allCommitIds = (document.allCommitIds || []).map(c => c.toString());
        comment.commitId = document.commitId.toString();
        comment.mimetype = document.content.mimetype;
        comment.metadata = new DisintCommentMetadata();
        comment.metadata.tags = document.metadata.tags || [];
        comment.tipCid = document.tip.toString();

        return comment;
    }

}
