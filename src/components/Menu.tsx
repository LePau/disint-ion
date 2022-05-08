import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote,
} from '@ionic/react';

import { useLocation } from 'react-router-dom';
import { personOutline, archiveOutline, archiveSharp, homeOutline,  bookmarkOutline, heartOutline, heartSharp, mailOutline, mailSharp, paperPlaneOutline, paperPlaneSharp, trashOutline, trashSharp, warningOutline, warningSharp } from 'ionicons/icons';
import './Menu.css';
import { CeramicPortal } from '../lib/ceramic/ceramic-portal';
import config from '../config.json'
import { useState } from 'react';


const Menu: React.FC = () => {
  const location = useLocation();
  const [loginName, setLoginName] = useState("");
  const [loginAddress, setLoginAddress] = useState("");
  let portal = CeramicPortal.getInstance(config.ceramicEndpoints);

  let connectWallet = async () => {
    await portal.authenticate();
    await portal.updateProfile("test name", 'https://avatars.githubusercontent.com/u/1857282?s=64&v=4');
    let data = (await portal.readProfile()) as any;

    setLoginName(data.name);
    setLoginAddress(portal.firstLoginAddress());

  }

  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>Inbox</IonListHeader>
          <IonNote>hi@ionicframework.com</IonNote>
          <IonMenuToggle autoHide={false}>
            <IonItem className={location.pathname === "/page/Inbox" ? 'selected' : ''} routerLink="/page/Inbox" routerDirection="none" lines="none" detail={false}>
              <IonIcon slot="start" icon={homeOutline} />
              <IonLabel>Home</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonItem lines="none" detail={false} onClick={connectWallet} button text-wrap>
            <IonIcon slot="start" icon={personOutline} />
            <IonLabel>
              Connect Wallet
              <p>
                {loginName} - {loginAddress}
              </p>
            </IonLabel>
          </IonItem>
        </IonList>

        {/*<IonList id="labels-list">
          <IonListHeader>Labels</IonListHeader>
          {labels.map((label, index) => (
            <IonItem lines="none" key={index}>
              <IonIcon slot="start" icon={bookmarkOutline} />
              <IonLabel>{label}</IonLabel>
            </IonItem>
          ))}
          </IonList>*/}
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
