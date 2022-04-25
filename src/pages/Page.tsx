import { IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { createRef } from 'react';
import { useParams } from 'react-router';
import ExploreContainer from '../components/ExploreContainer';
import { MarkdownEditor } from '../components/MarkdownEditor';
import './Page.css';

const Page: React.FC = () => {

  const { name } = useParams<{ name: string; }>();

  let markdownEditor  = createRef();

  let create = () => {
    alert("create")
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
        <MarkdownEditor ref={markdownEditor} />
        <IonButton onClick={create}>Save</IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Page;
