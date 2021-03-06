import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import AgoraRTC, { ConnectionState, IAgoraRTCClient } from 'agora-rtc-sdk-ng';
import { Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from '../interfaces/user';
import { EventService } from './event.service';
import { SoundService } from './sound.service';
import { UiService } from './ui.service';

@Injectable({
  providedIn: 'root',
})
export class AgoraService {
  localPlayer = document.getElementById('local-player');
  agoraAppId: string = environment.agora.appId;
  agoraUid: any;
  localTracks = {
    videoTrack: null,
    audioTrack: null,
    screenTrack: null,
    screenAudioTrack: null,
  };
  remoteUserIds: (number | string)[] = [];
  remoteUserIds$: Observable<(number | string)[]>;

  globalAgoraClient: IAgoraRTCClient | null = null;
  isProcessing: boolean;
  constructor(
    private fnc: AngularFireFunctions,
    private router: Router,
    private snackBar: MatSnackBar,
    private db: AngularFirestore,
    private eventService: EventService,
    private uiService: UiService,
    private soundService: SoundService
  ) {}

  async joinAgoraChannel(
    uid: string,
    eventId: string
  ): Promise<string | number> {
    const client = this.getClient();

    const callable = this.fnc.httpsCallable('participateChannel');
    await callable({ eventId })
      .toPromise()
      .catch((error) => {
        console.log(error);
        this.router.navigate(['/']);
      });
    if (!uid) {
      throw new Error('channel name is required.');
    }

    const token: any = await this.getToken(eventId);

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (!this.remoteUserIds.includes(user.uid)) {
        this.remoteUserIds.push(user.uid);
        this.remoteUserIds$ = of(this.remoteUserIds);
      }
      const screenOwnerUid = await this.eventService.getScreenOwnerId(eventId);
      const remoteUserId = user.uid;

      if (mediaType === 'video') {
        if (screenOwnerUid === remoteUserId) {
          user.videoTrack.play('share-screen', { fit: 'contain' });
        } else {
          user.videoTrack.play('local-player', { fit: 'contain' });
        }
      }
      if (mediaType === 'audio') {
        user.audioTrack.play();
      }
    });

    client.on('user-unpublished', async (user, mediaType) => {
      await client.unsubscribe(user, mediaType);
    });

    return client.join(this.agoraAppId, eventId, token.token, uid);
  }

  async leaveAgoraChannel(eventId: string): Promise<void> {
    const client = this.getClient();
    if (this.localTracks.videoTrack) {
      const callable = this.fnc.httpsCallable('unPublishVideo');
      await callable({ eventId })
        .toPromise()
        .catch((error) => {
          console.log(error);
          this.router.navigate(['/']);
        });
    }
    if (this.localTracks.screenTrack) {
      await this.eventService.updateScreenFlag(eventId, false);
    }
    await this.unpublishAgora();
    await client.leave();
    await this.leaveFromSession(eventId);
    this.soundService.exitSound.play();
    this.uiService.sidenavIsOpen = true;
  }

  async publishMicrophone(): Promise<void> {
    const client = this.getClient();

    this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await client.publish([this.localTracks.audioTrack]);
  }

  async unpublishMicrophone(): Promise<void> {
    const client = this.getClient();

    if (this.localTracks.audioTrack) {
      this.localTracks.audioTrack.close();
      client.unpublish([this.localTracks.audioTrack]);
    }
  }

  async publishVideo(eventId: string): Promise<void> {
    const client = this.getClient();

    this.localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();
    await this.localTracks.videoTrack.play('local-player', { fit: 'contain' });

    await client.publish([this.localTracks.videoTrack]);
    const callable = this.fnc.httpsCallable('publishVideo');
    await callable({ eventId })
      .toPromise()
      .catch((error) => {
        console.log(error);
        this.router.navigate(['/']);
      });
  }

  async unpublishVideo(eventId: string): Promise<void> {
    const client = this.getClient();

    if (this.localTracks.videoTrack) {
      this.localTracks.videoTrack.close();
      client.unpublish([this.localTracks.videoTrack]);
      const callable = this.fnc.httpsCallable('unpublishVideo');
      await callable({ eventId })
        .toPromise()
        .catch((error) => {
          console.log(error);
          this.router.navigate(['/']);
        });
    }
  }

  async publishScreen(eventId: string, uid: string): Promise<boolean | void> {
    const client = this.getClient();

    return await AgoraRTC.createScreenVideoTrack({
      encoderConfig: '1080p_1',
    })
      .then(async (screenTrack) => {
        this.localTracks.screenTrack = screenTrack;
        this.localTracks.screenTrack.play('share-screen', { fit: 'contain' });
        await client.publish([this.localTracks.screenTrack]);
        await this.eventService.updateScreenFlag(eventId, true, uid);
      })
      .catch((error) => {
        if (error.code === 'PERMISSION_DENIED') {
          return true;
        }
      });
  }

  async unpublishScreen(eventId: string, uid: string): Promise<void> {
    const client = this.getClient();

    if (this.localTracks.screenTrack) {
      this.localTracks.screenTrack.close();
      await client.unpublish([this.localTracks.screenTrack]);
      await this.eventService.updateScreenFlag(eventId, false, uid);
    }
  }

  async getToken(eventId): Promise<string> {
    const callable = this.fnc.httpsCallable('getChannelToken');
    const agoraToken = await callable({ eventId })
      .toPromise()
      .catch((error) => {
        this.router.navigate(['/']);
      });
    if (agoraToken) {
      return agoraToken;
    }
  }

  handleUserUnpublished(user): void {
    const id = user.uid;
    delete this.remoteUserIds[id];
    const element = document.getElementById(`player-wrapper-${id}`);
    if (element) {
      element.remove();
    }
  }

  async unpublishAgora(): Promise<void> {
    const client = this.getClient();
    if (client.localTracks.length > 0) {
      client.localTracks.forEach((v) => v.close());
      client.unpublish();
    }
  }

  async leaveFromSession(eventId: string): Promise<void> {
    const callable = this.fnc.httpsCallable('leaveFromSession');
    await callable({ eventId })
      .toPromise()
      .catch((error) => {
        console.log(error);
        this.router.navigate(['/']);
      });
  }

  getClient(): IAgoraRTCClient {
    if (!this.globalAgoraClient) {
      const newClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      this.globalAgoraClient = newClient;
    }
    return this.globalAgoraClient;
  }

  getParticipants(eventId: string): Observable<User[]> {
    return this.db
      .collection<User>(`events/${eventId}/participants`)
      .valueChanges();
  }

  getAgoraConnectioneState(): ConnectionState {
    const client = this.getClient();
    let state: ConnectionState;
    client.on('connection-state-change', (newState: ConnectionState) => {
      state = newState;
    });
    return state;
  }
}
