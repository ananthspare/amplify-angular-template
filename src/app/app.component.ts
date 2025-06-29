import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { CategoriesComponent } from './categories/categories.component';
import { CalendarComponent } from './calendar/calendar.component';

// Configure Amplify
Amplify.configure(outputs);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    AmplifyAuthenticatorModule,
    CategoriesComponent,
    CalendarComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Event Countdown App';
  currentYear = new Date().getFullYear();
  activeTab = 'categories';

  constructor(public authenticator: AuthenticatorService) {}

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}