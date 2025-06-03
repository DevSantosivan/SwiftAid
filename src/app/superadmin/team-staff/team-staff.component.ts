import { Component } from '@angular/core';
import { inject } from '@angular/core';
import { UserService } from '../../core/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { account } from '../../model/users';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminNavbarComponent } from '../../admin/admin-navbar/admin-navbar.component';

@Component({
  selector: 'app-team-staff',
  imports: [CommonModule, FormsModule],
  templateUrl: './team-staff.component.html',
  styleUrl: './team-staff.component.scss',
})
export class TeamStaffComponent {
  member: account | null = null;
  loading = true;
  constructor(
    private route: ActivatedRoute,
    private userService: UserService
  ) {}
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const uid = params['uid'];
      if (uid) {
        this.loadMember(uid);
      } else {
        this.loading = false;
      }
    });
  }

  async loadMember(memberId: string) {
    try {
      this.member = await this.userService.getUserById(memberId);
    } catch (err) {
      console.error('Error loading member:', err);
    } finally {
      this.loading = false;
    }
  }
}
