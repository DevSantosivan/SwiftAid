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
      name: 'John Michael Dela Cruz',
      position: 'Head',
      role: 'MDRRMO Chief',
      image: '../../../assets/thads.jpg',
    },
    {
      name: 'Maria Teresa Ramos',
      position: 'Staff',
      role: 'Operations Officer',
      image: '../../../assets/tone.jpg',
    },
    {
      name: 'Luis Fernando Santos',
      position: 'Staff',
      role: 'Logistics Coordinator',
      image: '../../../assets/carlos.jpg',
    },
    {
      name: 'Angelica Mae Bautista',
      position: 'Staff',
      role: 'Public Information Officer',
      image: '../../../assets/carlos.jpg',
    },
    {
      name: 'Roberto Ignacio',
      position: 'Staff',
      role: 'Training Officer',
      image: '../../../assets/carlos.jpg',
    },
    {
      name: 'Daniel Cruz',
      position: 'Driver',
      role: 'Rescue Vehicle Driver',
      image: '../../../assets/carlos.jpg',
    },
    {
      name: 'Marco Reyes',
      position: 'Rescue',
      role: 'Emergency Responder',
      image: '../../../assets/carlos.jpg',
    },
    {
      name: 'Anna Lopez',
      position: 'Staff',
      role: 'Administrative Assistant',
      image: '../../../assets/tone.jpg',
    },
    {
      name: 'Anna Lopez',
      position: 'Staff',
      role: 'Administrative Assistant',
      image: '../../../assets/ivan.jpg',
    },
    {
      name: 'Anna Lopez',
      position: 'Staff',
      role: 'Administrative Assistant',
      image: '../../../assets/tone.jpg',
    },
    {
      name: 'Anna Lopez',
      position: 'Staff',
      role: 'Administrative Assistant',
      image: '../../../assets/tone.jpg',
    },
    {
      name: 'Anna Lopez',
      position: 'Staff',
      role: 'Administrative Assistant',
      image: '../../../assets/tone.jpg',
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
