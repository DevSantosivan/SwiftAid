import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { account } from '../../model/users';
import { UserService } from '../../core/user.service';

@Component({
  selector: 'app-account-verification-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-verification-details.html',
  styleUrls: ['./account-verification-details.scss'],
})
export class AccountVerificationDetails implements OnInit {
  verificationId: string | null = null;
  user: account | null = null;

  profilePicture: string = '';
  fullName: string = '';
  contactNumber: string = '';
  email: string = '';
  address: string = '';
  nationalIdImage: string = '';
  validnumber: string = '';
  birthday: string = '';
  sex: string = '';
  birthCertificateImage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(async (params) => {
      this.verificationId = params.get('id');
      if (this.verificationId) {
        try {
          const userData = await this.userService.getUserById(
            this.verificationId
          );
          if (userData) {
            this.user = userData;
            this.setUserFields(userData);
          } else {
            alert('User not found.');
            this.router.navigate(['/admin/verifications']);
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          alert('Error loading user details.');
          this.router.navigate(['/admin/verifications']);
        }
      }
    });
  }

  setUserFields(user: account) {
    this.profilePicture = user.profileImageUrl || 'assets/default-profile.png';
    this.fullName = user.fullName || '';
    this.contactNumber = user.contactNumber || '';
    this.email = user.email || '';
    this.address = user.address || '';
    this.nationalIdImage = user.validIdImageUrl || '';
    this.validnumber = user.idNumber || '';
    this.sex = user.sex || '';
    this.birthday = user.dateOfBirth || '';
    this.birthCertificateImage = user.validIdImageUrl || '';
  }

  navigateToVerification() {
    this.router.navigate(['/superAdmin/Verification']);
  }

  async onAccept() {
    if (!this.verificationId) return;
    try {
      await this.userService.updateUserStatus(this.verificationId, 'approved');
      alert('Account approved successfully.');
      this.router.navigate(['/superAdmin/Verification']);
    } catch (error) {
      console.error('Approval error:', error);
      alert('Failed to approve the account.');
    }
  }

  async onDecline() {
    if (!this.verificationId) return;
    try {
      await this.userService.updateUserStatus(this.verificationId, 'rejected');
      alert('Account rejected successfully.');
      this.router.navigate(['/superAdmin/verifications']);
    } catch (error) {
      console.error('Rejection error:', error);
      alert('Failed to reject the account.');
    }
  }
}
