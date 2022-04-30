import { IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import React, { useState } from 'react';
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
  portal.init();

  let [markdown, setMarkdown] = useState("");
  let onMarkdownChange = (markdown: string) => {
    setMarkdown(markdown);
  }

  let create = async () => {
    let profile = await portal.readProfile('posts');
    console.log(profile)
    let hash = await portal.create(markdown, 'text/markdown');
    await portal.addDocumentToUserCollection(hash);
    alert(hash);
    //alert(markdown)
  }

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
      </IonContent>
    </IonPage>
  );
};

export default Page;
