import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import firebase from 'firebase/app';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Invite, InviteWithSender } from '../intefaces/invite';
import { Reject } from '../interfaces/reject';
import { Room } from '../interfaces/room';
import { User } from '../interfaces/user';
import { SoundService } from './sound.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class MeetingService {
  constructor(
    private db: AngularFirestore,
    private userService: UserService,
    private soundService: SoundService
  ) {}

  async createEmptyRoom(uid: string) {
    const id = this.db.createId();
    await this.db.doc(`rooms/${id}`).set({
      roomId: id,
      ownerId: uid,
      ownerStatus: {
        videoPublish: true,
        voicePublish: true,
      },
      guestStatus: {
        videoPublish: true,
        voicePublish: true,
      },
    });
    return id;
  }

  createInvite(
    uid: string,
    roomId: string,
    senderUid: string,
    message: string
  ) {
    this.db
      .doc(`users/${uid}/invite/${roomId}`)
      .set({
        roomId,
        senderUid,
        createdAt: firebase.firestore.Timestamp.now(),
        message,
      })
      .then(() => {
        this.soundService.callSound.play();
      });
  }

  getRoom(roomId: string) {
    return this.db.doc<Room>(`rooms/${roomId}`).valueChanges();
  }

  getInvites(uid: string): Observable<InviteWithSender[]> {
    return this.db
      .collection<Invite>(`users/${uid}/invite`, (ref) =>
        ref.orderBy('createdAt', 'desc')
      )
      .valueChanges()
      .pipe(
        switchMap((invites: Invite[]) => {
          const uniqueSenderIds = Array.from(
            new Set(
              invites.map((invite) => {
                return invite.senderUid;
              })
            )
          );
          const senders$: Observable<User[]> = combineLatest(
            uniqueSenderIds.map((id) => this.userService.getUserData(id))
          );
          return combineLatest([of(invites), senders$]);
        }),
        map(([invites, senders]) => {
          return invites.map((invite) => {
            return {
              ...invite,
              sender: senders.find(
                (sender) => invite.senderUid === sender?.uid
              ),
            };
          });
        })
      );
  }

  getRejects(uid: string): Observable<Reject[]> {
    return this.db
      .collection<Reject>(`users/${uid}/rejects`, (ref) =>
        ref.orderBy('createdAt', 'desc')
      )
      .valueChanges();
  }
}
