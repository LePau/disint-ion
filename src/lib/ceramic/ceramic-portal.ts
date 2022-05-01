import type { CeramicApi } from '@ceramicnetwork/common';
//import { Ceramic, CeramicConfig } from '@ceramicnetwork/core'
import { CeramicClient } from '@ceramicnetwork/http-client'
import * as ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import { TileDocument, TileMetadataArgs } from '@ceramicnetwork/stream-tile'

import { create as createIPFS, IPFS } from 'ipfs-core'
import * as dagJose from 'dag-jose'
import { EthereumAuthProvider, SelfID, WebClient } from '@self.id/web'

import KeyDidResolver from 'key-did-resolver';
import { Resolver } from 'did-resolver';
import { DID } from 'dids';

export interface CeramicProfile {
    name: string;
    avatarUrl: string;
}

export class CeramicPortal {
    private _ceramic: CeramicApi;
    private _selfId: SelfID;
    private _ipfs: IPFS;
    private _authenticated: boolean;
    private _profile: any;
    private _addresses: string[];

    constructor(private _endpoint: string = "") {

    }

    async init() {
        if (this._endpoint) {
            this._ceramic = new CeramicClient(this._endpoint) as CeramicApi
        } else {
            return await this._createLocalCeramic();
        }
    }

    async _createLocalCeramic() {
        this._ipfs = await createIPFS({
            ipld: { codecs: [dagJose] },
        })

        throw new Error("Cannot create local ceramic instance - @ceramicnetwork/core is not supported in the browser");
        //const config: CeramicConfig = {}
        //this._ceramic = (await Ceramic.create(this._ipfs, config)) as CeramicApi;
    }

    async authenticate() {
        if (this._authenticated) return;

        let windowAny = window as any;
        const [address] = await this.connect()
        const authProvider = new EthereumAuthProvider(windowAny.ethereum, address)


        // The following configuration assumes your local node is connected to the Clay testnet
        const client = new WebClient({
            ceramic: 'local', // "https://ceramic-clay.3boxlabs.com"
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

    async connect() {
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

    async addCommentToUserProfile(hash: string) {
        await this.authenticate();
        let profile = this._profile || await this.readProfile();

        let disint = profile?.disint || {};
        disint.comments = disint.comments || [];
        disint.comments.push(hash);

        await this._selfId.merge('basicProfile', { disint });

    }

    async getUserComments(): Promise<any[]> {
        let profile = (await this.readProfile()) as any;
        return profile?.disint?.comments || [];
    }

    // tried to type queries as MultiQuery[] but could not find type definiton anywhere
    async lookup(queries: any[]): Promise<any[]> {
        // returns a plain old javascript object where each streamId maps to a tile document
        let streamObject = await this._ceramic.multiQuery(queries);

        let contents = []; // TileDocument[] (where is this type?)

        for (const streamId in streamObject) {
            contents.push(streamObject[streamId]);
        }

        // drop the tile document, and just return the comments
        return contents.map(c => c.content);
    }

}
