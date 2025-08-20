import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { account } from '../../model/users';
import { UserService } from '../../core/user.service';
import { NotificationService } from '../../core/notification.service';

@Component({
  selector: 'app-setting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './setting.html',
  styleUrls: ['./setting.scss'],
})
export class Setting implements OnInit {
  activeTab: string = 'profile';

  currentUser: account | null = null;

  profilePicture: string = '';
  fullName: string = '';
  contactNumber: string = '';
  email: string = '';
  password: string = '';
  address: string = '';
  office_id: string = '';
  charge: string = '';

  pushNotif = false;
  soundAlert = false;

  constructor(
    private afAuth: Auth,
    private router: Router,
    private authService: UserService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        console.warn('No user is logged in.');
        return;
      }

      const userData = await this.authService.getUserById(user.uid);
      if (userData) {
        this.currentUser = userData;
        this.profilePicture = userData.profilePicture || '';
        this.fullName = userData.fullName || '';
        this.contactNumber = userData.contactNumber || '';
        this.email = userData.email || '';
        this.address = userData.address || '';
        this.office_id = userData.office_id || '';
        this.charge = userData.charge || '';
      }

      // Load notification preferences from localStorage
      this.loadNotificationSettings();
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.profilePicture = reader.result as string; // base64 image string
      };
      reader.readAsDataURL(file);
    }
  }

  async updateProfile() {
    if (!this.currentUser) return;

    const updatedData: Partial<account> = {
      profilePicture: this.profilePicture,
      fullName: this.fullName,
      contactNumber: this.contactNumber,
      email: this.email,
      address: this.address,
      office_id: this.office_id,
      charge: this.charge,
      ...(this.password ? { password: this.password } : {}),
    };

    try {
      await this.authService.updateUser(this.currentUser.id, updatedData);
      alert('Profile updated successfully!');
      this.password = ''; // clear password field after update
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    }
  }

  async onPushNotifChange() {
    if (this.pushNotif) {
      const permission =
        await this.notificationService.requestNotificationPermission();
      if (permission !== 'granted') {
        alert('Push notifications permission was denied or not granted.');
        this.pushNotif = false;
      }
    } else {
      // Optionally handle disabling push notifications here
      console.log('Push notifications disabled');
    }
  }

  toggleSoundAlert() {
    this.notificationService.setSoundAlert(this.soundAlert);
  }

  saveNotificationSettings() {
    // Save settings to localStorage
    localStorage.setItem('pushNotif', JSON.stringify(this.pushNotif));
    localStorage.setItem('soundAlert', JSON.stringify(this.soundAlert));

    this.notificationService.setSoundAlert(this.soundAlert);

    alert(
      `Notification Settings Saved:\n
      Push Notifications: ${this.pushNotif ? 'Enabled' : 'Disabled'}\n
      Sound Alerts: ${this.soundAlert ? 'Enabled' : 'Disabled'}`
    );
  }

  loadNotificationSettings() {
    const push = localStorage.getItem('pushNotif');
    const sound = localStorage.getItem('soundAlert');

    this.pushNotif = push === 'true';
    this.soundAlert = sound === 'true';

    // Initialize notification service sound alert state
    this.notificationService.setSoundAlert(this.soundAlert);
  }
}
