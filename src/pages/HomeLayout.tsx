import { IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import React, { useEffect, useState } from 'react';
import { createRef } from 'react';
import { useParams } from 'react-router';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { CommentNavigator } from '../components/CommentNavigator';
import './HomeLayout.css';
import { CeramicPortal, CeramicProfile } from '../lib/ceramic/ceramic-portal';
import config from '../config.json'
import { TileDocument } from '@ceramicnetwork/stream-tile';
import { CommentStandard } from '../components/CommentStandard';
import { DisintComment } from '../models/DisintComment';

const HomeLayout: React.FC = () => {

  let commentNavigator = React.createRef<CommentNavigator>();

  const { streamId } = useParams<{ streamId: string; }>();
  let _parentStreamId = streamId || config.rootDocumentStreamId;
  let portal = CeramicPortal.getInstance(config.ceramicEndpoints);

  let [markdown, setMarkdown] = useState("");
  let onMarkdownChange = (markdown: string) => {
    setMarkdown(markdown);
  }

  let create = async () => {
    let streamId = await portal.create(markdown, 'text/markdown', _parentStreamId);
    setMarkdown('');
    await commentNavigator.current?.loadComments();
    //let comment = comments[0];
    //let commit = await portal.getCommit(comment.anchorCommitIds[0], comment.id.toString());
  }


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

        <CommentNavigator parentStreamId={_parentStreamId} ref={commentNavigator}></CommentNavigator>
      </IonContent>
    </IonPage>
  );
};

export default HomeLayout;
