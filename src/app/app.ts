import { Component } from '@angular/core';
import { ChatComponent } from './components/chat/chat';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChatComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}