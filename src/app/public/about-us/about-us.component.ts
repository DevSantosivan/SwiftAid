import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { FooterComponent } from '../footer/footer.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, CommonModule],
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.scss'],
})
export class AboutUsComponent {
  teamData = [
    {
      name: 'Head of MDRRMO',
      position: 'Head',
      role: 'MDRRMO Chief',
      image: '../../../assets/MALESTAFF.jpg',
    },
    {
      name: 'Staff Member 1',
      position: 'Staff',
      role: 'Operations Officer',
      image: '../../../assets/MALESTAFF.jpg',
    },
    {
      name: 'Staff Member 2',
      position: 'Staff',
      role: 'Logistics Coordinator',
      image: '../../../assets/MALESTAFF.jpg',
    },
    {
      name: 'Staff Member 3',
      position: 'Staff',
      role: 'Public Information Officer',
      image: '../../../assets/MDRRMOFEMALESTAFF.jpg',
    },
    {
      name: 'Staff Member 4',
      position: 'Staff',
      role: 'Training Officer',
      image: '../../../assets/MDRRMOFEMALESTAFF.jpg',
    },
    {
      name: 'MDRRMO Driver',
      position: 'Driver',
      role: 'Rescue Vehicle Driver',
      image: '../../../assets/MALESTAFF.jpg',
    },
    {
      name: 'Rescuer Leader',
      position: 'Rescue',
      role: 'Emergency Responder',
      image: '../../../assets/MALESTAFF.jpg',
    },
    {
      name: 'Staff Member 5',
      position: 'Staff',
      role: 'Administrative Assistant',
      image: '../../../assets/MALESTAFF.jpg',
    },
    {
      name: 'Staff Member 6',
      position: 'Staff',
      role: 'Administrative Assistant',
      image: '../../../assets/MALESTAFF.jpg',
    },
    {
      name: 'Staff Member 7',
      position: 'Staff',
      role: 'Administrative Assistant',
      image: '../../../assets/MALESTAFF.jpg',
    },
    {
      name: 'Staff Member 8',
      position: 'Staff',
      role: 'Administrative Assistant',
      image: '../../../assets/MDRRMOFEMALESTAFF.jpg',
    },
    {
      name: 'Staff Member 9',
      position: 'Staff',
      role: 'Administrative Assistant',
      image: '../../../assets/MALESTAFF.jpg',
    },
  ];

  // Group team by position
  get groupedTeam() {
    const grouped: { [key: string]: any[] } = {};
    this.teamData.forEach((member) => {
      if (!grouped[member.position]) {
        grouped[member.position] = [];
      }
      grouped[member.position].push(member);
    });

    // Ensure consistent ordering
    const ordered = ['Head', 'Staff', 'Driver', 'Rescue'];
    const result: { position: string; members: any[] }[] = [];

    for (const pos of ordered) {
      if (grouped[pos]) {
        result.push({ position: pos, members: grouped[pos] });
      }
    }

    return result;
  }

  // ✅ Helper function for the template
  getMembersByPosition(position: string) {
    return this.groupedTeam.find((g) => g.position === position)?.members || [];
  }
}
