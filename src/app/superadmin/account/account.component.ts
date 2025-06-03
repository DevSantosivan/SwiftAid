import { CommonModule } from '@angular/common';
import { HostListener } from '@angular/core';
import { Component } from '@angular/core';

@Component({
  selector: 'app-account',
  imports: [CommonModule],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  activeTab = 'all';
  openDropdownIndex: number | null = null;
  allAccounts = [
    {
      fullName: 'Angelo Villajos',
      email: 'geloVillajos18@gmail.com',
      contactNumber: '09279564126',
      address: 'San Jose Occidental Mindoro',
      password: '09279564126',
      role: 'resident',
    },
    {
      fullName: 'Ivan Santos',
      email: 'ivansantos.mdrrmostaff@gmail.com',
      contactNumber: '09561648797',
      office_id: '1234567898',
      password: '1234567',
      role: 'admin', // treated as staff
    },
  ];

  toggleDropdown(index: number): void {
    if (this.openDropdownIndex === index) {
      this.openDropdownIndex = null;
    } else {
      this.openDropdownIndex = index;
    }
  }

  closeDropdown(): void {
    this.openDropdownIndex = null;
  }

  viewAccount(account: any) {
    console.log('View:', account);
  }

  editAccount(account: any) {
    console.log('Edit:', account);
  }

  deleteAccount(account: any) {
    console.log('Delete:', account);
  }

  // Filters
  get residentAccounts() {
    return this.allAccounts.filter((acc) => acc.role === 'resident');
  }

  get staffAccounts() {
    return this.allAccounts.filter((acc) => acc.role !== 'resident');
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeDropdown();
  }
}
