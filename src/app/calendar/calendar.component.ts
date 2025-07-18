import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { TodoListComponent } from '../todo-list/todo-list.component';

const client = generateClient<Schema>();

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, TodoListComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit, OnDestroy {
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();
  selectedDate = new Date();
  calendarDays: any[] = [];
  events: any[] = [];
  filteredEvents: any[] = [];
  viewType = 'month';
  selectedEvent: any = null;
  selectedEventCountdown: any = null;
  countdownInterval: any;
  isEditingEvent = false;
  editingEventData: any = {};
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  ngOnInit() {
    this.generateCalendar();
    this.loadEvents();
    this.filterEvents();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  generateCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    this.calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      this.calendarDays.push({
        date: date,
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === this.currentMonth,
        isToday: this.isToday(date),
        events: []
      });
    }
  }

  async loadEvents() {
    try {
      const result = await client.models.Event.list();
      this.events = result.data || [];
      this.mapEventsToCalendar();
      this.filterEvents();
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }

  mapEventsToCalendar() {
    this.calendarDays.forEach(day => {
      day.events = this.events.filter(event => {
        const eventDate = new Date(event.targetDate);
        return this.isSameDay(day.date, eventDate);
      });
    });
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return this.isSameDay(date, today);
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
    this.mapEventsToCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
    this.mapEventsToCalendar();
    this.filterEvents();
  }

  selectDay(date: Date) {
    this.selectedDate = new Date(date);
    this.viewType = 'day';
    this.filterEvents();
  }

  onViewChange() {
    this.filterEvents();
  }

  filterEvents() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (this.viewType) {
      case 'day':
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return this.isSameDay(eventDate, today);
        });
        break;
        
      case 'week':
        const weekStart = this.getWeekStart(today);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= weekStart && eventDate <= weekEnd;
        });
        break;
        
      case 'next2':
        const next2End = new Date(today);
        next2End.setDate(today.getDate() + 2);
        
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= today && eventDate <= next2End;
        });
        break;
        
      case 'next7':
        const next7End = new Date(today);
        next7End.setDate(today.getDate() + 7);
        
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= today && eventDate <= next7End;
        });
        break;
        
      case 'next30':
        const next30End = new Date(today);
        next30End.setDate(today.getDate() + 30);
        
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= today && eventDate <= next30End;
        });
        break;
        
      case 'nextMonth':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= nextMonth && eventDate <= nextMonthEnd;
        });
        break;
        
      case 'past2':
        const past2Start = new Date(today);
        past2Start.setDate(today.getDate() - 2);
        
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= past2Start && eventDate < today;
        });
        break;
        
      case 'pastWeek':
        const pastWeekStart = new Date(today);
        pastWeekStart.setDate(today.getDate() - 7);
        
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= pastWeekStart && eventDate < today;
        });
        break;
        
      case 'pastMonth':
        const pastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const pastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate >= pastMonth && eventDate <= pastMonthEnd;
        });
        break;
        
      case 'month':
      default:
        this.filteredEvents = this.events.filter(event => {
          const eventDate = new Date(event.targetDate);
          return eventDate.getMonth() === this.currentMonth && 
                 eventDate.getFullYear() === this.currentYear;
        });
        break;
    }
    
    this.filteredEvents.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }

  getWeekStart(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    return new Date(start.setDate(diff));
  }

  getEventListTitle(): string {
    const today = new Date();
    
    switch (this.viewType) {
      case 'day':
        return `Events for Today`;
      case 'week':
        return `Events for This Week`;
      case 'next2':
        return `Events for Next 2 Days`;
      case 'next7':
        return `Events for Next 7 Days`;
      case 'next30':
        return `Events for Next 30 Days`;
      case 'nextMonth':
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return `Events for ${this.monthNames[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`;
      case 'past2':
        return `Events from Past 2 Days`;
      case 'pastWeek':
        return `Events from Past Week`;
      case 'pastMonth':
        const pastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return `Events from ${this.monthNames[pastMonth.getMonth()]} ${pastMonth.getFullYear()}`;
      case 'month':
      default:
        return `Events for ${this.monthNames[this.currentMonth]} ${this.currentYear}`;
    }
  }

  openEventPopup(event: any) {
    this.selectedEvent = event;
    this.updateSelectedEventCountdown();
    
    // Update countdown every second
    this.countdownInterval = setInterval(() => {
      this.updateSelectedEventCountdown();
    }, 1000);
  }

  closeEventPopup() {
    this.selectedEvent = null;
    this.selectedEventCountdown = null;
    this.isEditingEvent = false;
    this.editingEventData = {};
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  startEditEvent() {
    this.isEditingEvent = true;
    this.editingEventData = {
      title: this.selectedEvent.title,
      description: this.selectedEvent.description || '',
      targetDate: this.formatDateForInput(this.selectedEvent.targetDate)
    };
  }

  async saveEventEdit() {
    try {
      await client.models.Event.update({
        id: this.selectedEvent.id,
        title: this.editingEventData.title,
        description: this.editingEventData.description,
        targetDate: this.editingEventData.targetDate
      });
      
      // Update local data
      this.selectedEvent.title = this.editingEventData.title;
      this.selectedEvent.description = this.editingEventData.description;
      this.selectedEvent.targetDate = this.editingEventData.targetDate;
      
      // Refresh events and calendar
      await this.loadEvents();
      
      this.isEditingEvent = false;
    } catch (error) {
      console.error('Error updating event:', error);
    }
  }

  cancelEventEdit() {
    this.isEditingEvent = false;
    this.editingEventData = {};
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  }

  async deleteEvent(eventId: string) {
    if (!eventId) return;
    
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await client.models.Event.delete({ id: eventId });
        await this.loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  }

  updateSelectedEventCountdown() {
    if (!this.selectedEvent || !this.selectedEvent.targetDate) return;
    
    const now = new Date().getTime();
    const targetTime = new Date(this.selectedEvent.targetDate).getTime();
    const timeLeft = targetTime - now;
    
    if (timeLeft <= 0) {
      this.selectedEventCountdown = { expired: true };
    } else {
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      this.selectedEventCountdown = { days, hours, minutes, seconds, expired: false };
    }
  }
}