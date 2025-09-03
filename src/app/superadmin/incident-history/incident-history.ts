import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EmergencyRequest } from '../../model/emergency';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { AuthService } from '../../core/auth.service';
import { VerticalAlign } from 'docx';
import { Chart, registerables } from 'chart.js';
import { saveAs } from 'file-saver';
import { HeadingLevel } from 'docx';

import * as XLSX from 'xlsx';

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  ImageRun,
} from 'docx';

Chart.register(...registerables);

@Component({
  selector: 'app-incident-history',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './incident-history.html',
  styleUrls: ['./incident-history.scss'],
})
export class IncidentHistory implements OnInit, OnDestroy {
  activeTab: 'all' | 'resolved' | 'cancelled' = 'all';

  allRequests: EmergencyRequest[] = [];
  resolvedRequests: EmergencyRequest[] = [];
  cancelledRequests: EmergencyRequest[] = [];

  filteredAllRequests: EmergencyRequest[] = [];
  filteredResolvedRequests: EmergencyRequest[] = [];
  filteredCancelledRequests: EmergencyRequest[] = [];

  selectedRequests: EmergencyRequest[] = [];
  requestToView?: EmergencyRequest;

  showBulkMenu = false;
  searchTerm = '';

  requestStatusChart?: Chart;
  requestEventBarChart?: Chart;

  constructor(
    private emergencyRequestService: EmergencyRequestService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadRequests();
  }

  ngOnDestroy() {
    this.requestStatusChart?.destroy();
    this.requestEventBarChart?.destroy();
  }

  // =====================
  // DATA LOADING & FILTER
  // =====================

  async loadRequests() {
    try {
      const fetchedRequests =
        await this.emergencyRequestService.getRequestResolved();

      this.resolvedRequests = fetchedRequests.filter((r) =>
        ['resolved', 'completed'].includes(r.status?.toLowerCase() || '')
      );

      this.cancelledRequests = fetchedRequests.filter(
        (r) => r.status?.toLowerCase() === 'cancelled'
      );

      this.allRequests = [...this.resolvedRequests, ...this.cancelledRequests];
      this.applyFilters();
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  }

  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredResolvedRequests = this.filterBySearch(
      this.resolvedRequests,
      term
    );
    this.filteredCancelledRequests = this.filterBySearch(
      this.cancelledRequests,
      term
    );
    this.filteredAllRequests = this.filterBySearch(this.allRequests, term);

    const current = this.getCurrentFilteredRequests();
    this.selectedRequests = this.selectedRequests.filter((s) =>
      current.some((r) => r.id === s.id)
    );

    this.updateRequestStatusPieChart(current);
    this.updateMonthlyEventBarChart(current);
  }

  filterBySearch(
    requests: EmergencyRequest[],
    term: string
  ): EmergencyRequest[] {
    if (!term) return requests;

    return requests.filter((req) =>
      [req.name, req.description, req.status].some((field) =>
        field?.toLowerCase().includes(term)
      )
    );
  }

  setTab(tab: 'all' | 'resolved' | 'cancelled') {
    this.activeTab = tab;
    this.selectedRequests = [];
    this.applyFilters();
  }

  getCurrentFilteredRequests(): EmergencyRequest[] {
    switch (this.activeTab) {
      case 'resolved':
        return this.filteredResolvedRequests;
      case 'cancelled':
        return this.filteredCancelledRequests;
      default:
        return this.filteredAllRequests;
    }
  }

  // =====================
  // SELECTION HANDLING
  // =====================

  isChecked(req: EmergencyRequest): boolean {
    return this.selectedRequests.some((s) => s.id === req.id);
  }

  setChecked(req: EmergencyRequest, event: any) {
    const checked = event.target.checked;
    if (checked && !this.isChecked(req)) {
      this.selectedRequests.push(req);
    } else if (!checked) {
      this.selectedRequests = this.selectedRequests.filter(
        (s) => s.id !== req.id
      );
    }
  }

  isAllSelected(): boolean {
    const current = this.getCurrentFilteredRequests();
    return current.length > 0 && current.every((r) => this.isChecked(r));
  }

  toggleSelectAllRequests(event: any) {
    const current = this.getCurrentFilteredRequests();
    const checked = event.target.checked;

    if (checked) {
      this.selectedRequests = [
        ...this.selectedRequests,
        ...current.filter((r) => !this.isChecked(r)),
      ];
    } else {
      this.selectedRequests = this.selectedRequests.filter(
        (r) => !current.some((cr) => cr.id === r.id)
      );
    }
  }

  toggleBulkMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showBulkMenu = !this.showBulkMenu;
  }

  selectBy(criteria: 'resolved' | 'cancelled' | 'all' | 'none') {
    switch (criteria) {
      case 'resolved':
        this.selectedRequests = [...this.resolvedRequests];
        break;
      case 'cancelled':
        this.selectedRequests = [...this.cancelledRequests];
        break;
      case 'all':
        this.selectedRequests = [...this.allRequests];
        break;
      case 'none':
        this.selectedRequests = [];
        break;
    }
    this.showBulkMenu = false;
  }

  // =====================
  // VIEWING / MODAL
  // =====================

  viewRequest(req: EmergencyRequest) {
    this.requestToView = req;
  }

  closeView() {
    this.requestToView = undefined;
  }

  deleteSelectedRequests() {
    console.log('To delete:', this.selectedRequests);
    this.selectedRequests = [];
  }

  // =====================
  // CHARTS
  // =====================

  updateMonthlyEventBarChart(requests: EmergencyRequest[]) {
    const monthLabels: string[] = [];
    const monthMap: Map<string, number> = new Map();

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });
      monthLabels.push(label);
      monthMap.set(label, monthLabels.length - 1);
    }

    const eventSet = new Set<string>();
    requests.forEach((r) => r.event && eventSet.add(r.event));
    const events = Array.from(eventSet);

    const countsPerEvent: { [event: string]: number[] } = {};
    events.forEach((event) => {
      countsPerEvent[event] = new Array(monthLabels.length).fill(0);
    });

    requests.forEach((r) => {
      if (!r.timestamp || !r.event) return;
      const date = r.timestamp.toDate
        ? r.timestamp.toDate()
        : new Date(r.timestamp);
      const label = date.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });
      const index = monthMap.get(label);
      if (index !== undefined) countsPerEvent[r.event][index]++;
    });

    const colors = [
      '#FF6384',
      '#36A2EB',
      '#6d6b65ff',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#C9CBCF',
      '#8E44AD',
    ];

    const datasets = events.map((event, i) => ({
      label: event,
      data: countsPerEvent[event],
      backgroundColor: colors[i % colors.length],
    }));

    this.requestEventBarChart?.destroy();
    this.requestEventBarChart = new Chart('requestStatusBarChart', {
      type: 'bar',
      data: { labels: monthLabels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { stacked: true, title: { display: true, text: 'Month' } },
          y: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: 'Number of Requests' },
            ticks: { stepSize: 1 },
          },
        },
      },
    });
  }

  updateRequestStatusPieChart(requests: EmergencyRequest[]) {
    let resolved = 0,
      cancelled = 0;
    requests.forEach((r) => {
      const status = r.status?.toLowerCase();
      if (['resolved', 'completed'].includes(status)) resolved++;
      else if (status === 'cancelled') cancelled++;
    });

    this.requestStatusChart?.destroy();
    this.requestStatusChart = new Chart('requestStatusChart', {
      type: 'pie',
      data: {
        labels: ['Resolved', 'Cancelled'],
        datasets: [
          {
            data: [resolved, cancelled],
            backgroundColor: ['#4CAF50', '#F44336'],
            hoverOffset: 14,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 14, padding: 16 } },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed}`,
            },
          },
        },
      },
    });
  }

  // =====================
  // EXPORT TO WORD
  // =====================

  private async getImageRun(imageUrl: string): Promise<ImageRun | null> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return null;
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const uint8Array = new Uint8Array(reader.result as ArrayBuffer);
          const type: 'jpg' | 'png' =
            imageUrl.toLowerCase().endsWith('.jpg') ||
            imageUrl.toLowerCase().endsWith('.jpeg')
              ? 'jpg'
              : 'png';

          resolve(
            new ImageRun({
              data: uint8Array,
              transformation: { width: 100, height: 100 },
            })
          );
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
    } catch (e) {
      console.error('Error loading image:', e);
      return null;
    }
  }

  async exportToWord() {
    const rows = this.getCurrentFilteredRequests();
    if (rows.length === 0) return alert('No data to export!');

    const headers = [
      'ID',
      'Name',
      'Address',
      'Contact Number',
      'Description',
      'Email',
      'Event',
      'Image',
      'Status',
      'Timestamp',
    ];
    const tableRows: TableRow[] = [
      new TableRow({
        children: headers.map(
          (header) =>
            new TableCell({
              width: { size: 1000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: header, bold: true })],
                }),
              ],
            })
        ),
      }),
    ];

    for (const req of rows) {
      const imageParagraph = req.image
        ? await this.getImageRun(req.image)
        : null;
      const imageCell = new TableCell({
        children: imageParagraph
          ? [new Paragraph({ children: [imageParagraph] })]
          : [new Paragraph('No Image')],
        verticalAlign: VerticalAlign.CENTER,

        width: { size: 1200, type: WidthType.DXA },
      });

      const rowCells = [
        req.id,
        req.name,
        req.address,
        req.contactNumber,
        req.description,
        req.email,
        req.event,
        '', // Image placeholder
        req.status,
        req.timestamp
          ? req.timestamp.toDate?.()
            ? req.timestamp.toDate().toLocaleString()
            : new Date(req.timestamp).toLocaleString()
          : '',
      ].map((val, i) =>
        i === 7
          ? imageCell
          : new TableCell({ children: [new Paragraph(String(val ?? ''))] })
      );

      tableRows.push(new TableRow({ children: rowCells }));
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Emergency Requests Report',
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({ rows: tableRows }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'emergency_requests_report.docx');
  }

  exportToExcel() {
    const rows = this.getCurrentFilteredRequests();
    if (rows.length === 0) return alert('No data to export!');

    const worksheetData = [
      [
        'ID',
        'Name',
        'Address',
        'Contact Number',
        'Description',
        'Email',
        'Event',
        'Image URL',
        'Status',
        'Timestamp',
      ],
      ...rows.map((req) => [
        req.id ?? '',
        req.name ?? '',
        req.address ?? '',
        req.contactNumber ?? '',
        req.description ?? '',
        req.email ?? '',
        req.event ?? '',
        req.image ?? '',
        req.status ?? '',
        req.timestamp
          ? req.timestamp.toDate
            ? req.timestamp.toDate().toLocaleString()
            : new Date(req.timestamp).toLocaleString()
          : '',
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Requests');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    saveAs(blob, 'emergency_requests_report.xlsx');
  }
}
