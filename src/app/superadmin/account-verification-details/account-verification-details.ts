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

  // Fields for template binding
  profilePicture: string = 'assets/profile-default.jpg';
  fullName: string = '';
  contactNumber: string = '';
  email: string = '';
  address: string = '';
  nationalIdImage: string = '';
  validnumber: string = '';
  birthday: string = '';
  sex: string = '';
  birthCertificateImage: string = '';
  idType: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Get the verification ID from the route
    this.route.paramMap.subscribe(async (params) => {
      this.verificationId = params.get('id');
      if (!this.verificationId) return;

      try {
        const userData = await this.userService.getUserById(
          this.verificationId
        );
        if (!userData) {
          alert('User not found.');
          this.router.navigate(['/admin/verifications']);
          return;
        }

        this.user = userData;
        this.setUserFields(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
        alert('Error loading user details.');
        this.router.navigate(['/admin/verifications']);
      }
    });
  }

  private setUserFields(user: account) {
    this.profilePicture =
      user.profileImageUrl?.trim() || '../../../assets/profile-deafault.jpg';
    this.fullName = user.fullName || '';
    this.contactNumber = user.contactNumber || '';
    this.email = user.email || '';
    this.address = user.address || '';
    this.nationalIdImage = user.validIdImageUrl || '';
    this.validnumber = user.idNumber || '';
    this.sex = user.sex || '';
    this.birthday = user.dateOfBirth || '';
    this.birthCertificateImage = user.validIdImageUrl || '';
    this.idType = user.idType || '';
  }

  navigateToVerification() {
    this.router.navigate(['/superAdmin/Verification']);
  }

  async onAccept() {
    if (!this.verificationId) return;
    try {
      await this.userService.updateUserStatus(this.verificationId, 'approved');
      alert('Account approved successfully.');
      this.navigateToVerification();
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
