import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { account } from '../../model/users';
import { UserService } from '../../core/user.service';
import { NotificationService } from '../../core/notification.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) {
        this.snackBar.open('No user logged in.', 'Close', { duration: 3000 });
        return;
      }

      const userData = await this.authService.getUserById(user.uid);
      if (userData) {
        this.currentUser = userData;
        this.profilePicture = userData.profileImageUrl || '';
        this.fullName = userData.fullName || '';
        this.contactNumber = userData.contactNumber || '';
        this.email = userData.email || '';

        this.office_id = userData.office_id || '';
        this.charge = userData.charge || '';
      }

      this.loadNotificationSettings();
    } catch (error) {
      console.error('Error loading user:', error);
      this.snackBar.open('Failed to load user data.', 'Close', {
        duration: 3000,
      });
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
        this.snackBar.open('Please select an image file.', 'Close', {
          duration: 3000,
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.profilePicture = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async updateProfile() {
    if (!this.currentUser) return;

    const updatedData: Partial<account> = {
      profileImageUrl: this.profilePicture,
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

      this.snackBar.open('Profile updated successfully!', 'Close', {
        duration: 3000,
        panelClass: ['snack-success'],
      });

      this.password = '';
    } catch (error) {
      console.error('Error updating:', error);
      this.snackBar.open('Failed to update profile.', 'Close', {
        duration: 3000,
        panelClass: ['snack-error'],
      });
    }
  }

  async onPushNotifChange() {
    if (this.pushNotif) {
      const permission =
        await this.notificationService.requestNotificationPermission();

      if (permission !== 'granted') {
        this.snackBar.open('Push notifications permission denied.', 'Close', {
          duration: 3000,
        });
        this.pushNotif = false;
      }
    } else {
      console.log('Push notifications disabled');
    }
  }

  toggleSoundAlert() {
    this.notificationService.setSoundAlert(this.soundAlert);
  }

  saveNotificationSettings() {
    localStorage.setItem('pushNotif', JSON.stringify(this.pushNotif));
    localStorage.setItem('soundAlert', JSON.stringify(this.soundAlert));

    this.notificationService.setSoundAlert(this.soundAlert);

    this.snackBar.open(`Notification settings saved.`, 'Close', {
      duration: 3000,
    });
  }

  loadNotificationSettings() {
    const push = localStorage.getItem('pushNotif');
    const sound = localStorage.getItem('soundAlert');

    this.pushNotif = push === 'true';
    this.soundAlert = sound === 'true';

    this.notificationService.setSoundAlert(this.soundAlert);
  }
}
