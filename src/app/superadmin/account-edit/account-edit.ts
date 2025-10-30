import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../core/user.service';
import { account } from '../../model/users';

@Component({
  selector: 'app-account-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './account-edit.html',
  styleUrls: ['./account-edit.scss'],
})
export class AccountEdit implements OnInit {
  accountToEdit: account | null = null;
  editForm: FormGroup | null = null;
  blockingInProgress = false;

  defaultAvatar =
    'https://i.pinimg.com/736x/32/e4/61/32e46132a367eb48bb0c9e5d5b659c88.jpg';

  constructor(
    private accountService: UserService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Optional: load accountToEdit if needed
    // For modal, it will be passed/set externally
  }

  // === Open/Edit account ===
  editAccount(account: account) {
    this.accountToEdit = { ...account };
    this.editForm = this.fb.group({
      fullName: [account.fullName, Validators.required],
      email: [account.email, [Validators.required, Validators.email]],
      contactNumber: [account.contactNumber, Validators.required],
      address: [account.address, Validators.required],
      sex: [account.sex],
      dateOfBirth: [account.dateOfBirth],
      idNumber: [account.idNumber],
      profileImageUrl: [account.profileImageUrl || this.defaultAvatar],
    });
  }

  closeEdit() {
    this.accountToEdit = null;
    this.editForm = null;
  }

  async saveEdit() {
    if (!this.editForm || !this.editForm.valid || !this.accountToEdit) return;

    this.blockingInProgress = true;
    const updatedUser = { ...this.accountToEdit, ...this.editForm.value };

    try {
      await this.accountService.updateUser(updatedUser.id, updatedUser);
      this.accountToEdit = null;
      this.editForm = null;
      this.showSnackBar('User updated successfully.');
    } catch (err) {
      console.error(err);
      this.showSnackBar('Failed to update user.');
    } finally {
      this.blockingInProgress = false;
    }
  }

  // === File Uploads ===
  onAvatarChange(event: Event) {
    this.handleFileChange(event, 'profileImageUrl');
  }

  private handleFileChange(event: Event, field: string) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && this.editForm) {
      const reader = new FileReader();
      reader.onload = () => {
        this.editForm?.patchValue({ [field]: reader.result });
        if (this.accountToEdit)
          (this.accountToEdit as any)[field] = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  triggerProfileImageUpload() {
    document.getElementById('profileImageInput')?.click();
  }

  cancel() {
    this.closeEdit();
  }

  // === SnackBar ===
  showSnackBar(message: string) {
    this.snackBar.open(message, 'Close', { duration: 3000 });
  }
}
