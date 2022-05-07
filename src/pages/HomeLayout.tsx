import { IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import React, { useEffect, useState } from 'react';
import { createRef } from 'react';
import { useParams } from 'react-router';
import { MarkdownEditor } from '../components/MarkdownEditor';
import './HomeLayout.css';
import { CeramicPortal, CeramicProfile } from '../lib/ceramic/ceramic-portal';
import config from '../config.json'
import { TileDocument } from '@ceramicnetwork/stream-tile';

const HomeLayout: React.FC = () => {

  const { streamId } = useParams<{ streamId: string; }>();
  let _parentStreamId = streamId || config.rootDocumentStreamId;

  const portal = new CeramicPortal(config.ceramicEndpoints);
  const [comments, setComments] = useState([] as TileDocument[]);
  let _loading = false;
  let _parentDocument: TileDocument;

  let [markdown, setMarkdown] = useState("");
  let onMarkdownChange = (markdown: string) => {
    setMarkdown(markdown);
  }

  let create = async () => {
    let streamId = await portal.create(markdown, 'text/markdown');
    await portal.addCommentToUserProfile(streamId);
    setMarkdown('');
    await loadComments();


    let comment = comments[0];
    let commit = await portal.getCommit(comment.anchorCommitIds[0], comment.id.toString());
  }

  let loadComments = async () => {
    if (_loading) return
    _loading = true;
    const profile = (await portal.readProfile()) as CeramicProfile;
    const commentIds = profile?.disint?.comments || [];
    const queries = commentIds.map((id: any) => { return { streamId: id } });
    const comments = await portal.lookup(queries);

    setComments(comments);

    _loading = false;
  }

  let loadParentDocument = async () => {
    _parentDocument = await portal.lookupStream(_parentStreamId);
  }

  useEffect(() => {
    loadParentDocument();
    loadComments();
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>{_parentStreamId}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent >
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{_parentStreamId}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <MarkdownEditor onMarkdownChange={onMarkdownChange} markdown={markdown} />
        <IonButton onClick={create}>Save</IonButton>
        {comments.map((c: TileDocument) => {
          return <div key={c.id.cid.toString()} onClick={() => portal.togglePinComment(c.id)}>
            <p>
              id: {c.id.toString()}
            </p>
            <p>
              tip: {c.tip.toString()}
            </p>
            <p>
              cid: {c.id.cid.toString()}
            </p>
            <pre>
              content: {JSON.stringify(c.content, null, 2)}
            </pre>
            {c.allCommitIds.map((commitId: any, i: any) => {
              <p key={commitId.toString()}>
                commit {i}: {commitId.toString()}
              </p>
            })}
            <p>
              commit id: {c.commitId.toString()}
            </p>
            <pre>
              meta: {JSON.stringify(c.metadata, null, 2)}
            </pre>
            <pre>
              state: {JSON.stringify(c.id, null, 2)}
            </pre>
          </div>

        })

        }
      </IonContent>
    </IonPage>
  );
};

export default HomeLayout;
