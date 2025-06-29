import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { RouterModule } from '@angular/router';
import { TodoListComponent } from '../todo-list/todo-list.component';
import { Subscription } from 'rxjs';

const client = generateClient<Schema>();

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TodoListComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css',
})
export class CategoriesComponent implements OnInit, OnDestroy, AfterViewInit {
  categories: any[] = [];
  selectedCategoryId: string | null = null;
  selectedCategory: any = null;
  events: any[] = [];
  newCategory = { name: '', description: '' };
  editingCategory: any = null;
  newEvent = { title: '', description: '', targetDate: '' };
  editingEvent: any = null;
  countdowns: { [key: string]: any } = {};
  countdownInterval: any;
  isDragging = false;
  draggedIndex: number = -1;
  
  private categorySubscription: Subscription | null = null;
  private eventSubscription: Subscription | null = null;

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.listCategories();
    
    // Update countdowns every second
    this.countdownInterval = setInterval(() => this.updateCountdowns(), 1000);
  }

  ngAfterViewInit(): void {
    this.initDraggableSidebar();
    this.initResizeHandle();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    if (this.categorySubscription) {
      this.categorySubscription.unsubscribe();
    }
    
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
    }
  }

  initDraggableSidebar(): void {
    const sidebar = this.elementRef.nativeElement.querySelector('#categoriesSidebar');
    const dragHandle = this.elementRef.nativeElement.querySelector('#dragHandle');
    
    if (!sidebar || !dragHandle) return;
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    dragHandle.onmousedown = (e: MouseEvent) => {
      e.preventDefault();
      this.isDragging = true;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      document.onmousemove = (e: MouseEvent) => {
        if (!this.isDragging) return;
        
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        sidebar.style.left = (sidebar.offsetLeft - pos1) + "px";
      };
      
      document.onmouseup = () => {
        this.isDragging = false;
        document.onmouseup = null;
        document.onmousemove = null;
      };
    };
  }

  initResizeHandle(): void {
    const resizeHandle = this.elementRef.nativeElement.querySelector('#resizeHandle');
    const sidebar = this.elementRef.nativeElement.querySelector('#categoriesSidebar');
    
    if (!resizeHandle || !sidebar) return;
    
    let isResizing = false;
    
    resizeHandle.onmousedown = (e: MouseEvent) => {
      e.preventDefault();
      isResizing = true;
      
      document.onmousemove = (e: MouseEvent) => {
        if (!isResizing) return;
        
        const containerRect = this.elementRef.nativeElement.querySelector('.two-column-layout').getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        
        if (newWidth >= 200 && newWidth <= 400) {
          sidebar.style.width = newWidth + 'px';
        }
      };
      
      document.onmouseup = () => {
        isResizing = false;
        document.onmouseup = null;
        document.onmousemove = null;
      };
    };
  }

  listCategories() {
    try {
      // Unsubscribe from previous subscription if exists
      if (this.categorySubscription) {
        this.categorySubscription.unsubscribe();
      }
      
      this.categorySubscription = client.models.Category.observeQuery().subscribe({
        next: ({ items }) => {
          this.categories = items.sort((a, b) => (a.order || 0) - (b.order || 0));
          
          // Select first category if none selected
          if (this.categories.length > 0 && !this.selectedCategoryId) {
            this.selectCategory(this.categories[0].id);
          }
        },
        error: (error) => console.error('Error fetching categories', error)
      });
    } catch (error) {
      console.error('Error setting up categories subscription', error);
    }
  }

  selectCategory(categoryId: string) {
    this.selectedCategoryId = categoryId;
    this.selectedCategory = this.categories.find(cat => cat.id === categoryId);
    this.listEvents();
  }

  listEvents() {
    if (!this.selectedCategoryId) return;
    
    try {
      // Unsubscribe from previous subscription if exists
      if (this.eventSubscription) {
        this.eventSubscription.unsubscribe();
      }
      
      this.eventSubscription = client.models.Event.observeQuery({
        filter: { categoryID: { eq: this.selectedCategoryId } }
      }).subscribe({
        next: ({ items }) => {
          // Sort events by target date (nearest first), handling null values
          this.events = items.sort((a, b) => {
            if (!a.targetDate && !b.targetDate) return 0;
            if (!a.targetDate) return 1;
            if (!b.targetDate) return -1;
            
            const dateA = new Date(a.targetDate).getTime();
            const dateB = new Date(b.targetDate).getTime();
            return dateA - dateB;
          });
          this.updateCountdowns();
        },
        error: (error) => console.error('Error fetching events', error)
      });
    } catch (error) {
      console.error('Error setting up events subscription', error);
    }
  }

  updateCountdowns() {
    if (!this.events) return;
    
    const now = new Date().getTime();
    
    this.events.forEach(event => {
      if (!event || !event.targetDate) return;
      
      try {
        const targetTime = new Date(event.targetDate).getTime();
        const timeLeft = targetTime - now;
        
        if (timeLeft <= 0) {
          this.countdowns[event.id] = { expired: true };
        } else {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          
          this.countdowns[event.id] = { days, hours, minutes, seconds, expired: false };
        }
      } catch (error) {
        console.error('Error calculating countdown for event', event.id, error);
      }
    });
  }

  async createCategory() {
    if (!this.newCategory.name.trim()) return;
    
    try {
      const maxOrder = this.categories.length > 0 ? Math.max(...this.categories.map(c => c.order || 0)) : -1;
      const result = await client.models.Category.create({
        name: this.newCategory.name,
        description: this.newCategory.description || '',
        order: maxOrder + 1
      });
      this.newCategory = { name: '', description: '' };
      
      // Access the id from the data property
      if (result && result.data && result.data.id) {
        this.selectCategory(result.data.id);
      }
    } catch (error) {
      console.error('Error creating category', error);
    }
  }

  startEdit(category: any) {
    this.editingCategory = { 
      ...category,
      description: category.description || ''
    };
  }

  cancelEdit() {
    this.editingCategory = null;
  }

  async saveEdit() {
    if (!this.editingCategory || !this.editingCategory.name.trim()) return;
    
    try {
      await client.models.Category.update({
        id: this.editingCategory.id,
        name: this.editingCategory.name,
        description: this.editingCategory.description || ''
      });
      this.editingCategory = null;
    } catch (error) {
      console.error('Error updating category', error);
    }
  }

  async deleteCategory(id: string) {
    if (!id) return;
    
    if (confirm('Are you sure you want to delete this category? All associated events will also be deleted.')) {
      try {
        await client.models.Category.delete({ id });
        
        // If the deleted category was selected, select another one
        if (id === this.selectedCategoryId) {
          this.selectedCategoryId = null;
          this.selectedCategory = null;
          this.events = [];
          
          // Find remaining categories after deletion
          const remainingCategories = this.categories.filter(c => c.id !== id);
          if (remainingCategories.length > 0) {
            this.selectCategory(remainingCategories[0].id);
          }
        }
      } catch (error) {
        console.error('Error deleting category', error);
      }
    }
  }

  createEvent() {
    if (!this.newEvent.title.trim() || !this.newEvent.targetDate || !this.selectedCategoryId) return;
    
    try {
      client.models.Event.create({
        title: this.newEvent.title,
        description: this.newEvent.description || '',
        targetDate: new Date(this.newEvent.targetDate).toISOString(),
        categoryID: this.selectedCategoryId
      });
      this.newEvent = { title: '', description: '', targetDate: '' };
    } catch (error) {
      console.error('Error creating event', error);
    }
  }

  startEditEvent(event: any) {
    if (!event) return;
    
    try {
      const date = new Date(event.targetDate);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      const formattedDate = localDate.toISOString().slice(0, 16);
      
      this.editingEvent = { 
        ...event, 
        description: event.description || '',
        targetDate: formattedDate
      };
    } catch (error) {
      console.error('Error formatting date', error);
      this.editingEvent = { 
        ...event, 
        description: event.description || '',
        targetDate: ''
      };
    }
  }

  cancelEditEvent() {
    this.editingEvent = null;
  }

  saveEditEvent() {
    if (!this.editingEvent || !this.editingEvent.title.trim() || !this.editingEvent.targetDate) return;
    
    try {
      client.models.Event.update({
        id: this.editingEvent.id,
        title: this.editingEvent.title,
        description: this.editingEvent.description || '',
        targetDate: new Date(this.editingEvent.targetDate).toISOString()
      });
      this.editingEvent = null;
    } catch (error) {
      console.error('Error updating event', error);
    }
  }

  deleteEvent(id: string) {
    if (!id) return;
    
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        client.models.Event.delete({ id });
      } catch (error) {
        console.error('Error deleting event', error);
      }
    }
  }

  onDragStart(event: DragEvent, index: number) {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
    // Add visual feedback
    const target = event.target as HTMLElement;
    target.classList.add('dragging');
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  async onDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    
    if (this.draggedIndex === dropIndex || this.draggedIndex === -1) return;
    
    const draggedCategory = this.categories[this.draggedIndex];
    const newCategories = [...this.categories];
    
    // Remove dragged item
    newCategories.splice(this.draggedIndex, 1);
    // Insert at new position
    newCategories.splice(dropIndex, 0, draggedCategory);
    
    // Update local array immediately for UI feedback
    this.categories = newCategories;
    
    // Update order values in database
    try {
      const updatePromises = newCategories.map((category, index) => 
        client.models.Category.update({
          id: category.id,
          name: category.name,
          description: category.description,
          order: index
        })
      );
      
      await Promise.all(updatePromises);
      console.log('Category order updated successfully');
    } catch (error) {
      console.error('Error updating category order:', error);
      // Reload categories on error
      this.listCategories();
    }
  }

  onDragEnd(event: DragEvent) {
    this.draggedIndex = -1;
    // Remove visual feedback
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');
  }
}