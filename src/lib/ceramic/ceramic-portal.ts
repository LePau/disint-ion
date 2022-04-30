import type { CeramicApi } from '@ceramicnetwork/common';
//import { Ceramic, CeramicConfig } from '@ceramicnetwork/core'
import { CeramicClient } from '@ceramicnetwork/http-client'
import * as ThreeIdResolver from '@ceramicnetwork/3id-did-resolver';
import { IDX } from '@ceramicstudio/idx'
import { TileDocument, TileMetadataArgs } from '@ceramicnetwork/stream-tile'

import { create as createIPFS, IPFS } from 'ipfs-core'
import * as dagJose from 'dag-jose'

import { ThreeIdConnect, EthereumAuthProvider } from '@3id/connect'
import KeyDidResolver from 'key-did-resolver';
import { Resolver } from 'did-resolver';
import { DID } from 'dids';

export interface CeramicProfile {
    name: string;
    avatarUrl: string;
}

export class CeramicPortal {
    private _ceramic: CeramicApi;
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
        const threeIdConnect = new ThreeIdConnect()
        const provider = new EthereumAuthProvider(windowAny.ethereum, address)

        await threeIdConnect.connect(provider)

        const did = new DID({
            provider: threeIdConnect.getDidProvider(),
            resolver: {
                ...ThreeIdResolver.getResolver(this._ceramic)
            }
        })

        this._ceramic.setDID(did)
        await this._ceramic.did?.authenticate()

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
        const [address] = await this.connect()
        const idx = new IDX({ ceramic: this._ceramic as any })

        const data = await idx.get(
            'basicProfile',
            `${address}@eip155:1`
        )
        this._profile = data;
        return data as CeramicProfile
    }

    async updateProfile(name: string, avatarUrl: string) {
        await this.authenticate();
        const idx = new IDX({ ceramic: this._ceramic as any })

        await idx.set('basicProfile', {
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

        metadata.tags = [mimetype];

        if (parent) {
            metadata.family = parent;
        }

        if (tags?.length) {
            metadata.tags = metadata.tags.concat(tags);
        }

        const doc = await TileDocument.create(this._ceramic, { data }, metadata);

        console.log(doc.content)

        const streamId = doc.id.toString()

        console.log(streamId);

        return streamId;

    }

    async addDocumentToUserCollection(hash: string) {
        await this.authenticate();
        let profile = this._profile || await this.readProfile();
        const idx = new IDX({ ceramic: this._ceramic as any })

        profile.posts = profile.posts || [];
        profile.posts.push(hash);

        if (!profile?.disint) {
            await idx.merge('basicProfile', {disint: { created: new Date().toISOString } });
            
        }

        await idx.merge('basicProfile', {disint: { posts: profile.posts } });


    }

}
