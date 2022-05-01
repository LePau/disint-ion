import { IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import React, { useEffect, useState } from 'react';
import { createRef } from 'react';
import { useParams } from 'react-router';
import ExploreContainer from '../components/ExploreContainer';
import { MarkdownEditor } from '../components/MarkdownEditor';
import './Page.css';
import { CeramicPortal } from '../lib/ceramic/ceramic-portal';
import config from '../config.json'

const Page: React.FC = () => {

  const { name } = useParams<{ name: string; }>();
  const portal = new CeramicPortal(config.ceramicEndpoints[0]);
  const [comments, setComments] = useState([] as any[]);
  let _loading = false;

  portal.init();

  let [markdown, setMarkdown] = useState("");
  let onMarkdownChange = (markdown: string) => {
    setMarkdown(markdown);
  }

  let create = async () => {
    //let hash = await portal.create(markdown, 'text/markdown');
    //await portal.addCommentToUserProfile(hash);
    setMarkdown('');
    //await loadComments();
  }

  let loadComments = async () => {
    if (_loading) return
    _loading = true;
    const profile = (await portal.readProfile()) as any;
    const commentIds = profile?.disint?.comments || [];
    const queries = commentIds.map((id: any) => { return { streamId: id } });
    const comments = await portal.lookup(queries);

    setComments(comments);

    _loading = false;
  }

  useEffect(() => {
    loadComments();
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>{name}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent >
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{name}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer name={name} />
        <MarkdownEditor onMarkdownChange={onMarkdownChange} markdown={markdown} />
        <IonButton onClick={create}>Save</IonButton>
        {comments.map(c => {
          return <div>{c.content}</div>
        })

        }
      </IonContent>
    </IonPage>
  );
};

export default Page;
