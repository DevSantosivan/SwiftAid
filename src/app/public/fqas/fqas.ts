import { Component } from '@angular/core';
import { FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fqas',
  imports: [FooterComponent, NavbarComponent, CommonModule],
  templateUrl: './fqas.html',
  styleUrl: './fqas.scss',
})
export class FQAs {
  activeFAQ: number | null = null;

  faqs = [
    {
      question: '❓ Ano ang SwiftAid?',
      answer:
        'SwiftAid ay isang emergency response platform na nag-uugnay sa komunidad at mga first responders sa loob ng ilang segundo.',
    },
    {
      question: '📲 Paano ito ginagamit?',
      answer:
        'Residents can send emergency requests through the system, at agad itong nare-record at na-monitor ng mga admin at responders.',
    },
    {
      question: '🛠️ Ano ang mga features?',
      answer:
        'Real-time request monitoring, live maps, responder assignment, at emergency resolution tracking.',
    },
    {
      question: '👥 Sino ang pwedeng gumamit?',
      answer:
        'Residents, staff responders, admins, at MDRRMO officials na bahagi ng San Jose community.',
    },
  ];

  toggleFAQ(index: number) {
    this.activeFAQ = this.activeFAQ === index ? null : index;
  }
}
