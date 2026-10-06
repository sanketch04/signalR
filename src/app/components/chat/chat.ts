import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.services';

export interface ChatMessage {
  user: string;
  message: string;
  time: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  username = '';
  message = '';

  messages = signal<ChatMessage[]>([]);
  connected = signal(false);
  error = signal('');
  sending = signal(false);
  connecting = signal(false);

  readonly quickStarters = [
    '👋 Hello everyone!',
    '🚀 Real-time connection active!',
    '💡 How is the project going?',
    '🎉 SignalR working smoothly!'
  ];

  readonly quickEmojis = ['👍', '❤️', '🔥', '🚀', '🎉', '😊', '👏', '✨'];

  readonly avatarGradients = [
    'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
    'linear-gradient(135deg, #f97316 0%, #c2410c 100%)'
  ];

  private readonly randomNames = [
    'Alex', 'Jordan', 'Taylor', 'Sam', 'Morgan', 'Casey', 'Riley', 'Avery'
  ];

  constructor(private readonly chatService: ChatService) {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedUser = window.localStorage.getItem('signalr_chat_user');
      this.username = savedUser?.trim() || 'Alex';
    } else {
      this.username = 'Alex';
    }
  }

  async ngOnInit(): Promise<void> {
    await this.initConnection();
  }

  private async initConnection(): Promise<void> {
    this.connecting.set(true);
    try {
      await this.chatService.startConnection();

      this.chatService.onReceiveMessage((user, message) => {
        this.messages.update(current => [
          ...current,
          { user, message, time: new Date() }
        ]);
        this.scrollToBottom();
      });

      this.chatService.onConnectionStateChanged(isConnected => {
        this.connected.set(isConnected);

        if (isConnected) {
          this.error.set('');
        } else {
          this.error.set('Connection lost. Trying to reconnect...');
        }
      });

      this.connected.set(true);
      this.error.set('');
    } catch (error) {
      console.error('SignalR connection failed:', error);
      this.connected.set(false);
      this.error.set(
        'Unable to connect to SignalR hub. Ensure your ASP.NET backend is running.'
      );
    } finally {
      this.connecting.set(false);
    }
  }

  async reconnect(): Promise<void> {
    if (this.connecting() || this.connected()) return;
    await this.initConnection();
  }

  onUsernameChange(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('signalr_chat_user', this.username.trim());
      } catch {
        // storage disabled or quota exceeded
      }
    }
  }

  setRandomName(): void {
    const pick = this.randomNames[Math.floor(Math.random() * this.randomNames.length)];
    this.username = pick;
    this.onUsernameChange();
  }

  isMe(sender: string): boolean {
    if (!this.username || !sender) return false;
    return sender.trim().toLowerCase() === this.username.trim().toLowerCase();
  }

  getAvatarGradient(name: string): string {
    if (!name) return this.avatarGradients[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.avatarGradients.length;
    return this.avatarGradients[index];
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, Math.min(2, name.length)).toUpperCase();
  }

  scrollToBottom(smooth = true): void {
    setTimeout(() => {
      if (this.messagesContainer?.nativeElement) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTo({
          top: el.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    }, 60);
  }

  sendQuickStarter(text: string): void {
    this.message = text;
    this.sendMessage();
  }

  appendEmoji(emoji: string): void {
    this.message = (this.message || '') + emoji;
  }

  clearChat(): void {
    this.messages.set([]);
  }

  async sendMessage(): Promise<void> {
    const user = this.username.trim();
    const text = this.message.trim();

    if (
      !this.connected() ||
      !user ||
      !text ||
      this.sending()
    ) {
      return;
    }

    this.sending.set(true);

    try {
      await this.chatService.sendMessage(user, text);
      this.message = '';
      this.error.set('');
      this.scrollToBottom();
    } catch (error) {
      console.error('Message sending failed:', error);
      this.error.set('Message could not be sent. Please check connection and try again.');
    } finally {
      this.sending.set(false);
    }
  }

  async ngOnDestroy(): Promise<void> {
    await this.chatService.stopConnection();
  }
}