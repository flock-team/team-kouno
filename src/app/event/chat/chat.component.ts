import { Component, OnInit, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { Chat, ChatWithUser } from 'src/app/interfaces/chat';
import { AuthService } from 'src/app/services/auth.service';
import { ChatService } from 'src/app/services/chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  @Input() eventId: string;
  uid = this.authService.uid;
  form = new FormControl();
  chats$: Observable<ChatWithUser[]>;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  createChat(): void {
    if (this.form.value) {
      const chat = { chatBody: this.form.value };
      this.chatService.createChat(this.eventId, this.uid, chat);
    }
    this.form.reset();
  }

  deleteChat(chatId): void {
    this.chatService.deleteChat(this.eventId, chatId);
  }

  ngOnInit(): void {
    this.chats$ = this.chatService.getChatsWithUser(this.eventId);
  }
}
