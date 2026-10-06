import { Injectable } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private hubConnection?: HubConnection;
  private connectionPromise?: Promise<void>;

  private readonly hubUrl = 'https://localhost:7218/chatHub';

  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    this.hubConnection = connection;

    this.connectionPromise = connection.start()
      .then(() => {
        console.log('Connected to SignalR!');
      })
      .catch((error: unknown) => {
        this.hubConnection = undefined;
        throw error;
      })
      .finally(() => {
        this.connectionPromise = undefined;
      });

    return this.connectionPromise;
  }

  onReceiveMessage(
    callback: (user: string, message: string) => void
  ): void {
    this.hubConnection?.off('ReceiveMessage');
    this.hubConnection?.on('ReceiveMessage', callback);
  }

  onConnectionStateChanged(
    callback: (connected: boolean) => void
  ): void {
    if (!this.hubConnection) {
      return;
    }

    this.hubConnection.onreconnecting(() => callback(false));
    this.hubConnection.onreconnected(() => callback(true));
    this.hubConnection.onclose(() => callback(false));
  }

  async sendMessage(user: string, message: string): Promise<void> {
    if (this.hubConnection?.state !== HubConnectionState.Connected) {
      throw new Error('SignalR is not connected.');
    }

    await this.hubConnection.invoke('SendMessage', user, message);
  }

  async stopConnection(): Promise<void> {
    const connection = this.hubConnection;

    this.hubConnection = undefined;

    if (connection) {
      await connection.stop();
    }
  }
}